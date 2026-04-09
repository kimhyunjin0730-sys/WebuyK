import { Inject, Injectable } from "@nestjs/common";
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
}
