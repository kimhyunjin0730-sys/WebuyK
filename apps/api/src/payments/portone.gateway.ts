import { Injectable, Logger } from "@nestjs/common";
import type { PaymentGateway } from "./payment-gateway.interface";

export const PORTONE_GATEWAY = Symbol("PORTONE_GATEWAY");

const PORTONE_BASE = "https://api.iamport.kr";

/**
 * Portone (I'mport) v1 REST adapter.
 *
 * Honest mapping of our PaymentGateway contract onto Portone v1:
 *  - preAuthorize → /payments/prepare. Portone v1 has no true card "hold";
 *    prepare reserves an expected (merchant_uid, amount) pair so that the
 *    frontend IMP.request_pay call can only succeed for that exact amount.
 *    The actual charge happens client-side after the user confirms.
 *  - capture → /payments/{imp_uid} verification. We trust the frontend has
 *    already triggered payment and we just confirm the server-side state.
 *    `providerRef` here is the imp_uid produced by Portone after frontend pay.
 *  - refund → /payments/cancel.
 *
 * The "no-show auto-charge" flow described in the implementation plan
 * REQUIRES billing keys (정기결제). That is a separate Portone product and
 * needs the user to enable subscription billing on the merchant account.
 * See `noShowAutoCharge` TODO at the bottom of this file.
 */
@Injectable()
export class PortoneGateway implements PaymentGateway {
  private readonly logger = new Logger(PortoneGateway.name);
  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly apiSecret: string,
  ) {}

  private async getToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt - 60_000 > now) {
      return this.cachedToken.value;
    }
    const res = await fetch(`${PORTONE_BASE}/users/getToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imp_key: this.apiKey,
        imp_secret: this.apiSecret,
      }),
    });
    const json = (await res.json()) as {
      code: number;
      message: string;
      response: { access_token: string; expired_at: number } | null;
    };
    if (json.code !== 0 || !json.response) {
      throw new Error(`Portone getToken failed: ${json.message}`);
    }
    this.cachedToken = {
      value: json.response.access_token,
      expiresAt: json.response.expired_at * 1000,
    };
    return this.cachedToken.value;
  }

  private async authedFetch(path: string, body: unknown) {
    const token = await this.getToken();
    const res = await fetch(`${PORTONE_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify(body),
    });
    return (await res.json()) as { code: number; message: string; response: unknown };
  }

  async preAuthorize({ orderId, amountKrw }: { orderId: string; amountKrw: number }) {
    const result = await this.authedFetch("/payments/prepare", {
      merchant_uid: orderId,
      amount: amountKrw,
    });
    if (result.code !== 0) {
      throw new Error(`Portone prepare failed: ${result.message}`);
    }
    // For v1 there is no auth-id at this stage. We use merchant_uid as the
    // ref and let `capture` swap it for imp_uid once the frontend pays.
    return { providerRef: orderId };
  }

  async capture({ providerRef }: { providerRef: string; amountKrw: number }) {
    // `providerRef` here MUST be imp_uid passed in from the frontend webhook
    // (or polled by the controller). If it still looks like a merchant_uid we
    // refuse to claim a successful capture.
    if (!providerRef.startsWith("imp_")) {
      throw new Error(
        `Portone capture requires imp_uid as providerRef (got ${providerRef}). ` +
          `Pass the value returned by IMP.request_pay before calling capture.`,
      );
    }
    const token = await this.getToken();
    const res = await fetch(`${PORTONE_BASE}/payments/${providerRef}`, {
      headers: { Authorization: token },
    });
    const json = (await res.json()) as {
      code: number;
      message: string;
      response: { status: string; amount: number } | null;
    };
    if (json.code !== 0 || !json.response) {
      throw new Error(`Portone verify failed: ${json.message}`);
    }
    if (json.response.status !== "paid") {
      throw new Error(`Portone payment not in paid state: ${json.response.status}`);
    }
    return { providerRef };
  }

  async refund({ providerRef, amountKrw }: { providerRef: string; amountKrw: number }) {
    const result = await this.authedFetch("/payments/cancel", {
      imp_uid: providerRef.startsWith("imp_") ? providerRef : undefined,
      merchant_uid: providerRef.startsWith("imp_") ? undefined : providerRef,
      amount: amountKrw,
      reason: "We buy K refund",
    });
    if (result.code !== 0) {
      throw new Error(`Portone cancel failed: ${result.message}`);
    }
    return { providerRef };
  }

  // TODO(no-show auto-charge): Portone billing keys (정기결제) are required to
  // charge a stored card without user interaction when a customer fails to
  // pick up. Enable 빌링키 발급 on the merchant account, persist the billing
  // key on User after first checkout, then add a `chargeStored(billingKey,
  // amountKrw)` method that POSTs to /subscribe/payments/again. Per the
  // implementation plan this MUST be reviewed with Portone before launch.
}
