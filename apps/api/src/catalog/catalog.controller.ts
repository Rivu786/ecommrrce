import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { Public } from '../common/decorators/auth.decorators';
import { CurrentTenant, RequestTenant } from '../common/decorators/current.decorators';

@ApiTags('catalog')
@ApiHeader({ name: 'X-Tenant-ID', required: true })
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Get('products')
  listProducts(
    @CurrentTenant() tenant: RequestTenant,
    @Query('cursor') cursor?: string,
    @Query('take') take?: number,
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brand') brand?: string,
    @Query('tag') tag?: string,
  ) {
    return this.catalog.listProducts(tenant.id, {
      cursor,
      take: take ? Number(take) : undefined,
      q,
      categoryId,
      brand,
      tag,
      status: 'ACTIVE',
    });
  }

  @Public()
  @Get('products/:idOrSlug/json-ld')
  jsonLd(@CurrentTenant() tenant: RequestTenant, @Param('idOrSlug') idOrSlug: string) {
    return this.catalog.jsonLd(tenant.id, idOrSlug);
  }

  @Public()
  @Get('products/:idOrSlug')
  getProduct(@CurrentTenant() tenant: RequestTenant, @Param('idOrSlug') idOrSlug: string) {
    return this.catalog.getProduct(tenant.id, idOrSlug);
  }

  @Public()
  @Get('categories')
  listCategories(@CurrentTenant() tenant: RequestTenant) {
    return this.catalog.listCategories(tenant.id);
  }

  @Public()
  @Get('bundles')
  listBundles(@CurrentTenant() tenant: RequestTenant) {
    return this.catalog.listBundles(tenant.id);
  }

  @Public()
  @Get('tags')
  listTags(@CurrentTenant() tenant: RequestTenant) {
    return this.catalog.listTags(tenant.id);
  }

  @Public()
  @Get('comparison')
  compare(@CurrentTenant() tenant: RequestTenant, @Query('ids') ids?: string) {
    const list = (ids || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return this.catalog.compare(tenant.id, list);
  }
}
