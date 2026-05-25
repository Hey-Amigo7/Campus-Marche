import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { AuthUser } from './auth/auth-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { SubscriptionService, type PlanKey } from './subscription.service';

class UpgradeDto {
  @IsIn(['pro', 'featured'])
  plan!: PlanKey;
}

@ApiTags('subscription')
@ApiBearerAuth()
@Controller('subscription')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current subscription for authenticated user' })
  async getMySubscription(@AuthUser() user: { id: string }) {
    return this.subscriptionService.getSubscription(user.id);
  }

  @Post('upgrade')
  @ApiOperation({ summary: 'Initialize a Paystack payment to upgrade plan' })
  async upgrade(@AuthUser() user: { id: string }, @Body() body: UpgradeDto) {
    return this.subscriptionService.initializeUpgrade(user.id, body.plan);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel current subscription' })
  async cancel(@AuthUser() user: { id: string }) {
    return this.subscriptionService.cancelSubscription(user.id);
  }
}
