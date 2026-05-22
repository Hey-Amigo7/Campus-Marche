import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthUser } from './auth/auth-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ProductService } from './product.service';

@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(private productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active products (paginated)' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  getAll(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.productService.getAll({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search products by title, description, tags, or category' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  search(@Query('q') q = '', @Query('skip') skip?: string, @Query('take') take?: string) {
    return this.productService.search(q, {
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get product categories with counts' })
  getCategories() {
    return this.productService.getCategories();
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get products by category' })
  getByCategory(
    @Param('category') category: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.productService.getByCategory(category, {
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID (also increments view count)' })
  getById(@Param('id') id: string) {
    return this.productService.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product listing' })
  create(@Body() body: CreateProductDto, @AuthUser() user: { id: string }) {
    return this.productService.create(user.id, body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update your own product' })
  update(@Param('id') id: string, @Body() body: UpdateProductDto, @AuthUser() user: { id: string }) {
    return this.productService.update(id, user.id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete (deactivate) your own product' })
  delete(@Param('id') id: string, @AuthUser() user: { id: string }) {
    return this.productService.delete(id, user.id);
  }
}
