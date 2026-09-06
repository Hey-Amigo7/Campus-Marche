import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AuthUser } from './auth/auth-user.decorator';
import { EventsAuthGuard } from './auth/events-auth.guard';

/**
 * Separate controller for event CRUD so that EventsAuthGuard (which allows
 * both ADMIN role and canEditEvents users) applies at class level — independent
 * of AdminAuthGuard on AdminController.
 *
 * NestJS runs class-level guards before method-level guards. Having the event
 * endpoints inside AdminController meant AdminAuthGuard always ran first and
 * rejected canEditEvents users before EventsAuthGuard could allow them.
 */
@ApiTags('events')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(EventsAuthGuard)
export class EventsManagementController {
  constructor(private adminService: AdminService) {}

  @Get('events')
  @ApiOperation({ summary: 'List events (events editor / admin view)' })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  getEvents(
    @Query('skip') skip = 0,
    @Query('take') take = 50,
    @AuthUser() user: { id: string; role?: string; canEditEvents?: boolean },
  ) {
    return this.adminService.getEvents(+skip, +take, user as never);
  }

  @Post('events')
  @ApiOperation({ summary: 'Create event (PUBLISHED or DRAFT)' })
  createEvent(
    @Body()
    body: {
      title: string;
      description: string;
      location: string;
      eventDate: string;
      category: string;
      opportunity?: string;
      registrationLink?: string;
      imageUrl?: string;
      status?: string;
    },
    @AuthUser() user: { id: string },
  ) {
    return this.adminService.createEvent({
      ...body,
      eventDate: new Date(body.eventDate),
      status: body.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
      creatorId: user.id === 'ENV_ADMIN' ? null : user.id,
    });
  }

  @Patch('events/:id')
  @ApiOperation({ summary: 'Update event' })
  updateEvent(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const data = { ...body };
    if (data['eventDate']) data['eventDate'] = new Date(data['eventDate'] as string);
    return this.adminService.updateEvent(id, data as Parameters<AdminService['updateEvent']>[1]);
  }

  @Delete('events/:id')
  @ApiOperation({ summary: 'Delete event' })
  deleteEvent(@Param('id') id: string) {
    return this.adminService.deleteEvent(id);
  }
}
