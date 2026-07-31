import { HttpStatus, Injectable } from "@nestjs/common";
import { DonationStatus, PaymentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { DomainException } from "../common/domain.exception";
import { formatIdr } from "../common/numbers";

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(publicId: string) {
    const [donation, settingRows] = await Promise.all([
      this.prisma.donation.findUnique({
        where: { publicId },
        include: {
          payments: {
            include: { paymentMethod: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      this.prisma.systemSetting.findMany({
        where: {
          key: {
            in: ["adminWhatsapp", "anonymousLabel", "confirmationTemplate", "donation_defaults"],
          },
        },
      }),
    ]);
    if (!donation) {
      throw new DomainException(
        "INVOICE_NOT_FOUND",
        "Invoice tidak ditemukan.",
        HttpStatus.NOT_FOUND,
      );
    }
    const payment = donation.payments[0];
    if (!payment) {
      throw new DomainException(
        "INVOICE_NOT_FOUND",
        "Payment invoice tidak ditemukan.",
        HttpStatus.NOT_FOUND,
      );
    }
    const status =
      donation.status === DonationStatus.PENDING_PAYMENT &&
      donation.expiresAt.getTime() <= Date.now()
        ? DonationStatus.EXPIRED
        : donation.status;
    if (status === DonationStatus.EXPIRED && donation.status !== status) {
      await this.prisma.$transaction([
        this.prisma.payment.updateMany({
          where: {
            donationId: donation.id,
            status: PaymentStatus.PENDING,
          },
          data: {
            status: PaymentStatus.EXPIRED,
            activeUniqueKey: null,
          },
        }),
        this.prisma.donation.update({
          where: { id: donation.id },
          data: { status: DonationStatus.EXPIRED },
        }),
      ]);
    }
    const contribution =
      donation.inputTypeSnapshot === "QUANTITY"
        ? {
            inputType: donation.inputTypeSnapshot,
            quantity: donation.quantity,
            unitName: donation.unitNameSnapshot,
            unitLabel: donation.unitLabelSnapshot,
            unitPrice: Number(donation.unitPriceSnapshot),
          }
        : {
            inputType: donation.inputTypeSnapshot,
            amount: Number(donation.baseAmount),
          };
    const summary =
      donation.inputTypeSnapshot === "QUANTITY"
        ? `${donation.quantity} ${donation.unitLabelSnapshot} x ${formatIdr(
            donation.unitPriceSnapshot ?? 0,
          )}`
        : `Donasi ${formatIdr(donation.baseAmount)}`;
    const defaultMessage = [
      "Assalamualaikum Admin,",
      "",
      `Saya telah melakukan transfer untuk donasi ${donation.campaignTitleSnapshot}.`,
      "",
      `Nomor invoice: ${donation.invoiceNumber}`,
      `Kontribusi: ${summary}`,
      `Total transfer: ${formatIdr(payment.payableAmount)}`,
      "",
      "Mohon dibantu melakukan pengecekan. Terima kasih.",
    ].join("\n");
    const settings = Object.fromEntries(settingRows.map((row) => [row.key, row.value]));
    const legacy =
      settings.donation_defaults &&
      typeof settings.donation_defaults === "object" &&
      !Array.isArray(settings.donation_defaults)
        ? settings.donation_defaults as Record<string, unknown>
        : {};
    const value = (key: string, fallback: string) =>
      String(settings[key] ?? legacy[key] ?? fallback);
    const adminWhatsapp = value(
      "adminWhatsapp",
      process.env.ADMIN_WHATSAPP ?? "6281234567890",
    ).replace(/\D/g, "");
    const messageTemplate = value("confirmationTemplate", defaultMessage);
    const message = messageTemplate
      .replaceAll("{campaign}", donation.campaignTitleSnapshot)
      .replaceAll("{invoice}", donation.invoiceNumber)
      .replaceAll("{contribution}", summary)
      .replaceAll("{total}", formatIdr(payment.payableAmount));
    return {
      data: {
        invoiceNumber: donation.invoiceNumber,
        status,
        campaign: {
          slug: donation.campaignSlugSnapshot,
          title: donation.campaignTitleSnapshot,
        },
        donorDisplayName: donation.isAnonymous
          ? value("anonymousLabel", process.env.ANONYMOUS_LABEL ?? "Hamba Allah")
          : donation.donorName,
        contribution,
        baseAmount: Number(donation.baseAmount),
        uniqueCode: payment.uniqueCode,
        payableAmount: Number(payment.payableAmount),
        currency: donation.currency,
        createdAt: donation.createdAt,
        expiresAt: donation.expiresAt,
        payment: {
          methodCode: payment.paymentMethod.code,
          methodName: payment.paymentMethod.name,
          bankName: payment.bankNameSnapshot,
          accountNumber: payment.accountNumberSnapshot,
          accountHolderName: payment.accountHolderSnapshot,
          instructions: payment.instructionsSnapshot,
        },
        confirmation: {
          whatsappUrl: `https://wa.me/${adminWhatsapp}?text=${encodeURIComponent(
            message,
          )}`,
          message,
        },
      },
    };
  }
}
