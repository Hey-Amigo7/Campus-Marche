import { Controller, Get, Headers, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthUser } from './auth/auth-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PaymentService } from './payment.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('webhook')
  @HttpCode(200)
  @SkipThrottle()
  @ApiExcludeEndpoint()
  handleWebhook(
    @Req() req: { rawBody?: Buffer },
    @Headers('x-paystack-signature') signature: string,
  ) {
    return this.paymentService.handleWebhook(req.rawBody ?? Buffer.alloc(0), signature);
  }

  @Post('orders/:orderId/initialize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize Paystack payment for an order' })
  initializeOrder(@Param('orderId') orderId: string, @AuthUser() user: { id: string }) {
    return this.paymentService.initializeOrderPayment(orderId, user.id);
  }

  @Get('verify/:reference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a Paystack transaction and fund escrow' })
  verify(@Param('reference') reference: string, @AuthUser() user: { id: string }) {
    return this.paymentService.verify(reference, user.id);
  }

  @Post('orders/:orderId/release')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Release escrow after buyer confirms delivery' })
  release(@Param('orderId') orderId: string, @AuthUser() user: { id: string }) {
    return this.paymentService.releaseEscrow(orderId, user.id);
  }
}
