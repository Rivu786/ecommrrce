import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Throttle } from '@nestjs/throttler';
import { RoleCode } from '@omnicommerce/shared';
import { CatalogService } from './catalog.service';
import { Roles } from '../common/decorators/auth.decorators';
import { CurrentTenant, RequestTenant } from '../common/decorators/current.decorators';

class VariantDto {
  @IsOptional()
  @IsString()
  sku?: string;
  @IsOptional()
  @IsString()
  name?: string;
  @IsNumber()
  price!: number;
  @IsOptional()
  @IsNumber()
  compareAtPrice?: number;
}

class CreateProductDto {
  @IsString()
  name!: string;
  @IsString()
  slug!: string;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  @IsString()
  sku?: string;
  @IsOptional()
  @IsString()
  brand?: string;
  @IsOptional()
  @IsString()
  status?: string;
  @IsOptional()
  @IsArray()
  categoryIds?: string[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];
}

class CreateCategoryDto {
  @IsString()
  name!: string;
  @IsString()
  slug!: string;
  @IsOptional()
  @IsString()
  parentId?: string;
  @IsOptional()
  @IsString()
  description?: string;
}

class CreateAttributeDto {
  @IsString()
  code!: string;
  @IsString()
  name!: string;
  @IsOptional()
  @IsString()
  type?: string;
  @IsOptional()
  @IsArray()
  values?: string[];
}

class CreateBundleDto {
  @IsString()
  name!: string;
  @IsString()
  slug!: string;
  @IsNumber()
  price!: number;
  @IsOptional()
  @IsArray()
  items?: Array<{ productId: string; quantity: number }>;
}

class CreateTagDto {
  @IsString()
  name!: string;
  @IsString()
  slug!: string;
}

class PinRelationDto {
  @IsString()
  toProductId!: string;
  @IsOptional()
  @IsString()
  relationType?: string;
}

class HideRecDto {
  @IsString()
  hiddenId!: string;
}

@ApiTags('admin-catalog')
@ApiBearerAuth()
@Controller('admin')
@Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class CatalogAdminController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('products')
  listProducts(
    @CurrentTenant() tenant: RequestTenant,
    @Query('cursor') cursor?: string,
    @Query('take') take?: number,
    @Query('q') q?: string,
    @Query('status') status?: string,
  ) {
    return this.catalog.listProducts(tenant.id, {
      cursor,
      take: take ? Number(take) : undefined,
      q,
      status,
    });
  }

  @Get('products/:id')
  getProduct(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string) {
    return this.catalog.getProduct(tenant.id, id);
  }

  @Post('products')
  createProduct(@CurrentTenant() tenant: RequestTenant, @Body() dto: CreateProductDto) {
    return this.catalog.createProduct(tenant.id, dto);
  }

  @Patch('products/:id')
  updateProduct(
    @CurrentTenant() tenant: RequestTenant,
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.catalog.updateProduct(tenant.id, id, dto);
  }

  @Delete('products/:id')
  deleteProduct(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string) {
    return this.catalog.deleteProduct(tenant.id, id);
  }

  @Get('categories')
  listCategories(@CurrentTenant() tenant: RequestTenant) {
    return this.catalog.listCategories(tenant.id);
  }

  @Post('categories')
  createCategory(@CurrentTenant() tenant: RequestTenant, @Body() dto: CreateCategoryDto) {
    return this.catalog.createCategory(tenant.id, dto);
  }

  @Patch('categories/:id')
  updateCategory(
    @CurrentTenant() tenant: RequestTenant,
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.catalog.updateCategory(tenant.id, id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string) {
    return this.catalog.deleteCategory(tenant.id, id);
  }

  @Get('attributes')
  listAttributes(@CurrentTenant() tenant: RequestTenant) {
    return this.catalog.listAttributes(tenant.id);
  }

  @Post('attributes')
  createAttribute(@CurrentTenant() tenant: RequestTenant, @Body() dto: CreateAttributeDto) {
    return this.catalog.createAttribute(tenant.id, dto);
  }

  @Patch('attributes/:id')
  updateAttribute(
    @CurrentTenant() tenant: RequestTenant,
    @Param('id') id: string,
    @Body() dto: { name?: string; type?: string },
  ) {
    return this.catalog.updateAttribute(tenant.id, id, dto);
  }

  @Delete('attributes/:id')
  deleteAttribute(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string) {
    return this.catalog.deleteAttribute(tenant.id, id);
  }

  @Post('bundles')
  createBundle(@CurrentTenant() tenant: RequestTenant, @Body() dto: CreateBundleDto) {
    return this.catalog.createBundle(tenant.id, dto);
  }

  @Post('tags')
  createTag(@CurrentTenant() tenant: RequestTenant, @Body() dto: CreateTagDto) {
    return this.catalog.createTag(tenant.id, dto);
  }

  @Post('products/:id/relations')
  pinRelation(
    @CurrentTenant() tenant: RequestTenant,
    @Param('id') id: string,
    @Body() dto: PinRelationDto,
  ) {
    return this.catalog.pinRelation(tenant.id, id, dto.toProductId, dto.relationType || 'RELATED');
  }

  @Post('products/:id/hide-recommendation')
  hideRec(
    @CurrentTenant() tenant: RequestTenant,
    @Param('id') id: string,
    @Body() dto: HideRecDto,
  ) {
    return this.catalog.hideRecommendation(tenant.id, id, dto.hiddenId);
  }

  @Delete('products/:id/hide-recommendation/:hiddenId')
  unhideRec(
    @CurrentTenant() tenant: RequestTenant,
    @Param('id') id: string,
    @Param('hiddenId') hiddenId: string,
  ) {
    return this.catalog.unhideRecommendation(tenant.id, id, hiddenId);
  }
}
