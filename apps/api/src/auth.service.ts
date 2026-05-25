import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AccountType, AuthenticatedUser } from './auth/auth-user.decorator';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { PrismaService } from './prisma.service';

type JwtPayload = {
  sub: string;
  email: string;
};

const DUMMY_PASSWORD_HASH = '$2b$12$6ydFQYfPmr67mq8Dmb2Ave/2kknjwM0dUGhD3A8WwW7jAj5mYADBW';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  avatar: true,
  verified: true,
  premium: true,
  role: true,
  business: {
    select: {
      id: true,
      name: true,
      type: true,
      description: true,
      location: true,
      phone: true,
      verified: true,
      premium: true,
    },
  },
} as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
    private smsService: SmsService,
  ) {}

  private getAccountType(email: string): AccountType {
    const normalized = email.trim().toLowerCase();
    const [localPart = '', domain = ''] = normalized.split('@');
    const isCampusEmail = ['htu.edu.gh', 'staff.htu.edu.gh'].some((d) => domain.endsWith(d));
    const looksLikeTeacher =
      domain.startsWith('staff.') ||
      ['lecturer', 'teacher', 'staff', 'faculty', 'tutor'].some((kw) => localPart.includes(kw));

    if (isCampusEmail && looksLikeTeacher) return 'Teacher';
    if (isCampusEmail) return 'Student';
    return 'Local vendor';
  }

  private sanitizeUser(user: AuthenticatedUser) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      verified: user.verified,
      premium: user.premium,
      role: user.role,
      accountType: this.getAccountType(user.email),
    };
  }

  private signToken(user: { id: string; email: string }) {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return this.jwtService.signAsync(payload);
  }

  private generateOtpCode(): string {
    return String(crypto.randomInt(100000, 999999));
  }

  async register(email: string, name: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    const existingUser = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const saltRounds = this.config.getOrThrow<number>('BCRYPT_SALT_ROUNDS');
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        name: normalizedName,
        password: hashedPassword,
        avatar: normalizedName.charAt(0).toUpperCase(),
      },
      select: USER_SELECT,
    });

    const token = await this.signToken(user);

    // Send OTP to verify email
    let devCode: string | undefined;
    const otpCode = await this.sendEmailOtp(user.id, user.email).catch((err) => {
      this.logger.error(`Failed to send registration OTP: ${err instanceof Error ? err.message : String(err)}`);
      return undefined;
    });

    if (this.config.get('NODE_ENV') !== 'production' && otpCode) {
      devCode = otpCode;
    }

    return { user: this.sanitizeUser(user), token, requiresOtp: true, devCode };
  }

  async sendEmailOtp(userId: string, email: string): Promise<string> {
    await this.prisma.otpVerification.updateMany({
      where: { userId, purpose: 'email', used: false },
      data: { used: true },
    });

    const code = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpVerification.create({
      data: { userId, code, purpose: 'email', expiresAt },
    });

    await this.emailService.sendOtpEmail(email, code);
    return code;
  }

  async verifyEmailOtp(userId: string, code: string) {
    const record = await this.prisma.otpVerification.findFirst({
      where: { userId, purpose: 'email', used: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) throw new BadRequestException('No pending verification code found');
    if (record.expiresAt < new Date()) throw new BadRequestException('Verification code has expired');
    if (record.attempts >= 5) throw new BadRequestException('Too many incorrect attempts. Please request a new code.');

    if (record.code !== code.trim()) {
      await this.prisma.otpVerification.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = 4 - record.attempts;
      throw new BadRequestException(`Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
    }

    await this.prisma.$transaction([
      this.prisma.otpVerification.update({ where: { id: record.id }, data: { used: true } }),
      this.prisma.user.update({ where: { id: userId }, data: { verified: true } }),
    ]);

    return { message: 'Email verified successfully' };
  }

  async resendEmailOtp(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.verified) throw new BadRequestException('Email is already verified');

    const recent = await this.prisma.otpVerification.findFirst({
      where: { userId, purpose: 'email', used: false },
      orderBy: { createdAt: 'desc' },
    });

    if (recent && recent.createdAt > new Date(Date.now() - 60 * 1000)) {
      throw new BadRequestException('Please wait at least 60 seconds before requesting a new code');
    }

    await this.sendEmailOtp(userId, user.email);
    return { message: 'A new verification code has been sent to your email' };
  }

  async sendPhoneOtp(userId: string, phone: string): Promise<{ message: string }> {
    const normalizedPhone = this.smsService.normalizeGhanaPhone(phone);

    await this.prisma.user.update({ where: { id: userId }, data: { phone: normalizedPhone } });

    await this.prisma.otpVerification.updateMany({
      where: { userId, purpose: 'phone', used: false },
      data: { used: true },
    });

    const code = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpVerification.create({
      data: { userId, code, purpose: 'phone', expiresAt },
    });

    await this.smsService.sendOtp(normalizedPhone, code);
    return { message: 'Verification code sent to your phone' };
  }

  async verifyPhoneOtp(userId: string, code: string) {
    const record = await this.prisma.otpVerification.findFirst({
      where: { userId, purpose: 'phone', used: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) throw new BadRequestException('No pending phone verification found');
    if (record.expiresAt < new Date()) throw new BadRequestException('Verification code has expired');
    if (record.attempts >= 5) throw new BadRequestException('Too many attempts. Please request a new code.');

    if (record.code !== code.trim()) {
      await this.prisma.otpVerification.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Incorrect code');
    }

    await this.prisma.$transaction([
      this.prisma.otpVerification.update({ where: { id: record.id }, data: { used: true } }),
      this.prisma.user.update({ where: { id: userId }, data: { phoneVerified: true } }),
    ]);

    return { message: 'Phone number verified successfully' };
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { ...USER_SELECT, password: true },
    });

    const passwordHash = user?.password ?? DUMMY_PASSWORD_HASH;
    const passwordMatch = await bcrypt.compare(password, passwordHash);

    if (!user || !passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = await this.signToken(user);
    return { user: this.sanitizeUser(user), token };
  }

  async validateToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      return { sub: payload.sub, email: payload.email };
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async getUserFromToken(token: string): Promise<AuthenticatedUser> {
    const payload = await this.validateToken(token);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: USER_SELECT,
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async getProfileData(token: string) {
    const user = await this.getUserFromToken(token);
    return this.getProfileDataForUser(user.id);
  }

  async getProfileDataForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const firstName = user.name.split(' ')[0]?.toLowerCase() || 'student';
    const reviewAgg = await this.prisma.review.aggregate({
      where: { userId },
      _avg: { rating: true },
      _count: { id: true },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      accountType: this.getAccountType(user.email),
      handle: `@${firstName}`,
      avatar: user.avatar,
      rating: reviewAgg._avg.rating ?? (user.business ? 0 : 0),
      reviews: reviewAgg._count.id,
      location: user.business?.location ?? 'Ho / HTU',
      joined: new Date().getFullYear().toString(),
      verified: user.verified,
      premium: user.business?.premium ?? false,
      role: user.role,
      business: user.business,
      canSell: Boolean(user.business),
      responseTime: user.business ? '15m' : null,
      bio: user.business?.description ?? 'Buyer account. Create a business profile before listing products or services.',
      banner: user.business?.name ?? 'Campus Marche member',
      analytics: user.business
        ? await this.getSellerAnalytics(userId)
        : { viewsThisWeek: 0, productClicks: 0, interestedBuyers: 0 },
    };
  }

  private async getSellerAnalytics(userId: string) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [viewsAgg, orderCount] = await Promise.all([
      this.prisma.product.aggregate({
        where: { sellerId: userId, active: true },
        _sum: { views: true },
      }),
      this.prisma.order.count({
        where: { product: { sellerId: userId }, createdAt: { gte: weekAgo } },
      }),
    ]);

    return {
      viewsThisWeek: viewsAgg._sum.views ?? 0,
      productClicks: viewsAgg._sum.views ?? 0,
      interestedBuyers: orderCount,
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) {
      return { message: 'If that email is registered, a reset link will be sent.' };
    }

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: { token: rawToken, userId: user.id, expiresAt },
    });

    const resetUrl = `${this.config.get<string>('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${rawToken}`;
    await this.emailService.sendPasswordReset(user.email, resetUrl);

    return { message: 'If that email is registered, a reset link will be sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { token } });

    if (!record || record.used || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const saltRounds = this.config.getOrThrow<number>('BCRYPT_SALT_ROUNDS');
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { password: hashedPassword } }),
      this.prisma.passwordResetToken.update({ where: { token }, data: { used: true } }),
    ]);

    return { message: 'Password updated successfully' };
  }

  async requestEmailVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.verified) throw new BadRequestException('Email is already verified');

    await this.prisma.emailVerification.updateMany({
      where: { userId, used: false },
      data: { used: true },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.emailVerification.create({
      data: { token: rawToken, userId, expiresAt },
    });

    const verifyUrl = `${this.config.get<string>('API_URL', 'http://localhost:3002')}/auth/verify-email/${rawToken}`;
    await this.emailService.sendEmailVerification(user.email, verifyUrl);

    return { message: 'Verification email sent' };
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.emailVerification.findUnique({ where: { token } });

    if (!record || record.used || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification link');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { verified: true } }),
      this.prisma.emailVerification.update({ where: { token }, data: { used: true } }),
    ]);

    return { message: 'Email verified successfully' };
  }

}
