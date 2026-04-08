import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CartService } from "../cart/cart.service";
import { PaymentsService } from "../payments/payments.service";
import type { PlaceOrderInput } from "@wbk/shared";

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
    private readonly payments: PaymentsService,
  ) {}

  async placeOrder(userId: string, input: PlaceOrderInput) {
    const { items, totals, mode } = await this.cart.listWithFees(
      userId,
      input.deliveryMode,
    );
    if (items.length === 0) {
      throw new BadRequestException("Cart is empty");
    }
    if (mode === "FORWARD" && !input.forwardAddress) {
      throw new BadRequestException("forwardAddress is required for FORWARD mode");
    }
    if (mode === "PICKUP" && !input.pickupLocation) {
      throw new BadRequestException("pickupLocation is required for PICKUP mode");
    }

    const order = await this.prisma.order.create({
      data: {
        userId,
        deliveryMode: mode,
        pickupLocation: input.pickupLocation ?? null,
        forwardJson: input.forwardAddress
          ? JSON.stringify(input.forwardAddress)
          : null,
        arrivalDate: input.arrivalDate ? new Date(input.arrivalDate) : null,
        itemTotalKrw: totals.itemPriceKrw,
        handlingKrw: totals.handlingChargeKrw,
        surchargeKrw: totals.surchargeKrw,
        shippingKrw: totals.shippingKrw,
        totalKrw: totals.totalKrw,
        items: {
          create: items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            unitPriceKrw: it.product.priceKrw,
            optionsNote: it.optionsNote,
          })),
        },
      },
      include: { items: true },
    });

    // Phase 5 stub: pre-authorize the card. Mock provider always succeeds.
    await this.payments.preAuthorize(order.id, totals.totalKrw);
    await this.cart.clear(userId);
    return order;
  }

  list(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: { include: { product: true } }, payments: true },
      orderBy: { createdAt: "desc" },
    });
  }

  get(userId: string, orderId: string) {
    return this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: { include: { product: true } },
        inspections: true,
        payments: true,
        shipments: true,
      },
    });
  }
}
