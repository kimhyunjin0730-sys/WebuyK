import { Module } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { ProductsController } from "./products.controller";
import { ProductParser } from "./product-parser";
import { VisionParser } from "./vision-parser";

@Module({
  providers: [ProductsService, ProductParser, VisionParser],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
