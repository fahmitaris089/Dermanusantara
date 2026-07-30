import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { InvoicesService } from './invoices.service';

@ApiTags('invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get(':publicId')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  get(@Param('publicId') publicId: string) {
    return this.invoices.get(publicId);
  }
}
