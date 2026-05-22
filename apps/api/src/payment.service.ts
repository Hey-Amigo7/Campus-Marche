import { createHmac } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

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
    };
  };
};

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
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
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: {
          status: 'In progress',
          paymentStatus: 'Paid',
          escrowStatus: 'Held in escrow',
        },
      });
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
        this.logger.warn(`Webhook: payment not found for reference ${reference}`);
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
      include: { product: { select: { sellerId: true } } },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyerId !== userId) {
      throw new ForbiddenException('Only the buyer can release escrow after confirming delivery');
    }

    if (order.paymentStatus !== 'Paid') {
      throw new BadRequestException('This order has not been paid yet');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'Completed',
        escrowStatus: 'Released',
      },
    });
  }
}
