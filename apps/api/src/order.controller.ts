import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from './auth/auth-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';
import { OrderService } from './order.service';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Get()
  @ApiOperation({ summary: 'Get all orders for the authenticated user (buyer + seller)' })
  getAll(@AuthUser() user: { id: string }) {
    return this.orderService.getForUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID (only accessible by buyer or seller)' })
  getById(@Param('id') id: string, @AuthUser() user: { id: string }) {
    return this.orderService.getByIdForUser(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new order for a product' })
  create(@Body() body: CreateOrderDto, @AuthUser() user: { id: string }) {
    return this.orderService.create({ productId: body.productId, buyerId: user.id });
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update order status (only valid transitions allowed)' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateOrderStatusDto,
    @AuthUser() user: { id: string },
  ) {
    return this.orderService.updateStatus(id, user.id, body.status);
  }
}
