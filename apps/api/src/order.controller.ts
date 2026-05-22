import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from './auth/auth-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import {
  AssignDeliveryPersonDto,
  CreateOrderDto,
  SetDeliveryDetailsDto,
  UpdateLocationDto,
  UpdateOrderStatusDto,
} from './dto/order.dto';
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

  @Post(':id/delivery-details')
  @ApiOperation({ summary: 'Set delivery address and contact phone (buyer only)' })
  setDeliveryDetails(
    @Param('id') id: string,
    @Body() body: SetDeliveryDetailsDto,
    @AuthUser() user: { id: string },
  ) {
    return this.orderService.setDeliveryDetails(id, user.id, body.deliveryAddress, body.deliveryPhone);
  }

  @Post(':id/assign-delivery')
  @ApiOperation({ summary: 'Assign a delivery person to an in-progress order (seller only)' })
  assignDeliveryPerson(
    @Param('id') id: string,
    @Body() body: AssignDeliveryPersonDto,
    @AuthUser() user: { id: string },
  ) {
    return this.orderService.assignDeliveryPerson(id, user.id, body.deliveryPersonId);
  }

  @Put(':id/location')
  @ApiOperation({ summary: 'Update live delivery coordinates (assigned delivery person only)' })
  updateLocation(
    @Param('id') id: string,
    @Body() body: UpdateLocationDto,
    @AuthUser() user: { id: string },
  ) {
    return this.orderService.updateDeliveryLocation(id, user.id, body.latitude, body.longitude, body.heading, body.speed);
  }

  @Get(':id/tracking')
  @ApiOperation({ summary: 'Get live delivery tracking (buyer, seller, or delivery person)' })
  getTracking(@Param('id') id: string, @AuthUser() user: { id: string }) {
    return this.orderService.getDeliveryTracking(id, user.id);
  }
}
