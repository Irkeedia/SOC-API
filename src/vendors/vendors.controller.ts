import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { VendorsService } from './vendors.service';
import {
  CreateVendorApplicationDto,
  UpdateVendorProfileDto,
  CreateVendorProductDto,
  UpdateVendorProductDto,
  AdminReviewVendorDto,
  AdminReviewProductDto,
} from './dto/vendors.dto';

@ApiTags('Marketplace – Vendeurs')
@Controller('marketplace')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  // ═══════════════════════════════════════
  //  PUBLIC — Catalogue marketplace
  // ═══════════════════════════════════════

  @Get('products')
  @ApiOperation({ summary: 'Tous les produits marketplace (SOC en premier)' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'vendorId', required: false })
  getMarketplaceProducts(
    @Query('category') category?: string,
    @Query('vendorId') vendorId?: string,
  ) {
    return this.vendorsService.getMarketplaceProducts(category, vendorId);
  }

  @Get('products/:slug')
  @ApiOperation({ summary: 'Détail d\'un produit par slug' })
  getProductBySlug(@Param('slug') slug: string) {
    return this.vendorsService.getProductBySlug(slug);
  }

  // ═══════════════════════════════════════
  //  VENDOR — Candidature & profil
  // ═══════════════════════════════════════

  @Post('vendors/apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Candidater comme vendeur' })
  applyAsVendor(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateVendorApplicationDto,
  ) {
    return this.vendorsService.applyAsVendor(userId, dto);
  }

  @Get('vendors/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mon profil vendeur' })
  getMyProfile(@CurrentUser('userId') userId: string) {
    return this.vendorsService.getMyVendorProfile(userId);
  }

  @Put('vendors/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier mon profil vendeur' })
  updateMyProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateVendorProfileDto,
  ) {
    return this.vendorsService.updateVendorProfile(userId, dto);
  }

  @Get('vendors/dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tableau de bord vendeur (stats)' })
  getVendorDashboard(@CurrentUser('userId') userId: string) {
    return this.vendorsService.getVendorDashboard(userId);
  }

  @Get('vendors/sales')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes ventes' })
  getVendorSales(@CurrentUser('userId') userId: string) {
    return this.vendorsService.getVendorSales(userId);
  }

  // ═══════════════════════════════════════
  //  VENDOR — Gestion de produits
  // ═══════════════════════════════════════

  @Get('vendors/products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes produits' })
  getMyProducts(@CurrentUser('userId') userId: string) {
    return this.vendorsService.getVendorProducts(userId);
  }

  @Post('vendors/products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soumettre un produit (sera vérifié par SOC)' })
  createProduct(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateVendorProductDto,
  ) {
    return this.vendorsService.createVendorProduct(userId, dto);
  }

  @Put('vendors/products/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier mon produit' })
  updateProduct(
    @CurrentUser('userId') userId: string,
    @Param('id') productId: string,
    @Body() dto: UpdateVendorProductDto,
  ) {
    return this.vendorsService.updateVendorProduct(userId, productId, dto);
  }

  @Delete('vendors/products/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer mon produit' })
  deleteProduct(
    @CurrentUser('userId') userId: string,
    @Param('id') productId: string,
  ) {
    return this.vendorsService.deleteVendorProduct(userId, productId);
  }

  // ═══════════════════════════════════════
  //  ADMIN — Gestion marketplace
  // ═══════════════════════════════════════

  @Get('admin/vendors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste des vendeurs (filtre par statut)' })
  @ApiQuery({ name: 'status', required: false })
  getAllVendors(@Query('status') status?: string) {
    return this.vendorsService.getAllVendors(status);
  }

  @Put('admin/vendors/:id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approuver / refuser / suspendre un vendeur' })
  reviewVendor(
    @Param('id') vendorId: string,
    @Body() dto: AdminReviewVendorDto,
  ) {
    return this.vendorsService.reviewVendor(vendorId, dto);
  }

  @Get('admin/products/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Produits en attente de validation' })
  getPendingProducts() {
    return this.vendorsService.getPendingProducts();
  }

  @Put('admin/products/:id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approuver / refuser un produit vendeur' })
  reviewProduct(
    @Param('id') productId: string,
    @Body() dto: AdminReviewProductDto,
  ) {
    return this.vendorsService.reviewProduct(productId, dto);
  }
}
