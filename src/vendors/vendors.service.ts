import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateVendorApplicationDto,
  UpdateVendorProfileDto,
  CreateVendorProductDto,
  UpdateVendorProductDto,
  AdminReviewVendorDto,
  AdminReviewProductDto,
} from './dto/vendors.dto';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Vendor Application ───

  async applyAsVendor(userId: string, dto: CreateVendorApplicationDto) {
    const existing = await this.prisma.vendors.findUnique({ where: { userId } });
    if (existing) throw new BadRequestException('Vous avez déjà une demande vendeur.');

    const vendor = await this.prisma.vendors.create({
      data: {
        userId,
        businessName: dto.businessName,
        businessEmail: dto.businessEmail,
        description: dto.description,
        website: dto.website,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        country: dto.country ?? 'FR',
      },
    });

    // Upgrade user role to VENDOR
    await this.prisma.users.update({
      where: { id: userId },
      data: { role: 'VENDOR' },
    });

    return vendor;
  }

  async getMyVendorProfile(userId: string) {
    const vendor = await this.prisma.vendors.findUnique({
      where: { userId },
      include: { products: { orderBy: { createdAt: 'desc' } } },
    });
    if (!vendor) throw new NotFoundException('Profil vendeur non trouvé.');
    return vendor;
  }

  async updateVendorProfile(userId: string, dto: UpdateVendorProfileDto) {
    const vendor = await this.prisma.vendors.findUnique({ where: { userId } });
    if (!vendor) throw new NotFoundException('Profil vendeur non trouvé.');

    return this.prisma.vendors.update({
      where: { userId },
      data: { ...dto },
    });
  }

  // ─── Vendor Products ───

  async createVendorProduct(userId: string, dto: CreateVendorProductDto) {
    const vendor = await this.prisma.vendors.findUnique({ where: { userId } });
    if (!vendor) throw new ForbiddenException('Vous n\'êtes pas vendeur.');
    if (vendor.status !== 'APPROVED') throw new ForbiddenException('Votre compte vendeur n\'est pas encore approuvé.');

    const slug = dto.name
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    return this.prisma.products.create({
      data: {
        name: dto.name,
        description: dto.description,
        shortDesc: dto.shortDesc,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice,
        category: dto.category,
        stockQty: dto.stockQty ?? 0,
        inStock: (dto.stockQty ?? 0) > 0,
        imageUrl: dto.imageUrl,
        shippingInfo: dto.shippingInfo,
        slug: `${slug}-${Date.now().toString(36)}`,
        vendorId: vendor.id,
        isSOCProduct: false,
        approvalStatus: 'PENDING',
        commissionRate: vendor.commissionRate,
      },
    });
  }

  async updateVendorProduct(userId: string, productId: string, dto: UpdateVendorProductDto) {
    const vendor = await this.prisma.vendors.findUnique({ where: { userId } });
    if (!vendor) throw new ForbiddenException('Vous n\'êtes pas vendeur.');

    const product = await this.prisma.products.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produit non trouvé.');
    if (product.vendorId !== vendor.id) throw new ForbiddenException('Ce produit ne vous appartient pas.');

    const updateData: Record<string, unknown> = { ...dto };
    if (dto.stockQty !== undefined) {
      updateData.inStock = dto.stockQty > 0;
    }
    // Re-submit for approval if price or description changed
    if (dto.price || dto.description || dto.name) {
      updateData.approvalStatus = 'PENDING';
    }

    return this.prisma.products.update({
      where: { id: productId },
      data: updateData,
    });
  }

  async deleteVendorProduct(userId: string, productId: string) {
    const vendor = await this.prisma.vendors.findUnique({ where: { userId } });
    if (!vendor) throw new ForbiddenException('Vous n\'êtes pas vendeur.');

    const product = await this.prisma.products.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produit non trouvé.');
    if (product.vendorId !== vendor.id) throw new ForbiddenException('Ce produit ne vous appartient pas.');

    return this.prisma.products.delete({ where: { id: productId } });
  }

  async getVendorProducts(userId: string) {
    const vendor = await this.prisma.vendors.findUnique({ where: { userId } });
    if (!vendor) throw new ForbiddenException('Vous n\'êtes pas vendeur.');

    return this.prisma.products.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getVendorDashboard(userId: string) {
    const vendor = await this.prisma.vendors.findUnique({ where: { userId } });
    if (!vendor) throw new ForbiddenException('Vous n\'êtes pas vendeur.');

    const [products, salesData, pendingPayouts] = await Promise.all([
      this.prisma.products.count({ where: { vendorId: vendor.id } }),
      this.prisma.order_items.findMany({
        where: { vendorId: vendor.id },
        include: { orders: { select: { status: true, createdAt: true } } },
      }),
      this.prisma.vendor_payouts.findMany({
        where: { vendorId: vendor.id, status: 'PENDING' },
      }),
    ]);

    const totalRevenue = salesData
      .filter(item => item.orders.status === 'PAYEE' || item.orders.status === 'EXPEDIEE' || item.orders.status === 'LIVREE')
      .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    const totalCommission = salesData
      .filter(item => item.orders.status === 'PAYEE' || item.orders.status === 'EXPEDIEE' || item.orders.status === 'LIVREE')
      .reduce((sum, item) => sum + (item.commission ?? 0), 0);

    return {
      vendor: {
        id: vendor.id,
        businessName: vendor.businessName,
        status: vendor.status,
        commissionRate: vendor.commissionRate,
      },
      stats: {
        totalProducts: products,
        totalOrders: salesData.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCommission: Math.round(totalCommission * 100) / 100,
        netEarnings: Math.round((totalRevenue - totalCommission) * 100) / 100,
        pendingPayouts: pendingPayouts.length,
      },
    };
  }

  // ─── Admin: Vendor Management ───

  async getAllVendors(status?: string) {
    const where = status ? { status: status as any } : {};
    return this.prisma.vendors.findMany({
      where,
      include: {
        user: { select: { email: true, displayName: true } },
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewVendor(vendorId: string, dto: AdminReviewVendorDto) {
    const vendor = await this.prisma.vendors.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendeur non trouvé.');

    const updateData: Record<string, unknown> = {
      status: dto.action,
    };

    if (dto.action === 'APPROVED') {
      updateData.approvedAt = new Date();
      if (dto.commissionRate !== undefined) {
        updateData.commissionRate = dto.commissionRate;
      }
    }

    if (dto.action === 'REJECTED' || dto.action === 'SUSPENDED') {
      updateData.rejectedNote = dto.note;
    }

    return this.prisma.vendors.update({
      where: { id: vendorId },
      data: updateData,
    });
  }

  // ─── Admin: Product Review ───

  async getPendingProducts() {
    return this.prisma.products.findMany({
      where: { approvalStatus: 'PENDING' },
      include: {
        vendor: { select: { businessName: true, commissionRate: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewProduct(productId: string, dto: AdminReviewProductDto) {
    const product = await this.prisma.products.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produit non trouvé.');

    return this.prisma.products.update({
      where: { id: productId },
      data: {
        approvalStatus: dto.action,
        rejectionNote: dto.action === 'REJECTED' ? dto.rejectionNote : null,
      },
    });
  }

  // ─── Public: Marketplace Products ───

  async getMarketplaceProducts(category?: string, vendorId?: string) {
    const where: Record<string, unknown> = {
      approvalStatus: 'APPROVED',
      inStock: true,
    };
    if (category) where.category = category;
    if (vendorId) where.vendorId = vendorId;

    return this.prisma.products.findMany({
      where,
      include: {
        vendor: { select: { businessName: true, logoUrl: true } },
      },
      orderBy: [
        { isSOCProduct: 'desc' },   // SOC products first
        { featured: 'desc' },       // Featured next
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async getProductBySlug(slug: string) {
    const product = await this.prisma.products.findUnique({
      where: { slug },
      include: {
        vendor: { select: { businessName: true, logoUrl: true, description: true } },
        product_images: { orderBy: { sortOrder: 'asc' } },
        product_reviews: {
          include: { user: { select: { displayName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!product || product.approvalStatus !== 'APPROVED') {
      throw new NotFoundException('Produit non trouvé.');
    }
    return product;
  }

  // ─── Vendor Sales ───

  async getVendorSales(userId: string) {
    const vendor = await this.prisma.vendors.findUnique({ where: { userId } });
    if (!vendor) throw new ForbiddenException('Vous n\'êtes pas vendeur.');

    return this.prisma.order_items.findMany({
      where: { vendorId: vendor.id },
      include: {
        orders: {
          select: {
            id: true, status: true, createdAt: true,
            shippingName: true, shippingCity: true,
          },
        },
        products: { select: { name: true, imageUrl: true } },
      },
      orderBy: { orders: { createdAt: 'desc' } },
    });
  }
}
