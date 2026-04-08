import { Injectable } from "@nestjs/common";
import type { PaymentGateway } from "./payment-gateway.interface";

export const MOCK_GATEWAY = Symbol("MOCK_GATEWAY");

/**
 * Always-succeeds in-memory PG. Generates fake provider refs so order flow
 * works end-to-end in dev. Replace at the DI binding in `payments.module.ts`
 * with a real adapter (Portone/Eximbay) when credentials are available.
 */
@Injectable()
export class MockGateway implements PaymentGateway {
  async preAuthorize({ orderId }: { orderId: string; amountKrw: number }) {
    return { providerRef: `mock_auth_${orderId}_${Date.now()}` };
  }
  async capture({ providerRef }: { providerRef: string; amountKrw: number }) {
    return { providerRef: providerRef.replace("auth", "cap") };
  }
  async refund({ providerRef }: { providerRef: string; amountKrw: number }) {
    return { providerRef: providerRef.replace("cap", "ref") };
  }
}
