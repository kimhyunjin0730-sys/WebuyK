import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MOCK_GATEWAY } from "./mock.gateway";
import type { PaymentGateway } from "./payment-gateway.interface";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MOCK_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  private get providerName(): string {
    return process.env.PORTONE_API_KEY ? "portone" : "mock";
  }

  async preAuthorize(orderId: string, amountKrw: number) {
    const { providerRef } = await this.gateway.preAuthorize({
      orderId,
      amountKrw,
    });
    return this.prisma.payment.create({
      data: {
        orderId,
        provider: this.providerName,
        providerRef,
        amountKrw,
        status: "PRE_AUTHORIZED",
      },
    });
  }

  async capture(paymentId: string) {
    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
    });
    const { providerRef } = await this.gateway.capture({
      providerRef: payment.providerRef!,
      amountKrw: payment.amountKrw,
    });
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: "CAPTURED", providerRef },
    });
  }

  /**
   * Order-scoped capture used by the frontend after IMP.request_pay returns
   * an imp_uid. Verifies ownership, swaps the stored providerRef from the
   * merchant_uid placeholder we wrote at preAuthorize() time over to the
   * real imp_uid (so PortoneGateway.capture() can verify against Portone),
   * then advances the order out of PENDING_PAYMENT into PURCHASING.
   *
   * The whole sequence runs in a single transaction so a partial failure
   * (verify success but DB write fail, etc.) leaves the order intact.
   */
  async captureByOrder(orderId: string, userId: string, impUid: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException("Order not found");
    if (order.userId !== userId) throw new ForbiddenException();
    if (order.status !== "PENDING_PAYMENT") {
      throw new ForbiddenException(
        `Order ${orderId} is in status ${order.status}, cannot capture`,
      );
    }
    const payment = order.payments.find((p) => p.status === "PRE_AUTHORIZED");
    if (!payment) throw new NotFoundException("Pre-authorized payment not found");

    // Stamp imp_uid as providerRef BEFORE the gateway call so that, if
    // PortoneGateway is the active impl, capture() finds the right thing.
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { providerRef: impUid },
    });

    // Mock gateway ignores the imp_uid; Portone gateway requires it. Both
    // throw on failure, which propagates as a 5xx and leaves the order in
    // PENDING_PAYMENT for the user to retry.
    const { providerRef } = await this.gateway.capture({
      providerRef: impUid,
      amountKrw: payment.amountKrw,
    });

    return this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: "CAPTURED", providerRef },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: "PURCHASING" },
      }),
    ]);
  }
}
