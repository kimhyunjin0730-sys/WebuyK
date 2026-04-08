import type { FeeBreakdown, DeliveryMode } from "./types";
export type { DeliveryMode };

// Single source of truth for fees. Re-exported by API + Web so the cart UI
// always agrees with what the backend will charge.
export const FEE_CONFIG = {
  HANDLING_RATE: 0.08, // 8 % of item price
  MIN_HANDLING_KRW: 3_000,
  SURCHARGE_RATE: 0.035, // FX + card + inspection risk buffer
  PICKUP_FLAT_KRW: 0,
  FORWARD_BASE_KRW: 18_000, // baseline international shipping
  FORWARD_PER_10K_KRW: 1_500, // grows with item value (insurance proxy)
} as const;

export function computeFee(
  itemPriceKrw: number,
  mode: DeliveryMode,
): FeeBreakdown {
  if (!Number.isFinite(itemPriceKrw) || itemPriceKrw < 0) {
    throw new Error("itemPriceKrw must be a non-negative finite number");
  }
  const handlingChargeKrw = Math.max(
    FEE_CONFIG.MIN_HANDLING_KRW,
    Math.round(itemPriceKrw * FEE_CONFIG.HANDLING_RATE),
  );
  const surchargeKrw = Math.round(itemPriceKrw * FEE_CONFIG.SURCHARGE_RATE);
  const shippingKrw =
    mode === "PICKUP"
      ? FEE_CONFIG.PICKUP_FLAT_KRW
      : FEE_CONFIG.FORWARD_BASE_KRW +
        Math.floor(itemPriceKrw / 10_000) * FEE_CONFIG.FORWARD_PER_10K_KRW;
  const totalKrw =
    itemPriceKrw + handlingChargeKrw + surchargeKrw + shippingKrw;
  return {
    itemPriceKrw,
    handlingChargeKrw,
    surchargeKrw,
    shippingKrw,
    totalKrw,
  };
}

export function sumFees(breakdowns: FeeBreakdown[]): FeeBreakdown {
  return breakdowns.reduce<FeeBreakdown>(
    (acc, b) => ({
      itemPriceKrw: acc.itemPriceKrw + b.itemPriceKrw,
      handlingChargeKrw: acc.handlingChargeKrw + b.handlingChargeKrw,
      surchargeKrw: acc.surchargeKrw + b.surchargeKrw,
      shippingKrw: acc.shippingKrw + b.shippingKrw,
      totalKrw: acc.totalKrw + b.totalKrw,
    }),
    {
      itemPriceKrw: 0,
      handlingChargeKrw: 0,
      surchargeKrw: 0,
      shippingKrw: 0,
      totalKrw: 0,
    },
  );
}
