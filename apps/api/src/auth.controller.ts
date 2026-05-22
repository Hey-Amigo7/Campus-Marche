import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthUser } from './auth/auth-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  ValidateTokenDto,
  VerifyOtpDto,
  SendPhoneOtpDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  private get authThrottle() {
    return {
      default: {
        limit: this.config.getOrThrow<number>('AUTH_THROTTLE_LIMIT'),
        ttl: this.config.getOrThrow<number>('AUTH_THROTTLE_TTL'),
      },
    };
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.name, body.password);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login a user' })
  async login(@Body() body: LoginDto) {
    const throttle = this.authThrottle;
    void throttle;
    return this.authService.login(body.email, body.password);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate JWT token and return payload' })
  async validate(@Body() body: ValidateTokenDto) {
    return this.authService.validateToken(body.token);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Request a password reset link' })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset password using the token from the email link' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Post('verify-otp')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify email OTP code sent on registration' })
  async verifyOtp(@AuthUser() user: { id: string }, @Body() body: VerifyOtpDto) {
    return this.authService.verifyEmailOtp(user.id, body.code);
  }

  @Post('resend-otp')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Resend email OTP (max once per 60s)' })
  async resendOtp(@AuthUser() user: { id: string }) {
    return this.authService.resendEmailOtp(user.id);
  }

  @Post('send-phone-otp')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Send SMS OTP to verify phone number' })
  async sendPhoneOtp(@AuthUser() user: { id: string }, @Body() body: SendPhoneOtpDto) {
    return this.authService.sendPhoneOtp(user.id, body.phone);
  }

  @Post('verify-phone-otp')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify phone SMS OTP code' })
  async verifyPhoneOtp(@AuthUser() user: { id: string }, @Body() body: VerifyOtpDto) {
    return this.authService.verifyPhoneOtp(user.id, body.code);
  }

  @Post('send-verification')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Send email verification link (legacy link-based flow)' })
  async sendVerification(@AuthUser() user: { id: string }) {
    return this.authService.requestEmailVerification(user.id);
  }

  @Get('verify-email/:token')
  @ApiOperation({ summary: 'Verify email address via token link' })
  async verifyEmail(@Param('token') token: string) {
    const result = await this.authService.verifyEmail(token);
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    return { ...result, redirectTo: `${frontendUrl}/profile` };
  }
}
