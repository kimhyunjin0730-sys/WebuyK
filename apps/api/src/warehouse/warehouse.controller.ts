import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/jwt-auth.guard";
import { WarehouseService } from "./warehouse.service";

@UseGuards(AdminGuard)
@Controller("admin/warehouse")
export class WarehouseController {
  constructor(private readonly warehouse: WarehouseService) {}

  @Post("inbound")
  registerInbound(
    @Body() body: { orderId: string; trackingNo: string; carrier: string },
  ) {
    return this.warehouse.registerInbound(body);
  }

  @Post("inspection")
  inspect(
    @Body() body: { orderId: string; photoUrl: string; notes?: string },
  ) {
    return this.warehouse.addInspection(body);
  }
}
