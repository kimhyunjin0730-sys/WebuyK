// Re-exports the shared fee engine so the API depends on a single
// computation function — the same module the web client imports for
// real-time previews. Do NOT fork the formula here.
export { computeFee, sumFees, FEE_CONFIG } from "@wbk/shared";
export type { FeeBreakdown, DeliveryMode } from "@wbk/shared";
