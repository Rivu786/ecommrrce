import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { RoleCode } from '@omnicommerce/shared';
import { ReturnsService } from './returns.service';
import { Roles } from '../common/decorators/auth.decorators';
import {
  AuthUser,
  CurrentTenant,
  CurrentUser,
  RequestTenant,
} from '../common/decorators/current.decorators';

class CreateReturnDto {
  @IsString() orderId!: string;
  @IsString() reason!: string;
  @IsOptional() @IsObject() imagesJson?: object;
}

class AdminNoteDto {
  @IsOptional() @IsString() adminNote?: string;
  @IsOptional() restock?: boolean;
}

@ApiTags('returns')
@ApiBearerAuth()
@Controller()
export class ReturnsController {
  constructor(private readonly returns: ReturnsService) {}

  @Post('returns')
  create(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateReturnDto,
  ) {
    return this.returns.create(tenant.id, user.id, dto);
  }

  @Get('admin/returns')
  @Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER)
  list(@CurrentTenant() tenant: RequestTenant, @Query('status') status?: string) {
    return this.returns.list(tenant.id, status);
  }

  @Post('admin/returns/:id/approve')
  @Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER)
  approve(
    @CurrentTenant() tenant: RequestTenant,
    @Param('id') id: string,
    @Body() dto: AdminNoteDto,
  ) {
    return this.returns.approve(tenant.id, id, dto.adminNote, dto.restock !== false);
  }

  @Post('admin/returns/:id/reject')
  @Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER)
  reject(
    @CurrentTenant() tenant: RequestTenant,
    @Param('id') id: string,
    @Body() dto: AdminNoteDto,
  ) {
    return this.returns.reject(tenant.id, id, dto.adminNote);
  }
}
