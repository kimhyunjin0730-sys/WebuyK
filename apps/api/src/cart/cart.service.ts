import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ProductsService } from "../products/products.service";
import { computeFee, sumFees, type DeliveryMode } from "@wbk/shared";

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
  ) {}

  async addByUrl(
    userId: string,
    sourceUrl: string,
    quantity: number,
    optionsNote?: string,
  ) {
    const product = await this.products.ingestByUrl(sourceUrl);
    return this.prisma.cartItem.create({
      data: { userId, productId: product.id, quantity, optionsNote },
      include: { product: true },
    });
  }

  async listWithFees(userId: string, mode: DeliveryMode = "PICKUP") {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
    const enriched = items.map((it) => {
      const lineTotal = it.product.priceKrw * it.quantity;
      const fee = computeFee(lineTotal, mode);
      return { ...it, lineTotal, fee };
    });
    const totals = sumFees(enriched.map((e) => e.fee));
    return { items: enriched, totals, mode };
  }

  async remove(userId: string, cartItemId: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });
    if (!item || item.userId !== userId) {
      throw new NotFoundException("Cart item not found");
    }
    await this.prisma.cartItem.delete({ where: { id: cartItemId } });
    return { ok: true };
  }

  clear(userId: string) {
    return this.prisma.cartItem.deleteMany({ where: { userId } });
  }
}
