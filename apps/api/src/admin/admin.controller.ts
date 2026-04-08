import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";

@UseGuards(AdminGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("orders")
  listOrders(@Query("status") status?: string) {
    return this.prisma.order.findMany({
      where: status ? { status: status as any } : undefined,
      include: { user: true, items: true, payments: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  @Get("stats")
  async stats() {
    const [total, pending, ready, longStanding] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: "AWAITING_INBOUND" } }),
      this.prisma.order.count({ where: { status: "READY_FOR_PICKUP" } }),
      this.prisma.order.count({
        where: {
          status: "READY_FOR_PICKUP",
          updatedAt: { lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);
    return { total, pending, ready, longStanding };
  }
}
