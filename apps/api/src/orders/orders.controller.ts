import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, CurrentUserPayload } from "../auth/current-user.decorator";
import { OrdersService } from "./orders.service";
import { ZodValidate } from "../common/zod.pipe";
import { PlaceOrderSchema, type PlaceOrderInput } from "@wbk/shared";

@UseGuards(JwtAuthGuard)
@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.orders.list(user.userId);
  }

  @Get(":id")
  async get(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    const order = await this.orders.get(user.userId, id);
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }

  @Post()
  place(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidate(PlaceOrderSchema)) body: PlaceOrderInput,
  ) {
    return this.orders.placeOrder(user.userId, body);
  }
}
