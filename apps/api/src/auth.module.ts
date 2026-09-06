import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminAuthGuard } from './auth/admin-auth.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { EmailService } from './email.service';

/**
 * Global auth module — owns JWT setup.
 * Exporting JwtModule makes JwtService globally available so guards and
 * ChatGateway can inject it without importing JwtModule themselves.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow<string>('JWT_EXPIRES_IN') as never,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers:   [AuthService, EmailService, JwtAuthGuard, RolesGuard, AdminAuthGuard],
  exports:     [AuthService, EmailService, JwtAuthGuard, RolesGuard, AdminAuthGuard, JwtModule],
})
export class AuthModule {}
