import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ProductsService } from "./products.service";
import { ZodValidate } from "../common/zod.pipe";
import { ParseUrlSchema } from "@wbk/shared";

@Controller("products")
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list() {
    return this.products.list();
  }

  @UseGuards(JwtAuthGuard)
  @Post("parse")
  parse(@Body(new ZodValidate(ParseUrlSchema)) body: { url: string }) {
    return this.products.ingestByUrl(body.url);
  }
}
