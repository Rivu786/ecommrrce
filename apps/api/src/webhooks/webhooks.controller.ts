import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';
import { RoleCode } from '@omnicommerce/shared';
import { WebhooksService } from './webhooks.service';
import { Roles } from '../common/decorators/auth.decorators';
import { CurrentTenant, RequestTenant } from '../common/decorators/current.decorators';

class CreateWebhookDto {
  @IsString()
  @IsUrl({ require_tld: false })
  url!: string;
  @IsArray()
  @IsString({ each: true })
  events!: string[];
}

class UpdateWebhookDto {
  @IsOptional()
  @IsString()
  url?: string;
  @IsOptional()
  @IsArray()
  events?: string[];
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags('webhooks')
@ApiBearerAuth()
@Controller('admin/webhooks')
@Roles(RoleCode.TENANT_ADMIN)
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Get()
  list(@CurrentTenant() tenant: RequestTenant) {
    return this.webhooks.list(tenant.id);
  }

  @Post()
  create(@CurrentTenant() tenant: RequestTenant, @Body() dto: CreateWebhookDto) {
    return this.webhooks.create(tenant.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenant: RequestTenant,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhooks.update(tenant.id, id, dto as Record<string, unknown>);
  }

  @Delete(':id')
  delete(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string) {
    return this.webhooks.delete(tenant.id, id);
  }
}
