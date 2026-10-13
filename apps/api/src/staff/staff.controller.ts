import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { IsArray, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { StaffService } from './staff.service';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import {
  AuthUser,
  CurrentTenant,
  CurrentUser,
  RequestTenant,
} from '../common/decorators/current.decorators';

class CreateRoleDto {
  @IsString() name!: string;
  @IsArray() keys!: string[];
}

class CreateStaffDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() fullName!: string;
  @IsOptional() @IsString() roleCode?: string;
  @IsOptional() @IsString() tenantRoleId?: string;
}

@ApiTags('staff')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-ID' })
@Controller('admin/staff')
@RequirePermissions('staff.manage')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  list(@CurrentTenant() tenant: RequestTenant) {
    return this.staff.list(tenant.id);
  }

  @Get('roles')
  roles(@CurrentTenant() tenant: RequestTenant) {
    return this.staff.listRoles(tenant.id);
  }

  @Post('roles')
  createRole(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRoleDto,
  ) {
    return this.staff.createRole(tenant.id, user.permissions, dto.name, dto.keys);
  }

  @Post()
  create(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateStaffDto,
  ) {
    return this.staff.createStaff(tenant.id, user.permissions, dto);
  }
}
