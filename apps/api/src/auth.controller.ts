import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsNotEmpty, IsString } from 'class-validator';
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

class BootstrapAdminDto {
  @IsString()
  @IsNotEmpty()
  setupKey!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.name, body.password);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login a user (accepts email, phone number, or @handle)' })
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.identifier, body.password);
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

  @Post('bootstrap-admin')
  @Throttle({ default: { limit: 2, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Create default admin account if none exists (requires ADMIN_SETUP_KEY)' })
  async bootstrapAdmin(@Body() body: BootstrapAdminDto) {
    const expected = this.config.get<string>('ADMIN_SETUP_KEY');
    if (!expected || body.setupKey !== expected) {
      throw new ForbiddenException('Invalid setup key');
    }
    return this.authService.bootstrapAdmin();
  }
}
