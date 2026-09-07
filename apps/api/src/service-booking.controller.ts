import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from './auth/auth-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CancelBookingDto, CreateServiceBookingDto, DeclineBookingDto, UpsertAvailabilityDto } from './dto/service-booking.dto';
import { ServiceBookingService } from './service-booking.service';

@ApiTags('service-bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('service-bookings')
export class ServiceBookingController {
  constructor(private bookingService: ServiceBookingService) {}

  @Get('slots/:productId')
  @ApiOperation({ summary: 'Get available time slots for a service on a given date' })
  getSlots(
    @Param('productId') productId: string,
    @Query('date') date: string,
    @AuthUser() _user: { id: string },
  ) {
    return this.bookingService.getAvailableSlots(productId, date);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bookings for the authenticated user (as buyer or seller)' })
  getAll(@AuthUser() user: { id: string }) {
    return this.bookingService.getForUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a booking by ID' })
  getById(@Param('id') id: string, @AuthUser() user: { id: string }) {
    return this.bookingService.getById(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Request a service booking (buyer)' })
  create(@Body() body: CreateServiceBookingDto, @AuthUser() user: { id: string }) {
    return this.bookingService.create(user.id, {
      productId:   body.productId,
      scheduledAt: new Date(body.scheduledAt),
      notes:       body.notes,
    });
  }

  @Post('availability/:productId')
  @ApiOperation({ summary: 'Upsert availability settings for a service listing (seller)' })
  upsertAvailability(
    @Param('productId') productId: string,
    @Body() body: UpsertAvailabilityDto,
    @AuthUser() user: { id: string },
  ) {
    return this.bookingService.upsertAvailability(productId, user.id, body);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept a booking request (seller) — creates payment Order' })
  accept(@Param('id') id: string, @AuthUser() user: { id: string }) {
    return this.bookingService.accept(id, user.id);
  }

  @Patch(':id/decline')
  @ApiOperation({ summary: 'Decline a booking request (seller)' })
  decline(@Param('id') id: string, @Body() body: DeclineBookingDto, @AuthUser() user: { id: string }) {
    return this.bookingService.decline(id, user.id, body.reason);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking (buyer or seller)' })
  cancel(@Param('id') id: string, @Body() body: CancelBookingDto, @AuthUser() user: { id: string }) {
    return this.bookingService.cancel(id, user.id, body.reason);
  }

  @Patch(':id/start')
  @ApiOperation({ summary: 'Mark service as in progress (seller)' })
  start(@Param('id') id: string, @AuthUser() user: { id: string }) {
    return this.bookingService.startService(id, user.id);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Mark service as completed and release escrow (seller)' })
  complete(@Param('id') id: string, @AuthUser() user: { id: string }) {
    return this.bookingService.complete(id, user.id);
  }
}
