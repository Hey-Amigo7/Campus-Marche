import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
  status: string;
}

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard stats' })
  getStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List users' })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'q', required: false })
  getUsers(@Query('skip') skip = 0, @Query('take') take = 50, @Query('q') q?: string) {
    return this.adminService.getUsers(+skip, +take, q);
  }

  @Patch('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend user' })
  suspendUser(@Param('id') id: string, @AuthUser() admin: { id: string }) {
    return this.adminService.suspendUser(id, admin.id);
  }

  @Patch('users/:userId/role')
  @ApiOperation({ summary: 'Change a user role (ADMIN only)' })
  setRole(
    @Param('userId') userId: string,
    @Body() dto: SetRoleDto,
    @AuthUser() admin: { id: string },
  ) {
    return this.adminService.setUserRole(admin.id, userId, dto.role);
  }

  @Get('products')
  @ApiOperation({ summary: 'List all products' })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'q', required: false })
  getProducts(@Query('skip') skip = 0, @Query('take') take = 50, @Query('q') q?: string) {
    return this.adminService.getProducts(+skip, +take, q);
  }

  @Patch('products/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate product' })
  deactivateProduct(@Param('id') id: string, @AuthUser() admin: { id: string }) {
    return this.adminService.toggleProductActive(id, admin.id, false);
  }

  @Patch('products/:id/activate')
  @ApiOperation({ summary: 'Activate product' })
  activateProduct(@Param('id') id: string, @AuthUser() admin: { id: string }) {
    return this.adminService.toggleProductActive(id, admin.id, true);
  }

  @Get('reports')
  @ApiOperation({ summary: 'List reports' })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  getReports(@Query('skip') skip = 0, @Query('take') take = 50) {
    return this.adminService.getReports(+skip, +take);
  }

  @Patch('reports/:id/resolve')
  @ApiOperation({ summary: 'Resolve report' })
  resolveReport(
    @Param('id') id: string,
    @Body() body: ResolveReportDto,
    @AuthUser() admin: { id: string },
  ) {
    return this.adminService.resolveReport(admin.id, id, body.status);
  }

  @Get('events')
  @ApiOperation({ summary: 'List events' })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  getEvents(@Query('skip') skip = 0, @Query('take') take = 50) {
    return this.adminService.getEvents(+skip, +take);
  }

  @Post('events')
  @ApiOperation({ summary: 'Create event' })
  createEvent(
    @Body()
    body: {
      title: string;
      description: string;
      location: string;
      eventDate: string;
      category: string;
      opportunity?: string;
      imageUrl?: string;
    },
  ) {
    return this.adminService.createEvent({ ...body, eventDate: new Date(body.eventDate) });
  }

  @Patch('events/:id')
  @ApiOperation({ summary: 'Update event' })
  updateEvent(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const data = { ...body };
    if (data['eventDate']) data['eventDate'] = new Date(data['eventDate'] as string);
    return this.adminService.updateEvent(id, data as Parameters<AdminService['updateEvent']>[1]);
  }

  @Delete('events/:id')
  @ApiOperation({ summary: 'Delete event' })
  deleteEvent(@Param('id') id: string) {
    return this.adminService.deleteEvent(id);
  }

  @Get('logs')
  @ApiOperation({ summary: 'View admin action log' })
  @ApiQuery({ name: 'page', required: false })
  getLogs(@Query('page') page?: string) {
    return this.adminService.getLogs(page ? parseInt(page, 10) : 1);
  }
}
