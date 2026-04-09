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
import { z } from "zod";

const ParsedCartItemSchema = z.object({
  sourceUrl: z.string().url(),
  title: z.string().min(1).max(300),
  priceKrw: z.number().int().positive(),
  imageUrl: z.string().url().optional(),
  vendor: z.string().max(50).optional(),
  quantity: z.number().int().positive().default(1),
  optionsNote: z.string().max(500).optional(),
});

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

  /**
   * Bookmarklet endpoint. The browser already extracted the product info on
   * the vendor site (bypassing bot detection), so we accept the parsed
   * payload directly instead of re-fetching the URL on the backend.
   */
  @Post("parsed")
  addParsed(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidate(ParsedCartItemSchema))
    body: z.infer<typeof ParsedCartItemSchema>,
  ) {
    return this.cart.addParsed(user.userId, body);
  }

  @Delete(":id")
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.cart.remove(user.userId, id);
  }
}
