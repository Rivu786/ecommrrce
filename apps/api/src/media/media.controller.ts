import { Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { RoleCode } from '@omnicommerce/shared';
import { Roles } from '../common/decorators/auth.decorators';
import { CurrentTenant, RequestTenant } from '../common/decorators/current.decorators';
import { MediaService } from './media.service';

@ApiTags('media')
@ApiBearerAuth()
@Controller('admin/media')
@Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  list(@CurrentTenant() tenant: RequestTenant) {
    return this.media.list(tenant.id);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  upload(@CurrentTenant() tenant: RequestTenant, @UploadedFile() file: Express.Multer.File) {
    return this.media.upload(tenant.id, file);
  }
}
