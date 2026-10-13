import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { WishlistsService } from './wishlists.service';
import { Public } from '../common/decorators/auth.decorators';
import {
  AuthUser,
  CurrentTenant,
  CurrentUser,
  RequestTenant,
} from '../common/decorators/current.decorators';

class CreateWishlistDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() guestUuid?: string;
}

class AddItemDto {
  @IsString() productId!: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() priceAlert?: boolean;
}

@ApiTags('wishlists')
@ApiHeader({ name: 'X-Tenant-ID', required: true })
@Controller('wishlists')
export class WishlistsController {
  constructor(private readonly wishlists: WishlistsService) {}

  @Public()
  @Get()
  list(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser | undefined,
    @Query('guestUuid') guestUuid?: string,
  ) {
    return this.wishlists.list(tenant.id, user?.id, guestUuid);
  }

  @Public()
  @Post()
  create(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser | undefined,
    @Body() dto: CreateWishlistDto,
  ) {
    return this.wishlists.create(tenant.id, {
      userId: user?.id,
      guestUuid: dto.guestUuid,
      name: dto.name,
    });
  }

  @Public()
  @Post(':id/items')
  addItem(
    @CurrentTenant() tenant: RequestTenant,
    @Param('id') id: string,
    @Body() dto: AddItemDto,
  ) {
    return this.wishlists.addItem(tenant.id, id, dto);
  }

  @Public()
  @Delete(':id/items/:itemId')
  removeItem(
    @CurrentTenant() tenant: RequestTenant,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.wishlists.removeItem(tenant.id, id, itemId);
  }

  @Public()
  @Delete(':id')
  delete(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string) {
    return this.wishlists.delete(tenant.id, id);
  }
}
