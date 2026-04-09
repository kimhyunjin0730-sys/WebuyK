import { Logger, Module } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { MOCK_GATEWAY, MockGateway } from "./mock.gateway";
import { PortoneGateway } from "./portone.gateway";

/**
 * Gateway selection: if PORTONE_API_KEY + PORTONE_API_SECRET are set we use
 * the real Portone adapter, otherwise we fall back to the in-memory mock so
 * local dev / smoke tests / CI keep working without credentials.
 */
const gatewayProvider = {
  provide: MOCK_GATEWAY,
  useFactory: () => {
    const key = process.env.PORTONE_API_KEY;
    const secret = process.env.PORTONE_API_SECRET;
    if (key && secret) {
      Logger.log("Using PortoneGateway (live)", "PaymentsModule");
      return new PortoneGateway(key, secret);
    }
    Logger.warn("PORTONE_API_KEY missing — falling back to MockGateway", "PaymentsModule");
    return new MockGateway();
  },
};

@Module({
  providers: [PaymentsService, gatewayProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
