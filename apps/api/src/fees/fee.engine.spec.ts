import { computeFee, sumFees, FEE_CONFIG } from "@wbk/shared";

describe("computeFee", () => {
  it("applies minimum handling for cheap items", () => {
    const fee = computeFee(10_000, "PICKUP");
    // 10_000 * 0.08 = 800 → bumped up to MIN_HANDLING (3_000)
    expect(fee.handlingChargeKrw).toBe(FEE_CONFIG.MIN_HANDLING_KRW);
    expect(fee.shippingKrw).toBe(0);
    expect(fee.totalKrw).toBe(
      10_000 + FEE_CONFIG.MIN_HANDLING_KRW + Math.round(10_000 * FEE_CONFIG.SURCHARGE_RATE),
    );
  });

  it("uses percentage handling above the floor", () => {
    const fee = computeFee(100_000, "PICKUP");
    expect(fee.handlingChargeKrw).toBe(8_000); // 100_000 * 0.08
    expect(fee.surchargeKrw).toBe(3_500); // 100_000 * 0.035
  });

  it("adds international shipping for FORWARD mode", () => {
    const fee = computeFee(50_000, "FORWARD");
    // base 18_000 + (50_000/10_000)*1500 = 18_000 + 7_500 = 25_500
    expect(fee.shippingKrw).toBe(25_500);
    expect(fee.totalKrw).toBeGreaterThan(50_000);
  });

  it("rejects negative input", () => {
    expect(() => computeFee(-1, "PICKUP")).toThrow();
  });
});

describe("sumFees", () => {
  it("aggregates breakdowns line by line", () => {
    const a = computeFee(20_000, "PICKUP");
    const b = computeFee(30_000, "PICKUP");
    const total = sumFees([a, b]);
    expect(total.itemPriceKrw).toBe(50_000);
    expect(total.totalKrw).toBe(a.totalKrw + b.totalKrw);
  });
});
