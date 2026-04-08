import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Phase 4 — WMS Basics.
 *
 * Stub implementation: matches inbound shipments to orders by the *order id*
 * embedded in the package label (instead of by mailbox no + carrier API,
 * which requires real WMS integration). Real impl should:
 *   1. Subscribe to carrier webhooks (CJ, Hanjin, Lotte) and push tracking
 *      updates into `Shipment`.
 *   2. Cross-reference inbound packages addressed to a virtual mailbox no
 *      against open orders for that user.
 *   3. Trigger inspection workflow & user notification on receipt.
 */
@Injectable()
export class WarehouseService {
  constructor(private readonly prisma: PrismaService) {}

  async registerInbound(opts: {
    orderId: string;
    trackingNo: string;
    carrier: string;
  }) {
    const order = await this.prisma.order.findUnique({
      where: { id: opts.orderId },
    });
    if (!order) throw new NotFoundException("Order not found");

    const shipment = await this.prisma.shipment.create({
      data: {
        orderId: opts.orderId,
        trackingNo: opts.trackingNo,
        carrier: opts.carrier,
        receivedAt: new Date(),
      },
    });
    await this.prisma.order.update({
      where: { id: opts.orderId },
      data: { status: "INSPECTING" },
    });
    return shipment;
  }

  async addInspection(opts: {
    orderId: string;
    photoUrl: string;
    notes?: string;
  }) {
    const inspection = await this.prisma.inspection.create({
      data: {
        orderId: opts.orderId,
        photoUrl: opts.photoUrl,
        notes: opts.notes ?? null,
      },
    });
    await this.prisma.order.update({
      where: { id: opts.orderId },
      data: { status: "READY_FOR_PICKUP" },
    });
    return inspection;
  }
}
