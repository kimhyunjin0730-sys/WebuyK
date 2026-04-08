/**
 * PG adapter contract — Phase 5.
 *
 * Implement this interface for each provider (Portone, Eximbay…) so the rest
 * of the system stays vendor-agnostic. The mock implementation lives in
 * `mock.gateway.ts` and is wired in `payments.module.ts`.
 *
 * Implementation notes for the production adapter:
 *  - `preAuthorize` should reserve funds without capture so cancellations
 *    incur no fees. Return the provider's authorization id.
 *  - `capture` is called after pickup confirmation OR after the no-show
 *    timer fires (auto-charge for forced forwarding). The IMPORTANT block
 *    in the implementation plan applies here — the timer + capture flow
 *    must be reviewed with the PG before launch.
 */
export interface PaymentGateway {
  preAuthorize(opts: {
    orderId: string;
    amountKrw: number;
  }): Promise<{ providerRef: string }>;

  capture(opts: {
    providerRef: string;
    amountKrw: number;
  }): Promise<{ providerRef: string }>;

  refund(opts: {
    providerRef: string;
    amountKrw: number;
  }): Promise<{ providerRef: string }>;
}
