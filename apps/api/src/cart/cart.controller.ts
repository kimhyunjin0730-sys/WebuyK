import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, CurrentUserPayload } from "../auth/current-user.decorator";
import { CartService } from "./cart.service";
import { ZodValidate } from "../common/zod.pipe";
import { AddCartItemSchema, type DeliveryMode } from "@wbk/shared";

@UseGuards(JwtAuthGuard)
@Controller("cart")
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query("mode") mode?: string,
  ) {
    const safeMode: DeliveryMode = mode === "FORWARD" ? "FORWARD" : "PICKUP";
    return this.cart.listWithFees(user.userId, safeMode);
  }

  @Post()
  add(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidate(AddCartItemSchema))
    body: { sourceUrl: string; quantity: number; optionsNote?: string },
  ) {
    return this.cart.addByUrl(
      user.userId,
      body.sourceUrl,
      body.quantity,
      body.optionsNote,
    );
  }

  @Delete(":id")
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.cart.remove(user.userId, id);
  }
}
