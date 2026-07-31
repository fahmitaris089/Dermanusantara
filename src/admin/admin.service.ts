import { HttpStatus, Injectable } from '@nestjs/common';
import {
  CampaignStatus,
  ContributionInputType,
  DonationStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { DomainException } from '../common/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import {
  BankAccountDto,
  BaselineDto,
  CampaignDto,
  CategoryDto,
  DonationConfigDto,
  OptionDto,
  PageDto,
  PaymentLinksDto,
  PaymentMethodDto,
  ReorderDto,
  SettingsDto,
  StatusActionDto,
  UpdateDto,
} from './admin.dto';
import { AdminAuthService } from './admin-auth.service';

const allowedSettings = new Set([
  'adminWhatsapp',
  'anonymousLabel',
  'confirmationTemplate',
  'defaultExpiryMinutes',
  'uniqueCodeMin',
  'uniqueCodeMax',
  'timezone',
  'organizationName',
  'organizationIdentity',
]);

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AdminAuthService,
  ) {}

  private meta(page: number, limit: number, total: number) {
    return { page, limit, total, totalPages: Math.ceil(total / limit) };
  }
  private notFound(name: string): never {
    throw new DomainException('NOT_FOUND', `${name} tidak ditemukan.`, HttpStatus.NOT_FOUND);
  }
  private resourceInUse(message: string): never {
    throw new DomainException('RESOURCE_IN_USE', message, HttpStatus.CONFLICT);
  }

  async categories(query: PageDto) {
    const where: Prisma.CampaignCategoryWhereInput = query.search
      ? { OR: [{ code: { contains: query.search, mode: 'insensitive' } }, { name: { contains: query.search, mode: 'insensitive' } }] }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.campaignCategory.findMany({ where, include: { _count: { select: { campaigns: true } } }, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: { name: 'asc' } }),
      this.prisma.campaignCategory.count({ where }),
    ]);
    return { data, meta: this.meta(query.page, query.limit, total) };
  }
  async category(id: string) {
    const data = await this.prisma.campaignCategory.findUnique({ where: { id }, include: { _count: { select: { campaigns: true } } } });
    if (!data) this.notFound('Kategori');
    return { data };
  }
  async createCategory(input: CategoryDto, actor: string) {
    const data = await this.prisma.campaignCategory.create({ data: { code: input.code.trim().toUpperCase(), name: input.name.trim() } });
    await this.auth.audit(actor, 'CATEGORY_CREATED', 'CampaignCategory', data.id, null, data);
    return { data };
  }
  async updateCategory(id: string, input: CategoryDto, actor: string) {
    const before = await this.prisma.campaignCategory.findUnique({ where: { id } });
    if (!before) this.notFound('Kategori');
    const data = await this.prisma.campaignCategory.update({ where: { id }, data: { code: input.code.trim().toUpperCase(), name: input.name.trim() } });
    await this.auth.audit(actor, 'CATEGORY_UPDATED', 'CampaignCategory', id, before, data);
    return { data };
  }
  async deleteCategory(id: string, actor: string) {
    if (await this.prisma.campaign.count({ where: { categoryId: id } })) this.resourceInUse('Kategori masih digunakan campaign.');
    await this.prisma.campaignCategory.delete({ where: { id } });
    await this.auth.audit(actor, 'CATEGORY_DELETED', 'CampaignCategory', id);
    return { data: { success: true } };
  }

  async paymentMethods(query: PageDto) {
    const where: Prisma.PaymentMethodWhereInput = query.search ? { OR: [{ code: { contains: query.search, mode: 'insensitive' } }, { name: { contains: query.search, mode: 'insensitive' } }] } : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.paymentMethod.findMany({ where, include: { _count: { select: { payments: true, campaignLinks: true } } }, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: { name: 'asc' } }),
      this.prisma.paymentMethod.count({ where }),
    ]);
    return { data: data.map((x) => ({ ...x, minimumAmount: x.minimumAmount === null ? null : Number(x.minimumAmount), maximumAmount: x.maximumAmount === null ? null : Number(x.maximumAmount) })), meta: this.meta(query.page, query.limit, total) };
  }
  async paymentMethod(id: string) {
    const data = await this.prisma.paymentMethod.findUnique({ where: { id }, include: { _count: { select: { payments: true, campaignLinks: true } } } });
    if (!data) this.notFound('Metode pembayaran');
    return { data: { ...data, minimumAmount: data.minimumAmount === null ? null : Number(data.minimumAmount), maximumAmount: data.maximumAmount === null ? null : Number(data.maximumAmount) } };
  }
  async createPaymentMethod(input: PaymentMethodDto, actor: string) {
    const data = await this.prisma.paymentMethod.create({ data: { ...input, code: input.code.toUpperCase() } });
    await this.auth.audit(actor, 'PAYMENT_METHOD_CREATED', 'PaymentMethod', data.id);
    return this.paymentMethod(data.id);
  }
  async updatePaymentMethod(id: string, input: PaymentMethodDto, actor: string) {
    const before = await this.prisma.paymentMethod.findUnique({ where: { id } });
    if (!before) this.notFound('Metode pembayaran');
    await this.prisma.paymentMethod.update({ where: { id }, data: { ...input, code: input.code.toUpperCase() } });
    await this.auth.audit(actor, 'PAYMENT_METHOD_UPDATED', 'PaymentMethod', id);
    return this.paymentMethod(id);
  }
  async setPaymentMethodActive(id: string, active: boolean, actor: string) {
    await this.prisma.paymentMethod.update({ where: { id }, data: { isActive: active } });
    await this.auth.audit(actor, active ? 'PAYMENT_METHOD_ACTIVATED' : 'PAYMENT_METHOD_DEACTIVATED', 'PaymentMethod', id);
    return this.paymentMethod(id);
  }
  async deletePaymentMethod(id: string, actor: string) {
    const used = await this.prisma.paymentMethod.findUnique({ where: { id }, include: { _count: { select: { payments: true, campaignLinks: true } } } });
    if (!used) this.notFound('Metode pembayaran');
    if (used._count.payments || used._count.campaignLinks) this.resourceInUse('Metode pembayaran sudah direferensikan.');
    await this.prisma.paymentMethod.delete({ where: { id } });
    await this.auth.audit(actor, 'PAYMENT_METHOD_DELETED', 'PaymentMethod', id);
    return { data: { success: true } };
  }

  async bankAccounts(query: PageDto) {
    const where: Prisma.BankAccountWhereInput = query.search ? { OR: [{ bankName: { contains: query.search, mode: 'insensitive' } }, { accountNumber: { contains: query.search } }, { accountHolderName: { contains: query.search, mode: 'insensitive' } }] } : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.bankAccount.findMany({ where, include: { _count: { select: { payments: true } } }, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: { bankName: 'asc' } }),
      this.prisma.bankAccount.count({ where }),
    ]);
    return { data, meta: this.meta(query.page, query.limit, total) };
  }
  async bankAccount(id: string) {
    const data = await this.prisma.bankAccount.findUnique({ where: { id }, include: { _count: { select: { payments: true } } } });
    if (!data) this.notFound('Rekening');
    return { data };
  }
  async createBankAccount(input: BankAccountDto, actor: string) {
    const data = await this.prisma.bankAccount.create({ data: input });
    await this.auth.audit(actor, 'BANK_ACCOUNT_CREATED', 'BankAccount', data.id);
    return this.bankAccount(data.id);
  }
  async updateBankAccount(id: string, input: BankAccountDto, actor: string) {
    await this.prisma.bankAccount.update({ where: { id }, data: input });
    await this.auth.audit(actor, 'BANK_ACCOUNT_UPDATED', 'BankAccount', id);
    return this.bankAccount(id);
  }
  async setBankActive(id: string, active: boolean, actor: string) {
    await this.prisma.bankAccount.update({ where: { id }, data: { isActive: active } });
    await this.auth.audit(actor, active ? 'BANK_ACCOUNT_ACTIVATED' : 'BANK_ACCOUNT_DEACTIVATED', 'BankAccount', id);
    return this.bankAccount(id);
  }
  async deleteBank(id: string, actor: string) {
    if (await this.prisma.payment.count({ where: { bankAccountId: id } })) this.resourceInUse('Rekening sudah digunakan transaksi.');
    await this.prisma.bankAccount.delete({ where: { id } });
    await this.auth.audit(actor, 'BANK_ACCOUNT_DELETED', 'BankAccount', id);
    return { data: { success: true } };
  }

  async settings() {
    const rows = await this.prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
    const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    const legacy =
      stored.donation_defaults &&
      typeof stored.donation_defaults === 'object' &&
      !Array.isArray(stored.donation_defaults)
        ? stored.donation_defaults as Record<string, unknown>
        : {};
    return {
      data: {
        organizationName: 'Derma Nusantara',
        organizationIdentity: '',
        adminWhatsapp: process.env.ADMIN_WHATSAPP ?? '6281234567890',
        anonymousLabel: process.env.ANONYMOUS_LABEL ?? 'Hamba Allah',
        confirmationTemplate:
          'Assalamualaikum Admin,\n\nSaya telah melakukan transfer untuk donasi {campaign}.\n\nNomor invoice: {invoice}\nKontribusi: {contribution}\nTotal transfer: {total}\n\nMohon dibantu melakukan pengecekan. Terima kasih.',
        defaultExpiryMinutes: 1440,
        uniqueCodeMin: Number(process.env.UNIQUE_CODE_MIN ?? 1),
        uniqueCodeMax: Number(process.env.UNIQUE_CODE_MAX ?? 999),
        timezone: 'Asia/Jakarta',
        ...legacy,
        ...Object.fromEntries(
          Object.entries(stored).filter(([key]) => key !== 'donation_defaults'),
        ),
      },
    };
  }
  async updateSettings(input: SettingsDto, actor: string) {
    const invalid = Object.keys(input.values).filter((key) => !allowedSettings.has(key));
    if (invalid.length) throw new DomainException('VALIDATION_ERROR', `Setting tidak diizinkan: ${invalid.join(', ')}`, HttpStatus.BAD_REQUEST);
    const before = await this.settings();
    await this.prisma.$transaction(Object.entries(input.values).map(([key, value]) => this.prisma.systemSetting.upsert({ where: { key }, update: { value: value as Prisma.InputJsonValue }, create: { key, value: value as Prisma.InputJsonValue } })));
    await this.auth.audit(actor, 'SETTINGS_UPDATED', 'SystemSetting', undefined, before.data, input.values);
    return this.settings();
  }

  async campaigns(query: PageDto, status?: CampaignStatus) {
    const where: Prisma.CampaignWhereInput = { ...(status ? { status } : {}), ...(query.search ? { OR: [{ title: { contains: query.search, mode: 'insensitive' } }, { slug: { contains: query.search, mode: 'insensitive' } }] } : {}) };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.campaign.findMany({ where, include: { category: true, donationConfig: true, _count: { select: { donations: true, updates: true } } }, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: { updatedAt: 'desc' } }),
      this.prisma.campaign.count({ where }),
    ]);
    return { data: data.map(this.serializeCampaign), meta: this.meta(query.page, query.limit, total) };
  }
  private serializeCampaign(campaign: any) {
    return { ...campaign, targetAmount: campaign.targetAmount === null ? null : Number(campaign.targetAmount), donationConfig: campaign.donationConfig ? { ...campaign.donationConfig, minimumAmount: campaign.donationConfig.minimumAmount === null ? null : Number(campaign.donationConfig.minimumAmount), maximumAmount: campaign.donationConfig.maximumAmount === null ? null : Number(campaign.donationConfig.maximumAmount), unitPrice: campaign.donationConfig.unitPrice === null ? null : Number(campaign.donationConfig.unitPrice) } : null };
  }
  async campaign(id: string) {
    const data = await this.prisma.campaign.findUnique({ where: { id }, include: { category: true, donationConfig: true, donationOptions: { orderBy: { sortOrder: 'asc' } }, paymentMethods: { include: { paymentMethod: true } }, updates: { orderBy: { sortOrder: 'asc' } }, statBaseline: true, _count: { select: { donations: true } } } });
    if (!data) this.notFound('Campaign');
    return { data: this.serializeCampaign({ ...data, donationOptions: data.donationOptions.map((x) => ({ ...x, amount: Number(x.amount) })), statBaseline: data.statBaseline ? { ...data.statBaseline, collectedAmount: Number(data.statBaseline.collectedAmount) } : null }) };
  }
  private campaignData(input: CampaignDto) {
    return { ...input, story: input.story as Prisma.InputJsonValue, highlights: input.highlights as Prisma.InputJsonValue, startsAt: input.startsAt ? new Date(input.startsAt) : null, endsAt: input.endsAt ? new Date(input.endsAt) : null, targetAmount: input.targetAmount, expectedUpdatedAt: undefined };
  }
  async createCampaign(input: CampaignDto, actor: string) {
    const data = await this.prisma.campaign.create({ data: { ...this.campaignData(input), status: CampaignStatus.DRAFT } });
    await this.auth.audit(actor, 'CAMPAIGN_CREATED', 'Campaign', data.id);
    return this.campaign(data.id);
  }
  async updateCampaign(id: string, input: CampaignDto, actor: string) {
    const before = await this.prisma.campaign.findUnique({ where: { id } });
    if (!before) this.notFound('Campaign');
    if (input.expectedUpdatedAt && before.updatedAt.toISOString() !== new Date(input.expectedUpdatedAt).toISOString()) throw new DomainException('EDIT_CONFLICT', 'Campaign telah diubah admin lain.', HttpStatus.CONFLICT);
    await this.prisma.campaign.update({ where: { id }, data: this.campaignData(input) });
    await this.auth.audit(actor, 'CAMPAIGN_UPDATED', 'Campaign', id);
    return this.campaign(id);
  }
  async deleteCampaign(id: string, actor: string) {
    if (await this.prisma.donation.count({ where: { campaignId: id } })) this.resourceInUse('Campaign memiliki transaksi; gunakan archive.');
    await this.prisma.campaign.delete({ where: { id } });
    await this.auth.audit(actor, 'CAMPAIGN_DELETED', 'Campaign', id);
    return { data: { success: true } };
  }
  async lifecycle(id: string, status: CampaignStatus, actor: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id }, include: { donationConfig: true, paymentMethods: { where: { isActive: true, paymentMethod: { isActive: true } } } } });
    if (!campaign) this.notFound('Campaign');
    if (status === CampaignStatus.PUBLISHED && (!campaign.donationConfig || !campaign.paymentMethods.length || !campaign.title || !campaign.description)) throw new DomainException('CAMPAIGN_INCOMPLETE', 'Campaign belum lengkap untuk dipublish.', HttpStatus.CONFLICT);
    await this.prisma.campaign.update({ where: { id }, data: { status, acceptingDonations: status === CampaignStatus.PUBLISHED } });
    await this.auth.audit(actor, `CAMPAIGN_${status}`, 'Campaign', id);
    return this.campaign(id);
  }
  async putConfig(id: string, input: DonationConfigDto, actor: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id }, include: { donationConfig: true, _count: { select: { donations: true } } } });
    if (!campaign) this.notFound('Campaign');
    if (campaign.donationConfig && campaign.donationConfig.inputType !== input.inputType && (campaign.status !== CampaignStatus.DRAFT || campaign._count.donations > 0)) throw new DomainException('RESOURCE_IN_USE', 'Input type hanya dapat diganti pada draft tanpa transaksi.', HttpStatus.CONFLICT);
    if (input.inputType === ContributionInputType.MONEY && !input.minimumAmount) throw new DomainException('VALIDATION_ERROR', 'minimumAmount wajib untuk MONEY.', HttpStatus.BAD_REQUEST);
    if (input.inputType === ContributionInputType.QUANTITY && (!input.unitName || !input.unitLabel || !input.unitPrice || !input.minimumQuantity || !input.quantityStep)) throw new DomainException('VALIDATION_ERROR', 'Konfigurasi QUANTITY belum lengkap.', HttpStatus.BAD_REQUEST);
    await this.prisma.campaignDonationConfig.upsert({ where: { campaignId: id }, update: input, create: { campaignId: id, ...input } });
    await this.auth.audit(actor, 'DONATION_CONFIG_UPDATED', 'Campaign', id);
    return this.campaign(id);
  }
  async options(id: string) { return { data: (await this.prisma.campaignDonationOption.findMany({ where: { campaignId: id }, orderBy: { sortOrder: 'asc' } })).map((x) => ({ ...x, amount: Number(x.amount) })) }; }
  async createOption(id: string, input: OptionDto, actor: string) { const data = await this.prisma.campaignDonationOption.create({ data: { campaignId: id, ...input } }); await this.auth.audit(actor, 'DONATION_OPTION_CREATED', 'CampaignDonationOption', data.id); return { data: { ...data, amount: Number(data.amount) } }; }
  async updateOption(id: string, optionId: string, input: OptionDto, actor: string) { const data = await this.prisma.campaignDonationOption.update({ where: { id: optionId, campaignId: id }, data: input }); await this.auth.audit(actor, 'DONATION_OPTION_UPDATED', 'CampaignDonationOption', optionId); return { data: { ...data, amount: Number(data.amount) } }; }
  async deleteOption(id: string, optionId: string, actor: string) { await this.prisma.campaignDonationOption.delete({ where: { id: optionId, campaignId: id } }); await this.auth.audit(actor, 'DONATION_OPTION_DELETED', 'CampaignDonationOption', optionId); return { data: { success: true } }; }
  async setPaymentLinks(id: string, input: PaymentLinksDto, actor: string) {
    await this.prisma.$transaction([this.prisma.campaignPaymentMethod.deleteMany({ where: { campaignId: id } }), this.prisma.campaignPaymentMethod.createMany({ data: input.paymentMethodIds.map((paymentMethodId) => ({ campaignId: id, paymentMethodId })) })]);
    await this.auth.audit(actor, 'CAMPAIGN_PAYMENT_METHODS_UPDATED', 'Campaign', id);
    return this.campaign(id);
  }
  async updates(id: string) { return { data: await this.prisma.campaignUpdate.findMany({ where: { campaignId: id }, orderBy: { sortOrder: 'asc' } }) }; }
  async createUpdate(id: string, input: UpdateDto, actor: string) { const data = await this.prisma.campaignUpdate.create({ data: { campaignId: id, ...input, publishedAt: new Date(input.publishedAt), content: input.content as Prisma.InputJsonValue } }); await this.auth.audit(actor, 'CAMPAIGN_UPDATE_CREATED', 'CampaignUpdate', data.id); return { data }; }
  async updateUpdate(id: string, updateId: string, input: UpdateDto, actor: string) { const data = await this.prisma.campaignUpdate.update({ where: { id: updateId, campaignId: id }, data: { ...input, publishedAt: new Date(input.publishedAt), content: input.content as Prisma.InputJsonValue } }); await this.auth.audit(actor, 'CAMPAIGN_UPDATE_UPDATED', 'CampaignUpdate', updateId); return { data }; }
  async deleteUpdate(id: string, updateId: string, actor: string) { await this.prisma.campaignUpdate.delete({ where: { id: updateId, campaignId: id } }); await this.auth.audit(actor, 'CAMPAIGN_UPDATE_DELETED', 'CampaignUpdate', updateId); return { data: { success: true } }; }
  async reorderUpdates(id: string, input: ReorderDto, actor: string) { await this.prisma.$transaction(input.ids.map((updateId, sortOrder) => this.prisma.campaignUpdate.update({ where: { id: updateId, campaignId: id }, data: { sortOrder: sortOrder + 10000 } }))); await this.prisma.$transaction(input.ids.map((updateId, sortOrder) => this.prisma.campaignUpdate.update({ where: { id: updateId, campaignId: id }, data: { sortOrder } }))); await this.auth.audit(actor, 'CAMPAIGN_UPDATES_REORDERED', 'Campaign', id); return this.updates(id); }
  async baseline(id: string) { const data = await this.prisma.campaignStatBaseline.findUnique({ where: { campaignId: id } }); return { data: data ? { ...data, collectedAmount: Number(data.collectedAmount) } : null }; }
  async putBaseline(id: string, input: BaselineDto, actor: string) { const before = await this.baseline(id); const data = await this.prisma.campaignStatBaseline.upsert({ where: { campaignId: id }, update: { collectedAmount: input.collectedAmount, collectedQuantity: input.collectedQuantity, paidDonationCount: input.paidDonationCount }, create: { campaignId: id, collectedAmount: input.collectedAmount, collectedQuantity: input.collectedQuantity, paidDonationCount: input.paidDonationCount } }); await this.auth.audit(actor, 'CAMPAIGN_BASELINE_UPDATED', 'Campaign', id, before.data, { ...data, collectedAmount: Number(data.collectedAmount) }, input.reason); return this.baseline(id); }

  private donationWhere(query: PageDto & Record<string, string | number | undefined>) {
    const where: Prisma.DonationWhereInput = {};
    if (query.search) where.OR = [{ invoiceNumber: { contains: String(query.search), mode: 'insensitive' } }, { publicId: { contains: String(query.search), mode: 'insensitive' } }, { donorName: { contains: String(query.search), mode: 'insensitive' } }, { donorWhatsapp: { contains: String(query.search) } }];
    if (query.campaignId) where.campaignId = String(query.campaignId);
    if (query.status) where.status = query.status as DonationStatus;
    if (query.inputType) where.inputTypeSnapshot = query.inputType as ContributionInputType;
    if (query.isAnonymous !== undefined) where.isAnonymous = String(query.isAnonymous) === 'true';
    if (query.utmSource) where.utmSource = String(query.utmSource);
    if (query.utmMedium) where.utmMedium = String(query.utmMedium);
    if (query.utmCampaign) where.utmCampaign = String(query.utmCampaign);
    if (query.minAmount || query.maxAmount) where.baseAmount = { ...(query.minAmount ? { gte: Number(query.minAmount) } : {}), ...(query.maxAmount ? { lte: Number(query.maxAmount) } : {}) };
    if (query.createdFrom || query.createdTo) where.createdAt = { ...(query.createdFrom ? { gte: new Date(String(query.createdFrom)) } : {}), ...(query.createdTo ? { lte: new Date(String(query.createdTo)) } : {}) };
    if (query.paidFrom || query.paidTo) where.paidAt = { ...(query.paidFrom ? { gte: new Date(String(query.paidFrom)) } : {}), ...(query.paidTo ? { lte: new Date(String(query.paidTo)) } : {}) };
    if (query.expiresFrom || query.expiresTo) where.expiresAt = { ...(query.expiresFrom ? { gte: new Date(String(query.expiresFrom)) } : {}), ...(query.expiresTo ? { lte: new Date(String(query.expiresTo)) } : {}) };
    if (query.paymentStatus || query.paymentMethodId || query.bankAccountId) where.payments = { some: { ...(query.paymentStatus ? { status: query.paymentStatus as PaymentStatus } : {}), ...(query.paymentMethodId ? { paymentMethodId: String(query.paymentMethodId) } : {}), ...(query.bankAccountId ? { bankAccountId: String(query.bankAccountId) } : {}) } };
    return where;
  }
  async donations(query: PageDto & Record<string, string | number | undefined>) {
    const where = this.donationWhere(query);
    const sortable = new Set(['createdAt', 'paidAt', 'expiresAt', 'baseAmount', 'invoiceNumber', 'status']);
    const sortBy = query.sortBy && sortable.has(String(query.sortBy)) ? String(query.sortBy) : 'createdAt';
    const orderBy = { [sortBy]: query.sortOrder === 'asc' ? 'asc' : 'desc' } as Prisma.DonationOrderByWithRelationInput;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.donation.findMany({ where, include: { payments: { include: { paymentMethod: true, bankAccount: true }, orderBy: { createdAt: 'desc' } } }, skip: (query.page - 1) * query.limit, take: query.limit, orderBy }),
      this.prisma.donation.count({ where }),
    ]);
    return { data: data.map(this.serializeDonation), meta: this.meta(query.page, query.limit, total) };
  }
  async donationExport(query: PageDto & Record<string, string | number | undefined>) {
    const data = await this.prisma.donation.findMany({
      where: this.donationWhere(query),
      include: { payments: { include: { paymentMethod: true, bankAccount: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
      take: 50_001,
      orderBy: { createdAt: 'desc' },
    });
    if (data.length > 50_000) throw new DomainException('EXPORT_TOO_LARGE', 'Export melebihi 50.000 baris. Persempit filter tanggal.', HttpStatus.BAD_REQUEST);
    return data.map((row) => {
      const payment = row.payments[0];
      return {
        invoiceNumber: row.invoiceNumber,
        campaign: row.campaignTitleSnapshot,
        donorName: row.donorName,
        donorWhatsapp: row.donorWhatsapp,
        isAnonymous: row.isAnonymous,
        status: row.status,
        inputType: row.inputTypeSnapshot,
        quantity: row.quantity,
        baseAmount: Number(row.baseAmount),
        payableAmount: payment ? Number(payment.payableAmount) : null,
        paymentStatus: payment?.status ?? null,
        paymentMethod: payment?.paymentMethod.name ?? null,
        bankAccount: payment?.bankAccount?.accountNumber ?? null,
        utmSource: row.utmSource,
        utmMedium: row.utmMedium,
        utmCampaign: row.utmCampaign,
        createdAt: row.createdAt.toISOString(),
        paidAt: row.paidAt?.toISOString() ?? null,
      };
    });
  }
  private serializeDonation(row: any) { return { ...row, baseAmount: Number(row.baseAmount), unitPriceSnapshot: row.unitPriceSnapshot === null ? null : Number(row.unitPriceSnapshot), payments: row.payments?.map((p: any) => ({ ...p, baseAmount: Number(p.baseAmount), payableAmount: Number(p.payableAmount) })) }; }
  async donation(id: string) { const data = await this.prisma.donation.findUnique({ where: { id }, include: { payments: { include: { paymentMethod: true, bankAccount: true, verifiedByAdmin: { select: { id: true, name: true, email: true } } } }, statusHistories: { orderBy: { createdAt: 'asc' } } } }); if (!data) this.notFound('Donation'); const auditLogs = await this.prisma.auditLog.findMany({ where: { entityType: 'Donation', entityId: id }, orderBy: { createdAt: 'asc' } }); return { data: { ...this.serializeDonation(data), auditLogs } }; }
  async payments(query: PageDto & Record<string, string | number | undefined>) { const where: Prisma.PaymentWhereInput = query.status ? { status: query.status as PaymentStatus } : {}; const [data, total] = await this.prisma.$transaction([this.prisma.payment.findMany({ where, include: { donation: true, paymentMethod: true, bankAccount: true, verifiedByAdmin: { select: { id: true, name: true } } }, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: { createdAt: 'desc' } }), this.prisma.payment.count({ where })]); return { data: data.map((x) => ({ ...x, baseAmount: Number(x.baseAmount), payableAmount: Number(x.payableAmount), donation: this.serializeDonation(x.donation) })), meta: this.meta(query.page, query.limit, total) }; }
  async payment(id: string) { const data = await this.prisma.payment.findUnique({ where: { id }, include: { donation: true, paymentMethod: true, bankAccount: true, verifiedByAdmin: { select: { id: true, name: true, email: true } } } }); if (!data) this.notFound('Payment'); return { data: { ...data, baseAmount: Number(data.baseAmount), payableAmount: Number(data.payableAmount), donation: this.serializeDonation(data.donation) } }; }

  async transition(id: string, target: DonationStatus, paymentTarget: PaymentStatus | null, input: StatusActionDto, actor: string) {
    const allowed: Partial<Record<DonationStatus, DonationStatus[]>> = {
      PENDING_PAYMENT: [DonationStatus.MANUAL_REVIEW, DonationStatus.PAID, DonationStatus.CANCELLED],
      MANUAL_REVIEW: [DonationStatus.PAID, DonationStatus.REJECTED],
      EXPIRED: [DonationStatus.MANUAL_REVIEW],
    };
    await this.prisma.$transaction(async (tx) => {
      const donation = await tx.donation.findUnique({ where: { id }, include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } } });
      if (!donation) this.notFound('Donation');
      if (!allowed[donation.status]?.includes(target)) throw new DomainException('INVALID_STATUS_TRANSITION', `Transisi ${donation.status} ke ${target} tidak diizinkan.`, HttpStatus.CONFLICT);
      const payment = donation.payments[0];
      if (payment && paymentTarget) await tx.payment.update({ where: { id: payment.id }, data: { status: paymentTarget, verifiedByAdminId: actor, verifiedAt: target === DonationStatus.PAID ? new Date() : null, verificationNote: input.note, bankReference: input.bankReference, activeUniqueKey: null } });
      await tx.donation.update({ where: { id }, data: { status: target, paidAt: target === DonationStatus.PAID ? new Date() : undefined } });
      await tx.donationStatusHistory.create({ data: { donationId: id, fromStatus: donation.status, toStatus: target, reason: input.note } });
      await tx.auditLog.create({ data: { actorId: actor, action: `DONATION_${target}`, entityType: 'Donation', entityId: id, beforeData: { status: donation.status }, afterData: { status: target }, reason: input.note } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return this.donation(id);
  }

  async dashboard() {
    const now = new Date(); const day = new Date(now); day.setHours(0, 0, 0, 0); const month = new Date(now.getFullYear(), now.getMonth(), 1);
    const trendStart = new Date(day); trendStart.setDate(trendStart.getDate() - 29);
    const [statusGroups, pendingReview, activeCampaigns, paidDay, paidMonth, trendRows] = await this.prisma.$transaction([
      this.prisma.donation.groupBy({ by: ['status'], orderBy: { status: 'asc' }, _count: { _all: true }, _sum: { baseAmount: true } }),
      this.prisma.donation.count({ where: { status: { in: [DonationStatus.PENDING_PAYMENT, DonationStatus.MANUAL_REVIEW] } } }),
      this.prisma.campaign.count({ where: { status: CampaignStatus.PUBLISHED } }),
      this.prisma.donation.aggregate({ where: { status: DonationStatus.PAID, paidAt: { gte: day } }, _sum: { baseAmount: true }, _count: { _all: true } }),
      this.prisma.donation.aggregate({ where: { status: DonationStatus.PAID, paidAt: { gte: month } }, _sum: { baseAmount: true }, _count: { _all: true } }),
      this.prisma.donation.findMany({ where: { status: DonationStatus.PAID, paidAt: { gte: trendStart } }, select: { paidAt: true, baseAmount: true } }),
    ]);
    const trend = new Map<string, { count: number; amount: number }>();
    for (const row of trendRows) {
      const key = row.paidAt!.toISOString().slice(0, 10);
      const value = trend.get(key) ?? { count: 0, amount: 0 };
      value.count += 1; value.amount += Number(row.baseAmount); trend.set(key, value);
    }
    return { data: { byStatus: statusGroups.map((x) => ({ status: x.status, count: Number((x as any)._count._all), amount: Number((x as any)._sum.baseAmount ?? 0) })), pendingReview, activeCampaigns, paidToday: { count: paidDay._count._all, amount: Number(paidDay._sum.baseAmount ?? 0) }, paidThisMonth: { count: paidMonth._count._all, amount: Number(paidMonth._sum.baseAmount ?? 0) }, trend: Array.from(trend, ([date, value]) => ({ date, ...value })).sort((a, b) => a.date.localeCompare(b.date)) } };
  }
  async campaignReport() {
    const campaigns = await this.prisma.campaign.findMany({ include: { statBaseline: true, donations: { where: { status: DonationStatus.PAID }, select: { baseAmount: true, quantity: true } } } });
    return { data: campaigns.map((c) => { const paidAmount = c.donations.reduce((s, d) => s + Number(d.baseAmount), 0); const paidQuantity = c.donations.reduce((s, d) => s + (d.quantity ?? 0), 0); const baselineAmount = Number(c.statBaseline?.collectedAmount ?? 0); const baselineQuantity = c.statBaseline?.collectedQuantity ?? 0; return { campaignId: c.id, title: c.title, baselineAmount, transactionPaidAmount: paidAmount, totalAmount: baselineAmount + paidAmount, baselineQuantity, transactionPaidQuantity: paidQuantity, totalQuantity: baselineQuantity + paidQuantity }; }) };
  }
  async attributionReport() {
    const groups = await this.prisma.donation.groupBy({ by: ['utmSource', 'utmMedium', 'utmCampaign'], where: { status: DonationStatus.PAID }, _count: { _all: true }, _sum: { baseAmount: true } });
    return { data: groups.map((x) => ({ utmSource: x.utmSource, utmMedium: x.utmMedium, utmCampaign: x.utmCampaign, count: x._count._all, amount: Number(x._sum.baseAmount ?? 0) })) };
  }
  async paymentMethodReport() { const groups = await this.prisma.payment.groupBy({ by: ['paymentMethodId', 'status'], _count: { _all: true }, _sum: { payableAmount: true } }); return { data: groups.map((x) => ({ ...x, count: x._count._all, amount: Number(x._sum.payableAmount ?? 0) })) }; }
  async auditLogs(query: PageDto & Record<string, string | number | undefined>) { const where: Prisma.AuditLogWhereInput = { ...(query.actorId ? { actorId: String(query.actorId) } : {}), ...(query.action ? { action: { contains: String(query.action), mode: 'insensitive' } } : {}), ...(query.entityType ? { entityType: String(query.entityType) } : {}) }; const [data, total] = await this.prisma.$transaction([this.prisma.auditLog.findMany({ where, include: { actor: { select: { id: true, name: true, email: true } } }, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: { createdAt: 'desc' } }), this.prisma.auditLog.count({ where })]); return { data, meta: this.meta(query.page, query.limit, total) }; }
  async auditLog(id: string) { const data = await this.prisma.auditLog.findUnique({ where: { id }, include: { actor: { select: { id: true, name: true, email: true } } } }); if (!data) this.notFound('Audit log'); return { data }; }
}
