import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { ProvidersService } from './providers.service';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentTenant, RequestTenant } from '../common/decorators/current.decorators';

class ProviderDto {
  @IsString() name!: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsString() category!: string;
  @IsOptional() @IsString() notes?: string;
}

class RequirementDto {
  @IsString() title!: string;
  @IsObject() itemsJson!: object;
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsString() vendorId?: string;
  @IsOptional() @IsString() serviceProviderId?: string;
}

@ApiTags('providers')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-ID' })
@Controller('admin')
@RequirePermissions('vendors.manage')
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get('providers')
  list(@CurrentTenant() tenant: RequestTenant) {
    return this.providers.listProviders(tenant.id);
  }

  @Post('providers')
  create(@CurrentTenant() tenant: RequestTenant, @Body() dto: ProviderDto) {
    return this.providers.createProvider(tenant.id, dto);
  }

  @Get('requirements')
  listReq(@CurrentTenant() tenant: RequestTenant) {
    return this.providers.listRequirements(tenant.id);
  }

  @Post('requirements')
  createReq(@CurrentTenant() tenant: RequestTenant, @Body() dto: RequirementDto) {
    return this.providers.createRequirement(tenant.id, dto);
  }

  @Post('requirements/:id/send')
  send(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string) {
    return this.providers.sendRequirement(tenant.id, id);
  }

  @Post('requirements/:id/status/:status')
  status(
    @CurrentTenant() tenant: RequestTenant,
    @Param('id') id: string,
    @Param('status') status: string,
  ) {
    return this.providers.setStatus(tenant.id, id, status);
  }
}
