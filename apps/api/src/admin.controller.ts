import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { AdminService } from './admin.service';
import { AuthUser } from './auth/auth-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { Roles } from './auth/roles.decorator';
import { RolesGuard } from './auth/roles.guard';

class SetRoleDto {
  @IsString()
  @IsIn(['USER', 'MODERATOR', 'ADMIN'])
  role: string;
}

class ResolveReportDto {
  @IsString()
  @IsIn(['resolved', 'dismissed'])
  status: string;
}

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MODERATOR')
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard stats (ADMIN/MODERATOR)' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users (ADMIN/MODERATOR)' })
  @ApiQuery({ name: 'page', required: false })
  getUsers(@Query('page') page?: string) {
    return this.adminService.getUsers(page ? parseInt(page, 10) : 1);
  }

  @Patch('users/:userId/role')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Change a user role (ADMIN only)' })
  setRole(
    @Param('userId') userId: string,
    @Body() dto: SetRoleDto,
    @AuthUser() admin: { id: string },
  ) {
    return this.adminService.setUserRole(admin.id, userId, dto.role);
  }

  @Get('reports')
  @ApiOperation({ summary: 'List reports (ADMIN/MODERATOR)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  getReports(@Query('status') status?: string, @Query('page') page?: string) {
    return this.adminService.getReports(status, page ? parseInt(page, 10) : 1);
  }

  @Patch('reports/:reportId/resolve')
  @ApiOperation({ summary: 'Resolve or dismiss a report (ADMIN/MODERATOR)' })
  resolveReport(
    @Param('reportId') reportId: string,
    @Body() dto: ResolveReportDto,
    @AuthUser() admin: { id: string },
  ) {
    return this.adminService.resolveReport(admin.id, reportId, dto.status);
  }

  @Patch('products/:productId/deactivate')
  @ApiOperation({ summary: 'Deactivate a product (ADMIN/MODERATOR)' })
  deactivateProduct(
    @Param('productId') productId: string,
    @AuthUser() admin: { id: string },
  ) {
    return this.adminService.deactivateProduct(admin.id, productId);
  }

  @Get('logs')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'View admin action log (ADMIN only)' })
  @ApiQuery({ name: 'page', required: false })
  getLogs(@Query('page') page?: string) {
    return this.adminService.getLogs(page ? parseInt(page, 10) : 1);
  }
}
