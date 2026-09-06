import { Body, Controller, ForbiddenException, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsNotEmpty, IsString } from 'class-validator';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  GoogleSignInDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  ValidateTokenDto,
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

  @Post('google')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in or register with Google (ID token from Sign In With Google)' })
  async googleSignIn(@Body() body: GoogleSignInDto) {
    return this.authService.googleSignIn(body.credential);
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
