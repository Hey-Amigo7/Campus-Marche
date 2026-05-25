import { createHmac } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, Optional, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import type { NotificationService } from './notification.service';

type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data?: {
    status: string;
    paid_at?: string;
    reference: string;
  };
};

type PaystackWebhookEvent = {
  event: string;
  data: {
    reference: string;
    status: string;
    paid_at?: string;
    metadata?: {
      orderId?: string;
      userId?: string;
      plan?: string;
      type?: string;
    };
  };
};

type PaystackChargeResponse = {
  status: boolean;
  message: string;
  data?: {
    reference: string;
    status: string;
    display_text?: string;
  };
};

type PaystackTransferRecipientResponse = {
  status: boolean;
  message: string;
  data?: {
    recipient_code: string;
  };
};

type PaystackTransferResponse = {
  status: boolean;
  message: string;
  data?: {
    transfer_code: string;
    status: string;
  };
};

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    @Optional() private notificationService?: NotificationService,
  ) {}

  private getPaystackSecret() {
    return this.config.get<string>('PAYSTACK_SECRET_KEY')?.trim();
  }

  async initializeOrderPayment(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: true,
        product: {
          select: {
            id: true,
            title: true,
            sellerId: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyerId !== userId) {
      throw new ForbiddenException('Only the buyer can pay for this order');
    }

    if (order.product.sellerId === userId) {
      throw new BadRequestException('You cannot pay for your own listing');
    }

    const reference = `CM-${Date.now()}-${order.id.slice(-6)}`;
    const secret = this.getPaystackSecret();
    const amountInPesewas = Math.round(order.price * 100);

    if (!secret) {
      return this.prisma.paymentTransaction.create({
        data: {
          orderId: order.id,
          userId,
          reference,
          amount: order.price,
          status: 'Configuration required',
          metadata: JSON.stringify({
            reason: 'PAYSTACK_SECRET_KEY is not configured',
            nextStep: 'Add your Paystack test or live secret key to apps/api/.env',
          }),
        },
      });
    }

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: order.buyer.email,
        amount: amountInPesewas,
        currency: 'GHS',
        reference,
        callback_url: this.config.getOrThrow<string>('PAYSTACK_CALLBACK_URL'),
        metadata: {
          orderId: order.id,
          productId: order.product.id,
          productTitle: order.product.title,
        },
      }),
    });

    const result = (await response.json()) as PaystackInitializeResponse;
    if (!response.ok || !result.status || !result.data) {
      throw new BadRequestException(result.message || 'Could not initialize Paystack payment');
    }

    return this.prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        userId,
        reference: result.data.reference,
        amount: order.price,
        status: 'Initialized',
        authorizationUrl: result.data.authorization_url,
        accessCode: result.data.access_code,
      },
    });
  }

  async verify(reference: string, userId: string) {
    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { reference },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.userId !== userId) {
      throw new ForbiddenException('You can only verify your own payment');
    }

    const secret = this.getPaystackSecret();
    if (!secret) {
      throw new BadRequestException('PAYSTACK_SECRET_KEY is not configured');
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    });
    const result = (await response.json()) as PaystackVerifyResponse;

    if (!response.ok || !result.status || !result.data) {
      throw new BadRequestException(result.message || 'Could not verify Paystack payment');
    }

    const paid = result.data.status === 'success';
    const updatedPayment = await this.prisma.paymentTransaction.update({
      where: { reference },
      data: {
        status: paid ? 'Paid' : result.data.status,
        paidAt: paid && result.data.paid_at ? new Date(result.data.paid_at) : null,
      },
    });

    if (paid) {
      const order = await this.prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'In progress', paymentStatus: 'Paid', escrowStatus: 'Held in escrow' },
        include: { product: { select: { sellerId: true, title: true } } },
      });

      this.notificationService?.notify(
        payment.userId, 'payment', 'Payment confirmed', 'Your payment is held in escrow and the seller has been notified.',
      ).catch(() => undefined);

      this.notificationService?.notify(
        order.product.sellerId, 'payment', 'Order payment received', `Payment for "${order.product.title}" is held in escrow. Please arrange the handover.`,
      ).catch(() => undefined);
    }

    return updatedPayment;
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const secret = this.getPaystackSecret();
    if (!secret) {
      throw new BadRequestException('Paystack is not configured');
    }

    const expectedSignature = createHmac('sha512', secret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    let event: PaystackWebhookEvent;
    try {
      event = JSON.parse(rawBody.toString()) as PaystackWebhookEvent;
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }

    this.logger.log(`Paystack webhook received: ${event.event}`);

    if (event.event === 'charge.success') {
      const { reference, paid_at } = event.data;

      const payment = await this.prisma.paymentTransaction.findUnique({
        where: { reference },
      });

      if (!payment) {
        // Check if this is a subscription payment (no PaymentTransaction record)
        const meta = event.data.metadata;
        if (meta?.type === 'subscription' && meta.userId && meta.plan) {
          const durationMs = 30 * 24 * 60 * 60 * 1000;
          await this.prisma.subscription.upsert({
            where: { userId: meta.userId },
            create: { userId: meta.userId, plan: meta.plan, status: 'active', expiresAt: new Date(Date.now() + durationMs), reference },
            update: { plan: meta.plan, status: 'active', startsAt: new Date(), expiresAt: new Date(Date.now() + durationMs), reference },
          });
          await this.prisma.businessProfile.updateMany({
            where: { userId: meta.userId },
            data: { premium: true },
          });
          this.notificationService?.notify(
            meta.userId, 'subscription', '🎉 Subscription activated!',
            `Your ${meta.plan === 'pro' ? 'Seller Pro' : 'Featured'} plan is now active. Enjoy your premium features.`,
          ).catch(() => undefined);
          this.logger.log(`Subscription activated via webhook: ${meta.userId} → ${meta.plan}`);
        } else {
          this.logger.warn(`Webhook: payment not found for reference ${reference}`);
        }
        return { received: true };
      }

      await this.prisma.$transaction([
        this.prisma.paymentTransaction.update({
          where: { reference },
          data: {
            status: 'Paid',
            paidAt: paid_at ? new Date(paid_at) : new Date(),
          },
        }),
        this.prisma.order.update({
          where: { id: payment.orderId },
          data: {
            status: 'In progress',
            paymentStatus: 'Paid',
            escrowStatus: 'Held in escrow',
          },
        }),
      ]);

      this.logger.log(`Order ${payment.orderId} funded via webhook`);
    }

    return { received: true };
  }

  async releaseEscrow(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        product: {
          select: {
            sellerId: true,
            seller: { select: { name: true, business: { select: { momoProvider: true, momoPhone: true } } } },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== userId) throw new ForbiddenException('Only the buyer can confirm delivery and release funds');
    if (order.paymentStatus !== 'Paid') throw new BadRequestException('This order has not been paid yet');
    if (order.escrowStatus === 'Released') throw new BadRequestException('Funds already released');

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'Completed', escrowStatus: 'Released' },
    });

    // Attempt automatic Paystack transfer to seller's MoMo if configured
    const seller = order.product.seller;
    const momoProvider = seller.business?.momoProvider;
    const momoPhone = seller.business?.momoPhone;

    if (momoProvider && momoPhone) {
      try {
        await this.initiateSellerPayout(orderId, order.price, seller.name, momoProvider, momoPhone);
      } catch (err) {
        this.logger.error(`Seller payout failed for order ${orderId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      this.logger.warn(`Order ${orderId}: seller has no MoMo payout details — manual payout required`);
    }

    return { message: 'Delivery confirmed. Funds released to seller.' };
  }

  private async initiateSellerPayout(
    orderId: string,
    amountGhs: number,
    sellerName: string,
    momoProvider: string,
    momoPhone: string,
  ) {
    const secret = this.getPaystackSecret();
    if (!secret) return;

    const amountInPesewas = Math.round(amountGhs * 100);

    // Step 1: create transfer recipient
    const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'mobile_money',
        name: sellerName,
        account_number: momoPhone.replace(/\D/g, ''),
        bank_code: momoProvider.toUpperCase(),
        currency: 'GHS',
      }),
    });
    const recipientData = (await recipientRes.json()) as PaystackTransferRecipientResponse;
    if (!recipientData.status || !recipientData.data) {
      throw new Error(`Recipient creation failed: ${recipientData.message}`);
    }

    // Step 2: initiate transfer
    const transferRes = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'balance',
        amount: amountInPesewas,
        recipient: recipientData.data.recipient_code,
        reason: `Campus Marche payout — order ${orderId}`,
      }),
    });
    const transferData = (await transferRes.json()) as PaystackTransferResponse;
    if (!transferData.status) {
      throw new Error(`Transfer failed: ${transferData.message}`);
    }

    this.logger.log(`Payout initiated for order ${orderId}: ${transferData.data?.transfer_code}`);
  }

  async chargeMobileMoney(
    orderId: string,
    userId: string,
    phone: string,
    provider: 'mtn' | 'vod' | 'tgo',
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { email: true } },
        product: { select: { id: true, title: true, sellerId: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== userId) throw new ForbiddenException('Only the buyer can pay for this order');
    if (order.product.sellerId === userId) throw new BadRequestException('You cannot pay for your own listing');
    if (order.paymentStatus === 'Paid') throw new BadRequestException('This order is already paid');

    const secret = this.getPaystackSecret();
    if (!secret) throw new BadRequestException('PAYSTACK_SECRET_KEY is not configured');

    const reference = `CM-MOMO-${Date.now()}-${order.id.slice(-6)}`;
    const amountInPesewas = Math.round(order.price * 100);
    const normalizedPhone = phone.replace(/\D/g, '').replace(/^0/, '233').replace(/^233/, '233');

    const response = await fetch('https://api.paystack.co/charge', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: order.buyer.email,
        amount: amountInPesewas,
        currency: 'GHS',
        reference,
        mobile_money: { phone: normalizedPhone, provider },
        metadata: {
          orderId: order.id,
          productId: order.product.id,
          productTitle: order.product.title,
          paymentMethod: 'mobile_money',
          momoProvider: provider,
        },
      }),
    });

    const result = (await response.json()) as PaystackChargeResponse;
    if (!response.ok || !result.status || !result.data) {
      throw new BadRequestException(result.message || 'Could not initiate mobile money charge');
    }

    await this.prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        userId,
        reference: result.data.reference,
        amount: order.price,
        status: result.data.status,
        provider: `paystack_momo_${provider}`,
        metadata: JSON.stringify({ displayText: result.data.display_text }),
      },
    });

    return {
      reference: result.data.reference,
      status: result.data.status,
      displayText: result.data.display_text ?? `Check your phone for a ${provider.toUpperCase()} Mobile Money prompt`,
    };
  }

  async checkMomoStatus(reference: string, userId: string) {
    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { reference },
      include: { order: true },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.userId !== userId) throw new ForbiddenException('Access denied');

    const secret = this.getPaystackSecret();
    if (!secret) throw new BadRequestException('Paystack not configured');

    const response = await fetch(`https://api.paystack.co/charge/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const result = (await response.json()) as PaystackVerifyResponse;

    if (!result.status || !result.data) {
      throw new BadRequestException(result.message || 'Could not check payment status');
    }

    const paid = result.data.status === 'success';

    if (paid && payment.status !== 'Paid') {
      await this.prisma.$transaction([
        this.prisma.paymentTransaction.update({
          where: { reference },
          data: { status: 'Paid', paidAt: result.data.paid_at ? new Date(result.data.paid_at) : new Date() },
        }),
        this.prisma.order.update({
          where: { id: payment.orderId },
          data: { status: 'In progress', paymentStatus: 'Paid', escrowStatus: 'Held in escrow' },
        }),
      ]);
    }

    return { status: result.data.status, paid };
  }
}
