import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { VirtualAddressModule } from "./virtual-address/virtual-address.module";
import { ProductsModule } from "./products/products.module";
import { CartModule } from "./cart/cart.module";
import { OrdersModule } from "./orders/orders.module";
import { PaymentsModule } from "./payments/payments.module";
import { WarehouseModule } from "./warehouse/warehouse.module";
import { AdminModule } from "./admin/admin.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    VirtualAddressModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    WarehouseModule,
    AdminModule,
  ],
})
export class AppModule {}
