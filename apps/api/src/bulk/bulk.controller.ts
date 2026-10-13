import { Body, Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { RoleCode } from '@omnicommerce/shared';
import { BulkService } from './bulk.service';
import { Roles } from '../common/decorators/auth.decorators';
import { CurrentTenant, RequestTenant } from '../common/decorators/current.decorators';

@ApiTags('bulk')
@ApiBearerAuth()
@Controller('admin/bulk')
@Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER)
export class BulkController {
  constructor(private readonly bulk: BulkService) {}

  @Get('jobs')
  jobs(@CurrentTenant() tenant: RequestTenant) {
    return this.bulk.listJobs(tenant.id);
  }

  @Post('products/import')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  importProducts(
    @CurrentTenant() tenant: RequestTenant,
    @UploadedFile() file: Express.Multer.File,
    @Body('csv') csvBody?: string,
  ) {
    const csv = file?.buffer?.toString('utf8') || csvBody || '';
    return this.bulk.importProducts(tenant.id, csv);
  }

  @Post('inventory/import')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  importInventory(
    @CurrentTenant() tenant: RequestTenant,
    @UploadedFile() file: Express.Multer.File,
    @Body('csv') csvBody?: string,
  ) {
    const csv = file?.buffer?.toString('utf8') || csvBody || '';
    return this.bulk.importInventory(tenant.id, csv);
  }

  @Post('products/export')
  exportProducts(@CurrentTenant() tenant: RequestTenant) {
    return this.bulk.exportProducts(tenant.id);
  }

  @Post('inventory/export')
  exportInventory(@CurrentTenant() tenant: RequestTenant) {
    return this.bulk.exportInventory(tenant.id);
  }
}
