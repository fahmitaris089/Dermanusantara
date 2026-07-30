import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { InvoicesService } from './invoices.service';

@ApiTags('invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get(':publicId')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOkResponse({
    description: 'Detail invoice publik dan instruksi pembayaran.',
    schema: {
      example: {
        data: {
          invoiceNumber: 'INV-20260730-8N4K2P',
          status: 'PENDING_PAYMENT',
          campaign: {
            slug: 'operasional-pondok',
            title: 'Operasional Pondok',
          },
          donorDisplayName: 'Hamba Allah',
          contribution: { inputType: 'MONEY', amount: 150000 },
          baseAmount: 150000,
          uniqueCode: 137,
          payableAmount: 150137,
          currency: 'IDR',
          createdAt: '2026-07-30T14:00:00.000Z',
          expiresAt: '2026-07-31T14:00:00.000Z',
          payment: {
            methodCode: 'MANUAL_BANK_TRANSFER',
            methodName: 'Transfer Bank',
            bankName: 'Bank Syariah Indonesia',
            accountNumber: '7123456789',
            accountHolderName: 'Yayasan Derma Nusantara',
            instructions: ['Transfer tepat sesuai total pembayaran.'],
          },
          confirmation: {
            whatsappUrl: 'https://wa.me/62812...',
            message: 'Assalamualaikum Admin, ...',
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Invoice tidak ditemukan.' })
  get(@Param('publicId') publicId: string) {
    return this.invoices.get(publicId);
  }
}
