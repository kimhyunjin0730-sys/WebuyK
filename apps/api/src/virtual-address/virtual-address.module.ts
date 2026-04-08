import { Module } from "@nestjs/common";
import { VirtualAddressController } from "./virtual-address.controller";

@Module({
  controllers: [VirtualAddressController],
})
export class VirtualAddressModule {}
