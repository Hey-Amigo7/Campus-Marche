import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PayoutStatus } from '@prisma/client';
import { AuthUser } from './auth/auth-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { Roles } from './auth/roles.decorator';
import { RolesGuard } from './auth/roles.guard';
import { ApprovePayoutDto, RequestPayoutDto } from './dto/payout.dto';
import { PayoutService } from './payout.service';

@ApiTags('payouts')
@ApiBearerAuth()
@Controller('payouts')
export class PayoutController {
  constructor(private payoutService: PayoutService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Request a payout from available wallet balance' })
  request(@Body() dto: RequestPayoutDto, @AuthUser() user: { id: string }) {
    return this.payoutService.requestPayout(user.id, dto.amount, dto.payoutMethod, dto.momoPhone);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get payout history for the authenticated seller' })
  history(@AuthUser() user: { id: string }) {
    return this.payoutService.getSellerPayouts(user.id);
  }

  // ── Admin endpoints — ADMIN role required ───────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/pending')
  @ApiOperation({ summary: '[Admin] List all payouts (optionally filtered by status)' })
  adminListPending(@Query('status') status?: string) {
    return this.payoutService.listPayouts(
      status ? (status as PayoutStatus) : undefined,
      0,
      100,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('admin/:id/approve')
  @ApiOperation({ summary: '[Admin] Approve a pending payout and initiate transfer' })
  adminApprove(@Param('id') id: string, @Body() _dto: ApprovePayoutDto) {
    return this.payoutService.adminApprovePayout(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('admin/:id/cancel')
  @ApiOperation({ summary: '[Admin] Cancel a PENDING or PROCESSING payout and restore seller balance' })
  adminCancel(@Param('id') id: string) {
    return this.payoutService.adminCancelPayout(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('admin/:id/refund')
  @ApiOperation({ summary: '[Admin] Void a stuck PROCESSING payout and refund seller balance (e.g. OTP-blocked transfers)' })
  adminRefund(@Param('id') id: string) {
    return this.payoutService.adminRefundPayout(id);
  }
}
