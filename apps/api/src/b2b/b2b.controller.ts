import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RoleCode } from '@omnicommerce/shared';
import { B2bService } from './b2b.service';
import { Roles } from '../common/decorators/auth.decorators';
import {
  AuthUser,
  CurrentTenant,
  CurrentUser,
  RequestTenant,
} from '../common/decorators/current.decorators';

class CreateCompanyDto {
  @IsString() name!: string;
  @IsOptional() @IsNumber() creditLimit?: number;
}

class QuoteItemDto {
  @IsString() variantId!: string;
  @IsString() productName!: string;
  @IsString() sku!: string;
  @IsNumber() quantity!: number;
  @IsNumber() unitPrice!: number;
}

class CreateQuoteDto {
  @IsString() companyId!: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items!: QuoteItemDto[];
  @IsOptional() @IsString() validUntil?: string;
}

@ApiTags('b2b')
@ApiBearerAuth()
@Controller('admin/b2b')
@Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER)
export class B2bController {
  constructor(private readonly b2b: B2bService) {}

  @Get('companies')
  listCompanies(@CurrentTenant() tenant: RequestTenant) {
    return this.b2b.listCompanies(tenant.id);
  }

  @Post('companies')
  createCompany(@CurrentTenant() tenant: RequestTenant, @Body() dto: CreateCompanyDto) {
    return this.b2b.createCompany(tenant.id, dto);
  }

  @Post('companies/:id/users')
  addUser(
    @CurrentTenant() tenant: RequestTenant,
    @Param('id') id: string,
    @Body() dto: { userId: string; role?: string },
  ) {
    return this.b2b.addCompanyUser(tenant.id, id, dto.userId, dto.role);
  }

  @Get('quotes')
  listQuotes(@CurrentTenant() tenant: RequestTenant, @Query('companyId') companyId?: string) {
    return this.b2b.listQuotes(tenant.id, companyId);
  }

  @Post('quotes')
  createQuote(@CurrentTenant() tenant: RequestTenant, @Body() dto: CreateQuoteDto) {
    return this.b2b.createQuote(tenant.id, dto);
  }

  @Post('quotes/:id/accept')
  accept(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.b2b.acceptQuote(tenant.id, id, user.id);
  }
}
