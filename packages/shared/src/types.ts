export type Role = "USER" | "ADMIN";

export type DeliveryMode = "PICKUP" | "FORWARD";

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PURCHASING"
  | "AWAITING_INBOUND"
  | "INSPECTING"
  | "READY_FOR_PICKUP"
  | "FORWARDED"
  | "COMPLETED"
  | "CANCELED";

export type PickupLocation = "ICN_T1" | "ICN_T2" | "SEOUL_STATION";

export interface ParsedProduct {
  sourceUrl: string;
  vendor: string;
  title: string;
  imageUrl?: string;
  priceKrw: number;
  options?: Record<string, string>;
}

export interface FeeBreakdown {
  itemPriceKrw: number;
  handlingChargeKrw: number;
  surchargeKrw: number;
  shippingKrw: number;
  totalKrw: number;
}
