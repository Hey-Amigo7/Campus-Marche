import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { AppModule } from './app.module';
import { parseAllowedOrigins } from './config/env.validation';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  const uploadDir = config.get<string>('UPLOAD_DIR') ?? join(process.cwd(), 'uploads');
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(uploadDir, { prefix: '/uploads' });
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  const allowedOrigins = parseAllowedOrigins(config.getOrThrow<string>('CORS_ORIGINS'));

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.use(cookieParser());

  app.enableCors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (!isProduction) {
    const options = new DocumentBuilder()
      .setTitle('Campus Marche API')
      .setDescription('Backend API for the Campus Marche student marketplace')
      .setVersion('1.0.0')
      .addBearerAuth()
      .addCookieAuth('cm_token')
      .addTag('admin', 'Admin and moderation endpoints')
      .addTag('products', 'Product management endpoints')
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management endpoints')
      .addTag('sellers', 'Seller profiles')
      .addTag('orders', 'Order management')
      .addTag('payments', 'Paystack payment integration')
      .addTag('business', 'Business profile management')
      .addTag('messages', 'Messaging and conversations')
      .addTag('notifications', 'User notifications')
      .addTag('reviews', 'Product reviews')
      .addTag('saved-items', 'Wishlist / saved products')
      .addTag('reports', 'Content and user reports')
      .addTag('uploads', 'Image uploads')
      .addTag('events', 'Campus events')
      .build();
    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup('docs', app, document);
  }

  const port = config.getOrThrow<number>('PORT');
  await app.listen(port);

  logger.log(`Server running on http://localhost:${port}`);
  if (!isProduction) {
    logger.log(`Swagger UI available at http://localhost:${port}/docs`);
  }
}

void bootstrap();
