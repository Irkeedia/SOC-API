import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, CreateOrderDto } from './dto/ecommerce.dto';

@Injectable()
export class EcommerceService {
  constructor(private readonly prisma: PrismaService) {}

  // === Produits ===

  async createProduct(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        ...dto,
        inStock: (dto.stockQty ?? 0) > 0,
      },
    });
  }

  async getProducts(category?: string) {
    const where = category ? { category, inStock: true } : { inStock: true };
    return this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async getProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Produit introuvable.');
    return product;
  }

  // === Commandes ===

  async createOrder(userId: string, dto: CreateOrderDto) {
    // Récupérer les produits et calculer le total
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
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

    // Calculer le total
    let total = 0;
    const orderItems = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const lineTotal = product.price * item.quantity;
      total += lineTotal;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
      };
    });

    // Créer la commande dans une transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Décrémenter le stock
      for (const item of dto.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQty: { decrement: item.quantity },
          },
        });
      }

      // Mettre à jour inStock
      for (const item of dto.items) {
        const updated = await tx.product.findUnique({ where: { id: item.productId } });
        if (updated && updated.stockQty <= 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: { inStock: false },
          });
        }
      }

      return tx.order.create({
        data: {
          userId,
          total,
          shippingAddress: dto.shippingAddress,
          isDiscreet: dto.isDiscreet ?? true,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: { product: { select: { name: true, imageUrl: true } } },
          },
        },
      });
    });

    return order;
  }

  async getUserOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: { product: { select: { name: true, imageUrl: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });
    if (!order) throw new NotFoundException('Commande introuvable.');
    if (order.userId !== userId) throw new NotFoundException('Commande introuvable.');
    return order;
  }
}
