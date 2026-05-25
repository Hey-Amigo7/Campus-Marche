import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import type { NotificationService } from './notification.service';

export const PLANS = {
  free: { name: 'Free', maxListings: 5, analytics: false, boosting: false, badge: false },
  pro: { name: 'Seller Pro', maxListings: 999, analytics: true, boosting: true, badge: true, priceGhs: 20 },
  featured: { name: 'Featured', maxListings: 999, analytics: true, boosting: true, badge: true, homepagePlacement: true, priceGhs: 50 },
} as const;

export type PlanKey = keyof typeof PLANS;

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async getSubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    const plan = (sub?.plan ?? 'free') as PlanKey;
    const isExpired = sub?.expiresAt ? sub.expiresAt < new Date() : false;
    const effectivePlan: PlanKey = isExpired ? 'free' : plan;
    return {
      plan: effectivePlan,
      status: isExpired ? 'expired' : (sub?.status ?? 'active'),
      expiresAt: sub?.expiresAt ?? null,
      features: PLANS[effectivePlan],
    };
  }

  async initializeUpgrade(userId: string, plan: PlanKey) {
    if (plan === 'free') throw new BadRequestException('Cannot subscribe to the free plan');

    const paystackKey = this.config.get<string>('PAYSTACK_SECRET_KEY');
    if (!paystackKey) {
      throw new BadRequestException('Payment system is not configured. Please contact support.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const planDetails = PLANS[plan];
    const amountKobo = planDetails.priceGhs * 100;
    const callbackUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000') + '/subscription/confirm';

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountKobo,
        currency: 'GHS',
        callback_url: callbackUrl,
        metadata: { userId, plan, type: 'subscription' },
      }),
    });

    const data = (await response.json()) as { status: boolean; data?: { authorization_url: string; reference: string } };
    if (!data.status || !data.data) throw new BadRequestException('Failed to initialize payment');

    return { authorizationUrl: data.data.authorization_url, reference: data.data.reference };
  }

  async activateFromPayment(userId: string, plan: PlanKey, reference: string) {
    const durationDays = 30;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    await this.prisma.subscription.upsert({
      where: { userId },
      create: { userId, plan, status: 'active', expiresAt, reference },
      update: { plan, status: 'active', startsAt: new Date(), expiresAt, reference },
    });

    await this.prisma.businessProfile.updateMany({
      where: { userId },
      data: { premium: plan !== 'free' },
    });

    this.logger.log(`Subscription activated: ${userId} → ${plan} (ref: ${reference})`);
  }

  async cancelSubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException('No active subscription');
    await this.prisma.subscription.update({
      where: { userId },
      data: { status: 'cancelled' },
    });
    return { message: 'Subscription cancelled. Access continues until the end of your billing period.' };
  }

  canListMore(sub: Awaited<ReturnType<SubscriptionService['getSubscription']>>, currentCount: number) {
    return currentCount < sub.features.maxListings;
  }
}
