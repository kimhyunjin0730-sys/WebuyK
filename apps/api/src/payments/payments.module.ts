import { Module } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { MOCK_GATEWAY, MockGateway } from "./mock.gateway";

@Module({
  providers: [
    PaymentsService,
    { provide: MOCK_GATEWAY, useClass: MockGateway },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
