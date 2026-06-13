import { Module } from '@nestjs/common';
import { UserController } from './user.controller';

// UserController injects AuthService and PrismaService — both available
// globally via AuthModule (@Global) and PrismaModule (@Global).
@Module({
  controllers: [UserController],
})
export class UserModule {}
