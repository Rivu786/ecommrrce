import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { RoleCode } from '@omnicommerce/shared';
import { CustomersService } from './customers.service';
import { Roles } from '../common/decorators/auth.decorators';
import {
  AuthUser,
  CurrentTenant,
  CurrentUser,
  RequestTenant,
} from '../common/decorators/current.decorators';

class AddressDto {
  @IsOptional() @IsString() label?: string;
  @IsString() fullName!: string;
  @IsString() phone!: string;
  @IsString() line1!: string;
  @IsOptional() @IsString() line2?: string;
  @IsString() city!: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

@ApiTags('customers')
@ApiBearerAuth()
@Controller()
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get('admin/customers')
  @Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER)
  list(@CurrentTenant() tenant: RequestTenant) {
    return this.customers.listCustomers(tenant.id);
  }

  @Get('me/addresses')
  listAddresses(@CurrentTenant() tenant: RequestTenant, @CurrentUser() user: AuthUser) {
    return this.customers.listAddresses(tenant.id, user.id);
  }

  @Post('me/addresses')
  createAddress(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser,
    @Body() dto: AddressDto,
  ) {
    return this.customers.createAddress(tenant.id, user.id, dto);
  }

  @Patch('me/addresses/:id')
  updateAddress(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: Partial<AddressDto>,
  ) {
    return this.customers.updateAddress(tenant.id, user.id, id, dto);
  }

  @Delete('me/addresses/:id')
  deleteAddress(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.customers.deleteAddress(tenant.id, user.id, id);
  }
}
