import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EcommerceService } from './ecommerce.service';
import { CreateProductDto, CreateOrderDto } from './dto/ecommerce.dto';

@ApiTags('E-commerce')
@Controller('shop')
export class EcommerceController {
  constructor(private readonly ecommerceService: EcommerceService) {}

  // === Produits (catalogue public) ===

  @Get('products')
  @ApiOperation({ summary: 'Catalogue SOC (solutions, kits, consommables)' })
  @ApiQuery({ name: 'category', required: false })
  getProducts(@Query('category') category?: string) {
    return this.ecommerceService.getProducts(category);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Détails d\'un produit' })
  getProduct(@Param('id') id: string) {
    return this.ecommerceService.getProduct(id);
  }

  @Post('products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ajouter un produit (admin uniquement)' })
  createProduct(@Body() dto: CreateProductDto) {
    return this.ecommerceService.createProduct(dto);
  }

  // === Commandes ===

  @Post('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Passer une commande (livraison discrète par défaut)' })
  createOrder(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ecommerceService.createOrder(userId, dto);
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes commandes' })
  getMyOrders(@CurrentUser('userId') userId: string) {
    return this.ecommerceService.getUserOrders(userId);
  }

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détails d\'une commande' })
  getOrder(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.ecommerceService.getOrder(id, userId);
  }
}
