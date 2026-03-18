import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, CreateOrderDto } from './dto/ecommerce.dto';

@Injectable()
export class EcommerceService {
  constructor(private readonly prisma: PrismaService) {}

  // === Produits ===

  async createProduct(dto: CreateProductDto) {
    return this.prisma.products.create({
      data: {
        ...dto,
        inStock: (dto.stockQty ?? 0) > 0,
      },
    });
  }

  async getProducts(category?: string) {
    const where: Record<string, unknown> = { inStock: true, approvalStatus: 'APPROVED' };
    if (category) where.category = category;
    return this.prisma.products.findMany({
      where,
      include: {
        vendor: { select: { businessName: true, logoUrl: true } },
      },
      orderBy: [
        { isSOCProduct: 'desc' },
        { featured: 'desc' },
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async getProduct(productId: string) {
    const product = await this.prisma.products.findUnique({
      where: { id: productId },
      include: {
        vendor: { select: { businessName: true, logoUrl: true } },
        product_images: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!product) throw new NotFoundException('Produit introuvable.');
    return product;
  }

  // === Commandes ===

  async createOrder(userId: string, dto: CreateOrderDto) {
    // Récupérer les produits et calculer le total
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.products.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Un ou plusieurs produits sont introuvables.');
    }

    // Vérifier le stock
    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product?.inStock || product.stockQty < item.quantity) {
        throw new BadRequestException(`Stock insuffisant pour "${product?.name}".`);
      }
    }

    // Calculer le total + commissions
    let total = 0;
    const orderItems = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const lineTotal = product.price * item.quantity;
      total += lineTotal;

      // Commission only on vendor products
      const commissionRate = product.isSOCProduct ? 0 : (product.commissionRate ?? 15);
      const commission = Math.round(lineTotal * commissionRate) / 100;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        vendorId: product.vendorId,
        commission,
      };
    });

    // Créer la commande dans une transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Décrémenter le stock
      for (const item of dto.items) {
        await tx.products.update({
          where: { id: item.productId },
          data: {
            stockQty: { decrement: item.quantity },
          },
        });
      }

      // Mettre à jour inStock
      for (const item of dto.items) {
        const updated = await tx.products.findUnique({ where: { id: item.productId } });
        if (updated && updated.stockQty <= 0) {
          await tx.products.update({
            where: { id: item.productId },
            data: { inStock: false },
          });
        }
      }

      return tx.orders.create({
        data: {
          userId,
          total,
          shippingAddress: dto.shippingAddress,
          isDiscreet: dto.isDiscreet ?? true,
          order_items: {
            create: orderItems,
          },
        },
        include: {
          order_items: {
            include: { products: { select: { name: true, imageUrl: true } } },
          },
        },
      });
    });

    return order;
  }

  async getUserOrders(userId: string) {
    return this.prisma.orders.findMany({
      where: { userId },
      include: {
        order_items: {
          include: { products: { select: { name: true, imageUrl: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrder(orderId: string, userId: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        order_items: {
          include: { products: true },
        },
      },
    });
    if (!order) throw new NotFoundException('Commande introuvable.');
    if (order.userId !== userId) throw new NotFoundException('Commande introuvable.');
    return order;
  }
}
