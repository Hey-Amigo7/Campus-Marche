import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PayoutStatus } from '@prisma/client';
import { AuthUser } from './auth/auth-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ApprovePayoutDto, RequestPayoutDto } from './dto/payout.dto';
import { PayoutService } from './payout.service';

@ApiTags('payouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payouts')
export class PayoutController {
  constructor(private payoutService: PayoutService) {}

  @Post()
  @ApiOperation({ summary: 'Request a payout from available wallet balance' })
  request(@Body() dto: RequestPayoutDto, @AuthUser() user: { id: string }) {
    return this.payoutService.requestPayout(user.id, dto.amount, dto.payoutMethod, dto.momoPhone);
  }

  @Get()
  @ApiOperation({ summary: 'Get payout history for the authenticated seller' })
  history(@AuthUser() user: { id: string }) {
    return this.payoutService.getSellerPayouts(user.id);
  }

  // ── Admin endpoints (lightweight — full admin UI uses admin.controller.ts) ─

  @Get('admin/pending')
  @ApiOperation({ summary: '[Admin] List all PENDING payouts awaiting approval' })
  adminListPending() {
    return this.payoutService.listPayouts(PayoutStatus.PENDING);
  }

  @Post('admin/:id/approve')
  @ApiOperation({ summary: '[Admin] Approve a pending payout and initiate transfer' })
  adminApprove(@Param('id') id: string, @Body() _dto: ApprovePayoutDto) {
    return this.payoutService.adminApprovePayout(id);
  }

  @Post('admin/:id/cancel')
  @ApiOperation({ summary: '[Admin] Cancel a pending payout and restore balance' })
  adminCancel(@Param('id') id: string) {
    return this.payoutService.adminCancelPayout(id);
  }
}
