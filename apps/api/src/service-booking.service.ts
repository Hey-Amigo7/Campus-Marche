import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EscrowStatus } from '@prisma/client';
import { calculateCommission } from './commission.engine';
import { PrismaService } from './prisma.service';
import type { NotificationService } from './notification.service';
import type { PaymentService } from './payment.service';
import type { UpsertAvailabilityDto } from './dto/service-booking.dto';

@Injectable()
export class ServiceBookingService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    @Optional() private notificationService?: NotificationService,
    @Optional() private paymentService?: PaymentService,
  ) {}

  // ── Availability ─────────────────────────────────────────────────────────────

  async upsertAvailability(productId: string, sellerId: string, data: UpsertAvailabilityDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { sellerId: true, listingType: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId !== sellerId) throw new ForbiddenException('You can only set availability on your own listings');
    if (product.listingType !== 'service') throw new BadRequestException('Availability can only be set on service listings');

    return this.prisma.serviceAvailability.upsert({
      where: { productId },
      create: { productId, ...data },
      update: data,
    });
  }

  async getAvailableSlots(productId: string, dateStr: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId, active: true },
      include: { availability: true },
    });
    if (!product) throw new NotFoundException('Service not found');
    if (product.listingType !== 'service') throw new BadRequestException('This is not a service listing');

    const av = product.availability;
    if (!av) {
      return { slots: [], message: 'This seller has not configured their availability yet.' };
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) throw new BadRequestException('Invalid date');

    const dayOfWeek = date.getDay(); // 0=Sun … 6=Sat
    const allowedDays = av.availableDays.split(',').map(Number);
    if (!allowedDays.includes(dayOfWeek)) {
      return { slots: [], message: 'Seller is not available on this day.' };
    }

    // Generate slots within [startHour, endHour]
    const slots: { time: string; available: boolean }[] = [];
    const now = new Date();
    const minBookingTime = new Date(now.getTime() + av.advanceNoticeHours * 60 * 60 * 1000);

    for (let hour = av.startHour; hour < av.endHour; hour += av.durationMin / 60) {
      const slotHour = Math.floor(hour);
      const slotMin = Math.round((hour - slotHour) * 60);
      const slotDate = new Date(date);
      slotDate.setHours(slotHour, slotMin, 0, 0);

      // Skip past slots and slots within advance notice window
      if (slotDate <= minBookingTime) continue;

      const timeStr = `${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`;

      // Count only paid bookings (CONFIRMED, IN_SERVICE, AWAITING_CONFIRMATION) for slot availability.
      const conflicting = await this.prisma.serviceBooking.count({
        where: {
          productId,
          scheduledAt: slotDate,
          status: { in: ['CONFIRMED', 'IN_SERVICE', 'AWAITING_CONFIRMATION'] },
        },
      });

      slots.push({ time: timeStr, available: conflicting < av.maxBookingsPerDay });
    }

    return { slots, durationMin: av.durationMin, priceType: av.priceType };
  }

  // ── Booking lifecycle ─────────────────────────────────────────────────────────

  async create(buyerId: string, data: { productId: string; scheduledAt: Date; notes?: string }) {
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId, active: true },
      include: { availability: true, seller: { select: { id: true, name: true } } },
    });

    if (!product) throw new NotFoundException('Service not found or no longer available');
    if (product.listingType !== 'service') throw new BadRequestException('This listing is not a service');
    if (product.sellerId === buyerId) throw new BadRequestException('You cannot book your own service');

    const av = product.availability;
    if (!av) throw new BadRequestException('This service does not have availability configured yet');

    // Validate advance notice
    const now = new Date();
    const minTime = new Date(now.getTime() + av.advanceNoticeHours * 60 * 60 * 1000);
    if (data.scheduledAt <= minTime) {
      throw new BadRequestException(
        `Bookings require at least ${av.advanceNoticeHours} hours advance notice`,
      );
    }

    // Validate day of week
    const dayOfWeek = data.scheduledAt.getDay();
    const allowedDays = av.availableDays.split(',').map(Number);
    if (!allowedDays.includes(dayOfWeek)) {
      throw new BadRequestException('The seller is not available on this day');
    }

    // Validate time within window
    const hour = data.scheduledAt.getHours() + data.scheduledAt.getMinutes() / 60;
    if (hour < av.startHour || hour >= av.endHour) {
      throw new BadRequestException('The requested time is outside the seller\'s available hours');
    }

    // Check confirmed slot capacity — only count paid/active bookings.
    // REQUESTED / ACCEPTED have not cleared payment so they do not own the slot.
    const conflicting = await this.prisma.serviceBooking.count({
      where: {
        productId: data.productId,
        scheduledAt: data.scheduledAt,
        status: { in: ['CONFIRMED', 'IN_SERVICE', 'AWAITING_CONFIRMATION'] },
      },
    });
    if (conflicting >= av.maxBookingsPerDay) {
      throw new BadRequestException('This time slot is fully booked. Please choose another time.');
    }

    const feePercent = parseFloat(this.config.get<string>('MARKETPLACE_FEE_PERCENT') ?? '2.5');
    const feeFixed   = parseFloat(this.config.get<string>('MARKETPLACE_FEE_FLAT')    ?? '0');
    const commission = calculateCommission(product.price, feePercent, feeFixed);

    const booking = await this.prisma.serviceBooking.create({
      data: {
        productId:   data.productId,
        buyerId,
        sellerId:    product.sellerId,
        scheduledAt: data.scheduledAt,
        durationMin: av.durationMin,
        notes:       data.notes,
        price:       product.price,
        totalAmount: commission.totalAmount,
        platformFee: commission.platformFee,
        sellerAmount: commission.sellerAmount,
      },
      include: { product: { select: { title: true } }, buyer: { select: { name: true } } },
    });

    this.notificationService
      ?.notify(
        product.sellerId,
        'booking',
        'New booking request',
        `${booking.buyer.name} requested a booking for "${booking.product.title}".`,
      )
      .catch(() => undefined);

    return booking;
  }

  async getForUser(userId: string) {
    // Catch-all: promote any ACCEPTED bookings whose linked order is already paid.
    await this.prisma.serviceBooking.updateMany({
      where: {
        OR:     [{ buyerId: userId }, { sellerId: userId }],
        status: 'ACCEPTED',
        order:  { escrowStatus: EscrowStatus.ESCROW_HELD },
      },
      data: { status: 'CONFIRMED' },
    });

    // Auto-release: buyer did not confirm within 48 h → complete the booking and release escrow.
    const AUTO_RELEASE_HOURS = parseInt(
      process.env['SERVICE_COMPLETION_AUTO_RELEASE_HOURS'] ?? '48',
      10,
    );
    const autoReleaseCutoff = new Date(Date.now() - AUTO_RELEASE_HOURS * 60 * 60 * 1000);
    const pendingRelease = await this.prisma.serviceBooking.findMany({
      where: {
        OR:          [{ buyerId: userId }, { sellerId: userId }],
        status:      'AWAITING_CONFIRMATION',
        completedAt: { lt: autoReleaseCutoff },
        orderId:     { not: null },
      },
      select: { id: true, orderId: true, sellerId: true, buyerId: true },
    });
    for (const b of pendingRelease) {
      try {
        await this.prisma.serviceBooking.update({ where: { id: b.id }, data: { status: 'COMPLETED' } });
        if (b.orderId && this.paymentService) {
          await this.paymentService.releaseEscrowInternal(b.orderId);
        }
        this.notificationService
          ?.notify(
            b.sellerId,
            'booking',
            'Service auto-completed',
            'The 48-hour confirmation window expired. Payment has been auto-released to you.',
          )
          .catch(() => undefined);
      } catch {
        // Leave in AWAITING_CONFIRMATION and retry on next fetch.
      }
    }

    return this.prisma.serviceBooking.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      include: {
        product: { select: { id: true, title: true, imageUrl: true, category: true, listingType: true } },
        buyer:   { select: { id: true, name: true, avatar: true } },
        seller:  { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async getById(id: string, userId: string) {
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, title: true, imageUrl: true, category: true } },
        buyer:   { select: { id: true, name: true, avatar: true } },
        seller:  { select: { id: true, name: true, avatar: true } },
        order:   { select: { id: true, escrowStatus: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.buyerId !== userId && booking.sellerId !== userId) {
      throw new ForbiddenException('You can only view your own bookings');
    }

    // Auto-promote to CONFIRMED when linked order has been paid
    if (booking.status === 'ACCEPTED' && booking.order?.escrowStatus === 'ESCROW_HELD') {
      await this.prisma.serviceBooking.update({ where: { id }, data: { status: 'CONFIRMED' } });
      return { ...booking, status: 'CONFIRMED' };
    }

    return booking;
  }

  async accept(id: string, sellerId: string) {
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { id },
      include: { product: { select: { sellerId: true, id: true, title: true } }, buyer: { select: { name: true } } },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.sellerId !== sellerId) throw new ForbiddenException('Only the seller can accept bookings');
    if (booking.status !== 'REQUESTED') throw new BadRequestException(`Booking is already ${booking.status.toLowerCase()}`);

    // Create an Order so the buyer can pay via existing Paystack flow
    const order = await this.prisma.order.create({
      data: {
        buyerId:      booking.buyerId,
        sellerId:     booking.sellerId,
        productId:    booking.productId,
        price:        booking.price,
        totalAmount:  booking.totalAmount,
        platformFee:  booking.platformFee,
        sellerAmount: booking.sellerAmount,
        escrowStatus: EscrowStatus.PENDING_PAYMENT,
        status:       'Awaiting payment',
        deliveryMethod: 'SELLER_DELIVERY',
      },
    });

    const updated = await this.prisma.serviceBooking.update({
      where: { id },
      data: { status: 'ACCEPTED', orderId: order.id },
    });

    this.notificationService
      ?.notify(
        booking.buyerId,
        'booking',
        'Booking accepted!',
        `Your booking for "${booking.product.title}" was accepted. Please complete payment to confirm your slot.`,
      )
      .catch(() => undefined);

    return { booking: updated, orderId: order.id };
  }

  async decline(id: string, sellerId: string, reason?: string) {
    const booking = await this.prisma.serviceBooking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.sellerId !== sellerId) throw new ForbiddenException('Only the seller can decline bookings');
    if (!['REQUESTED', 'ACCEPTED'].includes(booking.status)) {
      throw new BadRequestException('This booking cannot be declined in its current state');
    }

    const updated = await this.prisma.serviceBooking.update({
      where: { id },
      data: { status: 'DECLINED', cancelReason: reason ?? null, cancelledById: sellerId },
    });

    this.notificationService
      ?.notify(
        booking.buyerId,
        'booking',
        'Booking declined',
        reason ? `Your booking was declined: "${reason}"` : 'Your booking request was declined by the seller.',
      )
      .catch(() => undefined);

    return updated;
  }

  async cancel(id: string, userId: string, reason?: string) {
    const booking = await this.prisma.serviceBooking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    const isBuyer  = booking.buyerId  === userId;
    const isSeller = booking.sellerId === userId;
    if (!isBuyer && !isSeller) throw new ForbiddenException('You can only cancel your own bookings');

    const cancellableStates = ['REQUESTED', 'ACCEPTED', 'CONFIRMED'];
    if (!cancellableStates.includes(booking.status)) {
      throw new BadRequestException('This booking cannot be cancelled in its current state');
    }

    const updated = await this.prisma.serviceBooking.update({
      where: { id },
      data: { status: 'CANCELLED', cancelReason: reason ?? null, cancelledById: userId },
    });

    const notifyId = isBuyer ? booking.sellerId : booking.buyerId;
    const actor = isBuyer ? 'Buyer' : 'Seller';
    this.notificationService
      ?.notify(notifyId, 'booking', 'Booking cancelled', `${actor} cancelled the booking${reason ? `: "${reason}"` : '.'}`)
      .catch(() => undefined);

    return updated;
  }

  async startService(id: string, sellerId: string) {
    const booking = await this.prisma.serviceBooking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.sellerId !== sellerId) throw new ForbiddenException('Only the seller can update this booking');
    if (booking.status !== 'CONFIRMED') {
      throw new BadRequestException('Booking must be confirmed (payment received) before service can start');
    }

    const updated = await this.prisma.serviceBooking.update({ where: { id }, data: { status: 'IN_SERVICE' } });

    this.notificationService
      ?.notify(booking.buyerId, 'booking', 'Service started', 'Your service session has begun.')
      .catch(() => undefined);

    return updated;
  }

  async complete(id: string, sellerId: string) {
    const booking = await this.prisma.serviceBooking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.sellerId !== sellerId) throw new ForbiddenException('Only the seller can complete this booking');
    if (booking.status !== 'IN_SERVICE') {
      throw new BadRequestException('Booking must be in-service before it can be completed');
    }

    await this.prisma.serviceBooking.update({
      where: { id },
      data: { status: 'AWAITING_CONFIRMATION', completedAt: new Date() },
    });

    // Notify buyer — they must confirm or dispute within 48 hours.
    // If no action, the system auto-releases on the next getForUser() call.
    this.notificationService
      ?.notify(
        booking.buyerId,
        'booking',
        'Service marked complete',
        'The seller has marked your service session as done. Please confirm or raise a dispute within 48 hours.',
      )
      .catch(() => undefined);

    return { message: 'Service marked complete. Awaiting buyer confirmation (auto-releases after 48 h).' };
  }

  // Buyer explicitly confirms the service was delivered as agreed → release escrow.
  async confirmCompletion(id: string, buyerId: string) {
    const booking = await this.prisma.serviceBooking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.buyerId !== buyerId) throw new ForbiddenException('Only the buyer can confirm service completion');
    if (booking.status !== 'AWAITING_CONFIRMATION') {
      throw new BadRequestException('This booking is not awaiting confirmation');
    }

    // Release escrow before updating booking so a failed release keeps booking in AWAITING_CONFIRMATION
    if (booking.orderId && this.paymentService) {
      await this.paymentService.releaseEscrowInternal(booking.orderId);
    }

    const updated = await this.prisma.serviceBooking.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    this.notificationService
      ?.notify(
        booking.sellerId,
        'booking',
        'Service completion confirmed',
        'The buyer has confirmed the service was completed. Payment is being released to you.',
      )
      .catch(() => undefined);

    return updated;
  }

  // Called by PaymentService after escrow is funded for the linked Order
  async confirmByOrderId(orderId: string) {
    const booking = await this.prisma.serviceBooking.findUnique({ where: { orderId } });
    if (!booking || booking.status !== 'ACCEPTED') return;

    await this.prisma.serviceBooking.update({ where: { orderId }, data: { status: 'CONFIRMED' } });

    this.notificationService
      ?.notify(booking.sellerId, 'booking', 'Booking confirmed', 'Payment received. Your booking is now confirmed.')
      .catch(() => undefined);
    this.notificationService
      ?.notify(booking.buyerId, 'booking', 'Booking confirmed', 'Your payment was received. Your booking is confirmed!')
      .catch(() => undefined);
  }
}
