import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsString, Length } from 'class-validator';
import { AdminService } from './admin.service';
import { AuthUser } from './auth/auth-user.decorator';
import { AdminAuthGuard } from './auth/admin-auth.guard';

class SetRoleDto {
  @IsString()
  @IsIn(['USER', 'MODERATOR', 'ADMIN'])
  role: string;
}

class ResolveReportDto {
  @IsString()
  status: string;
}

class AdminLoginDto {
  @IsString()
  email: string;

  @IsString()
  password: string;
}

class GrantEventsDto {
  @IsBoolean()
  canEdit: boolean;
}

class SendWarningDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 1000)
  message: string;
}

@ApiTags('admin')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private adminService: AdminService) {}

  @Post('login')
  @ApiOperation({ summary: 'Admin login via environment credentials — no database account required' })
  adminLogin(@Body() body: AdminLoginDto) {
    return this.adminService.adminLogin(body.email, body.password);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AdminAuthGuard)
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

  @Post('users/:id/warn')
  @ApiOperation({ summary: 'Send a warning notification to a user' })
  sendWarning(@Param('id') id: string, @Body() dto: SendWarningDto, @AuthUser() admin: { id: string }) {
    return this.adminService.sendWarning(admin.id, id, dto.message);
  }

  @Get('contact-messages')
  @ApiOperation({ summary: 'List contact form submissions' })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  getContactMessages(@Query('skip') skip = 0, @Query('take') take = 30) {
    return this.adminService.getContactMessages(+skip, +take);
  }

  @Patch('contact-messages/:id/resolve')
  @ApiOperation({ summary: 'Mark contact message as resolved' })
  resolveContactMessage(@Param('id') id: string) {
    return this.adminService.resolveContactMessage(id);
  }

  @Patch('users/:userId/role')
  @ApiOperation({ summary: 'Set a user role' })
  setRole(
    @Param('userId') userId: string,
    @Body() dto: SetRoleDto,
    @AuthUser() admin: { id: string },
  ) {
    return this.adminService.setUserRole(admin.id, userId, dto.role);
  }

  @Patch('users/:id/can-edit-events')
  @ApiOperation({ summary: 'Grant or revoke events editing permission for a user' })
  grantEventsPermission(
    @Param('id') id: string,
    @Body() body: GrantEventsDto,
    @AuthUser() admin: { id: string },
  ) {
    return this.adminService.grantEventsPermission(admin.id, id, body.canEdit);
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

  @Post('broadcast')
  @ApiOperation({ summary: 'Broadcast a notification to all users' })
  broadcast(
    @Body() body: { title: string; message: string; type?: string },
    @AuthUser() admin: { id: string },
  ) {
    return this.adminService.broadcastMessage(admin.id, body.title, body.message, body.type ?? 'system');
  }

  @Get('logs')
  @ApiOperation({ summary: 'View admin action log' })
  @ApiQuery({ name: 'page', required: false })
  getLogs(@Query('page') page?: string) {
    return this.adminService.getLogs(page ? parseInt(page, 10) : 1);
  }
}
