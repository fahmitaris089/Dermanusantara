import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { ListCampaignsDto } from './dto/list-campaigns.dto';

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  list(@Query() query: ListCampaignsDto) {
    return this.campaigns.list(query);
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.campaigns.detail(slug);
  }
}
