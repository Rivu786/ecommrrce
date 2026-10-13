import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import { RoleCode } from '@omnicommerce/shared';
import { ReviewsService } from './reviews.service';
import { Public, Roles } from '../common/decorators/auth.decorators';
import {
  AuthUser,
  CurrentTenant,
  CurrentUser,
  RequestTenant,
} from '../common/decorators/current.decorators';

class CreateReviewDto {
  @IsOptional() @IsString() productId?: string;
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsObject() mediaJson?: object;
  @IsOptional() @IsBoolean() isStoreReview?: boolean;
}

@ApiTags('reviews')
@ApiHeader({ name: 'X-Tenant-ID', required: true })
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get('reviews')
  list(@CurrentTenant() tenant: RequestTenant, @Query('productId') productId?: string) {
    return this.reviews.listPublic(tenant.id, productId);
  }

  @Post('reviews')
  create(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviews.create(tenant.id, user.id, dto);
  }

  @Get('admin/reviews/pending')
  @ApiBearerAuth()
  @Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER)
  pending(@CurrentTenant() tenant: RequestTenant) {
    return this.reviews.listPending(tenant.id);
  }

  @Post('admin/reviews/:id/approve')
  @ApiBearerAuth()
  @Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER)
  approve(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string) {
    return this.reviews.moderate(tenant.id, id, 'APPROVED');
  }

  @Post('admin/reviews/:id/reject')
  @ApiBearerAuth()
  @Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER)
  reject(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string) {
    return this.reviews.moderate(tenant.id, id, 'REJECTED');
  }
}
