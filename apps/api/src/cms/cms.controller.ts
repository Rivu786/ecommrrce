import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString, IsNumber } from 'class-validator';
import { RoleCode } from '@omnicommerce/shared';
import { CmsService } from './cms.service';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { CurrentTenant, RequestTenant } from '../common/decorators/current.decorators';

class CreatePageDto {
  @IsString() title!: string;
  @IsString() slug!: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() metaTitle?: string;
  @IsOptional() @IsString() metaDescription?: string;
  @IsOptional() @IsArray() blocks?: Array<{ type: string; sortOrder?: number; contentJson: object }>;
}

class CreateSectionDto {
  @IsString() type!: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsNumber() sortOrder?: number;
  @IsObject() configJson!: object;
  @IsOptional() @IsString() pageId?: string;
}

class CreateFaqDto {
  @IsString() question!: string;
  @IsString() answer!: string;
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsNumber() sortOrder?: number;
}

@ApiTags('cms')
@ApiHeader({ name: 'X-Tenant-ID', required: true })
@Controller()
export class CmsController {
  constructor(private readonly cms: CmsService) {}

  @Public()
  @Get('pages/:slug')
  getPage(@CurrentTenant() tenant: RequestTenant, @Param('slug') slug: string) {
    return this.cms.getPage(tenant.id, slug);
  }

  @Public()
  @Get('homepage')
  homepage(@CurrentTenant() tenant: RequestTenant) {
    return this.cms.listHomepageSections(tenant.id);
  }

  @Public()
  @Get('faqs')
  faqs(@CurrentTenant() tenant: RequestTenant, @Query('productId') productId?: string) {
    return this.cms.listFaqs(tenant.id, productId);
  }

  @Public()
  @Get('sitemap')
  sitemap(@CurrentTenant() tenant: RequestTenant) {
    return this.cms.sitemap(tenant.id);
  }

  @Get('admin/cms/pages')
  @ApiBearerAuth()
  @Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER)
  listPages(@CurrentTenant() tenant: RequestTenant, @Query('status') status?: string) {
    return this.cms.listPages(tenant.id, status);
  }

  @Post('admin/cms/pages')
  @ApiBearerAuth()
  @Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER)
  createPage(@CurrentTenant() tenant: RequestTenant, @Body() dto: CreatePageDto) {
    return this.cms.createPage(tenant.id, dto);
  }

  @Patch('admin/cms/pages/:id')
  @ApiBearerAuth()
  @Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER)
  updatePage(
    @CurrentTenant() tenant: RequestTenant,
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.cms.updatePage(tenant.id, id, dto);
  }

  @Post('admin/cms/homepage-sections')
  @ApiBearerAuth()
  @Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER)
  createSection(@CurrentTenant() tenant: RequestTenant, @Body() dto: CreateSectionDto) {
    return this.cms.createHomepageSection(tenant.id, dto);
  }

  @Post('admin/cms/faqs')
  @ApiBearerAuth()
  @Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER)
  createFaq(@CurrentTenant() tenant: RequestTenant, @Body() dto: CreateFaqDto) {
    return this.cms.createFaq(tenant.id, dto);
  }
}
