/**
 * We buy K — End-to-end smoke test (no DB, no Nest, no Next).
 *
 * Exercises the real domain logic from `packages/shared` plus an in-memory
 * port of the order state machine, virtual mailbox issuer, and external-mall
 * product parser. This is the simplest "real test" of Phase 1–5 of the
 * Technical Implementation Plan that runs without installing any dependencies.
 *
 * Run with:
 *   node --experimental-strip-types scripts/smoke.ts
 *
 * Node ≥ 22.6 is required (uses built-in TypeScript stripping).
 */

import {
  computeFee,
  sumFees,
  FEE_CONFIG,
  type DeliveryMode,
  type FeeBreakdown,
  type ParsedProduct,
} from "../packages/shared/src/fees.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Pretty printing
// ─────────────────────────────────────────────────────────────────────────────
const KRW = (n: number) => `₩${n.toLocaleString("ko-KR")}`;
const step = (n: number, label: string) =>
  console.log(`\n\x1b[36m▌ Step ${n}.\x1b[0m \x1b[1m${label}\x1b[0m`);
const ok = (msg: string) => console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
const info = (msg: string) => console.log(`  · ${msg}`);

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 — Virtual Address Logic (mailbox issuer)
// Ports apps/api/src/virtual-address/mailbox.util.ts
// ─────────────────────────────────────────────────────────────────────────────
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function generateMailboxNo(length = 4): string {
  let s = "";
  for (let i = 0; i < length; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `WBK-${s}`;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  countryCode: string;
  mailboxNo: string;
  homeAddress?: { line1: string; city: string; country: string };
}

let userSeq = 0;
function signup(
  email: string,
  displayName: string,
  countryCode: string,
): User {
  return {
    id: `usr_${++userSeq}`,
    email,
    displayName,
    countryCode,
    mailboxNo: generateMailboxNo(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 — External-mall product parser (deterministic mock)
// Ports apps/api/src/products/product-parser.ts
// ─────────────────────────────────────────────────────────────────────────────
const TITLES = [
  "Laneige Lip Sleeping Mask",
  "Innisfree Green Tea Serum",
  "BTS Photobook (Limited)",
  "Stray Kids Album Set",
  "Korean Beef Jerky 200g",
  "Samyang Buldak Ramen 5-pack",
  "Kakao Friends Plush",
  "Etude House Eyeshadow Palette",
];
function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h | 0);
}
function detectVendor(host: string): string | null {
  const h = host.toLowerCase();
  if (h.includes("coupang")) return "Coupang";
  if (h.includes("naver")) return "Naver";
  if (h.includes("gmarket")) return "Gmarket";
  if (h.includes("11st")) return "11st";
  if (h.includes("kream")) return "Kream";
  return null;
}
function parseProduct(rawUrl: string): ParsedProduct {
  const url = new URL(rawUrl);
  const vendor = detectVendor(url.hostname);
  if (!vendor) throw new Error(`Unsupported vendor: ${url.hostname}`);
  const seed = fnv1a(rawUrl);
  const priceKrw = 5_000 + (seed % 95) * 1_000;
  return {
    sourceUrl: rawUrl,
    vendor,
    title: `${TITLES[seed % TITLES.length]} (${vendor})`,
    priceKrw,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3/4/5 — Order state machine
// ─────────────────────────────────────────────────────────────────────────────
type OrderStatus =
  | "PENDING_PAYMENT"
  | "PURCHASING"
  | "AWAITING_INBOUND"
  | "INSPECTING"
  | "READY_FOR_PICKUP"
  | "FORWARDED"
  | "COMPLETED"
  | "CANCELED";

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT:   ["PURCHASING", "CANCELED"],
  PURCHASING:        ["AWAITING_INBOUND", "CANCELED"],
  AWAITING_INBOUND:  ["INSPECTING", "CANCELED"],
  INSPECTING:        ["READY_FOR_PICKUP", "FORWARDED", "CANCELED"],
  READY_FOR_PICKUP:  ["COMPLETED", "FORWARDED"],
  FORWARDED:         ["COMPLETED"],
  COMPLETED:         [],
  CANCELED:          [],
};

interface CartItem {
  product: ParsedProduct;
  quantity: number;
}
interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  deliveryMode: DeliveryMode;
  status: OrderStatus;
  total: FeeBreakdown;
  history: { at: string; from: OrderStatus | null; to: OrderStatus }[];
  trackingNo?: string;
  inspectionPhotoUrl?: string;
  paid: boolean;
}

let orderSeq = 0;
function placeOrder(
  user: User,
  items: CartItem[],
  deliveryMode: DeliveryMode,
): Order {
  const breakdowns = items.map((it) =>
    computeFee(it.product.priceKrw * it.quantity, deliveryMode),
  );
  const total = sumFees(breakdowns);
  const order: Order = {
    id: `ord_${++orderSeq}`,
    userId: user.id,
    items,
    deliveryMode,
    status: "PENDING_PAYMENT",
    total,
    history: [{ at: new Date().toISOString(), from: null, to: "PENDING_PAYMENT" }],
    paid: false,
  };
  return order;
}

function transition(order: Order, to: OrderStatus): void {
  const allowed = TRANSITIONS[order.status];
  if (!allowed.includes(to)) {
    throw new Error(
      `Illegal transition: ${order.status} → ${to} (allowed: ${allowed.join(", ") || "none"})`,
    );
  }
  order.history.push({ at: new Date().toISOString(), from: order.status, to });
  order.status = to;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 5 — Mock payment gateway
// Mirrors apps/api/src/payments/mock.gateway.ts intent
// ─────────────────────────────────────────────────────────────────────────────
interface PaymentResult { txId: string; amountKrw: number; capturedAt: string }
function chargeCard(order: Order): PaymentResult {
  if (order.paid) throw new Error("already paid");
  const res: PaymentResult = {
    txId: `pg_${Math.random().toString(36).slice(2, 10)}`,
    amountKrw: order.total.totalKrw,
    capturedAt: new Date().toISOString(),
  };
  order.paid = true;
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4 — Warehouse: match an inbound parcel to a customer mailbox
// ─────────────────────────────────────────────────────────────────────────────
interface InboundParcel {
  trackingNo: string;
  recipientLine: string; // free text on the box label
  weightKg: number;
}
function matchInbound(parcel: InboundParcel, users: User[]): User | null {
  const m = parcel.recipientLine.match(/WBK-[2-9A-HJ-NP-Z]{4}/);
  if (!m) return null;
  return users.find((u) => u.mailboxNo === m[0]) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Assertions (homemade — keeps the script dependency-free)
// ─────────────────────────────────────────────────────────────────────────────
let pass = 0;
let fail = 0;
function assert(cond: boolean, label: string) {
  if (cond) { pass++; ok(label); }
  else { fail++; console.log(`  \x1b[31m✗\x1b[0m ${label}`); }
}
function assertEq<T>(actual: T, expected: T, label: string) {
  assert(actual === expected, `${label}  (got ${String(actual)}, expected ${String(expected)})`);
}
function assertThrows(fn: () => unknown, label: string) {
  try { fn(); fail++; console.log(`  \x1b[31m✗\x1b[0m ${label} (did not throw)`); }
  catch { pass++; ok(label); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Run the scenario
// ─────────────────────────────────────────────────────────────────────────────
console.log("\x1b[1m🛒 We buy K — domain smoke test\x1b[0m");
console.log(`fee config: handling=${FEE_CONFIG.HANDLING_RATE * 100}% (min ${KRW(FEE_CONFIG.MIN_HANDLING_KRW)}), surcharge=${FEE_CONFIG.SURCHARGE_RATE * 100}%, fwd base=${KRW(FEE_CONFIG.FORWARD_BASE_KRW)}`);

step(1, "Phase 2 — Signup & virtual mailbox issuance");
const alice = signup("alice@example.com", "Alice", "US");
const bob   = signup("bob@example.com",   "Bob",   "JP");
info(`Alice → ${alice.mailboxNo}`);
info(`Bob   → ${bob.mailboxNo}`);
assert(/^WBK-[2-9A-HJ-NP-Z]{4}$/.test(alice.mailboxNo), "mailbox follows WBK-XXXX format with safe charset");
assert(alice.mailboxNo !== bob.mailboxNo, "two users get distinct mailboxes");

step(2, "Phase 3 — Parse products from external-mall URLs");
const p1 = parseProduct("https://www.coupang.com/vp/products/12345");
const p2 = parseProduct("https://shopping.naver.com/catalog/9876");
info(`${p1.vendor}: ${p1.title} — ${KRW(p1.priceKrw)}`);
info(`${p2.vendor}: ${p2.title} — ${KRW(p2.priceKrw)}`);
assertEq(p1.vendor, "Coupang", "detects Coupang vendor");
assertEq(p2.vendor, "Naver",   "detects Naver vendor");
assertThrows(() => parseProduct("https://amazon.com/dp/B000"), "rejects unsupported vendor");
assertThrows(() => parseProduct("not a url"), "rejects malformed URL");
assertEq(parseProduct(p1.sourceUrl).priceKrw, p1.priceKrw, "parser is deterministic for same URL");

step(3, "Phase 3 — Cart fee computation (PICKUP)");
const cart: CartItem[] = [
  { product: p1, quantity: 2 },
  { product: p2, quantity: 1 },
];
const pickupOrder = placeOrder(alice, cart, "PICKUP");
const expectedItem = p1.priceKrw * 2 + p2.priceKrw;
info(`items=${KRW(pickupOrder.total.itemPriceKrw)} handling=${KRW(pickupOrder.total.handlingChargeKrw)} surcharge=${KRW(pickupOrder.total.surchargeKrw)} ship=${KRW(pickupOrder.total.shippingKrw)}`);
info(`TOTAL → ${KRW(pickupOrder.total.totalKrw)}`);
assertEq(pickupOrder.total.itemPriceKrw, expectedItem, "items aggregated correctly across cart");
assertEq(pickupOrder.total.shippingKrw, 0, "PICKUP mode has zero shipping");
assert(pickupOrder.total.totalKrw > expectedItem, "total includes handling + surcharge");

step(4, "Phase 3 — Same cart in FORWARD mode adds international shipping");
const fwdOrder = placeOrder(alice, cart, "FORWARD");
info(`FWD shipping=${KRW(fwdOrder.total.shippingKrw)}, total=${KRW(fwdOrder.total.totalKrw)}`);
assert(fwdOrder.total.shippingKrw > 0, "FORWARD has non-zero shipping");
assert(fwdOrder.total.totalKrw > pickupOrder.total.totalKrw, "FORWARD costs more than PICKUP");

step(5, "Phase 5 — Charge card via mock PG");
const tx = chargeCard(pickupOrder);
info(`payment ${tx.txId} captured ${KRW(tx.amountKrw)}`);
transition(pickupOrder, "PURCHASING");
assertEq(pickupOrder.paid, true, "order marked as paid");
assertEq(tx.amountKrw, pickupOrder.total.totalKrw, "captured amount matches order total");
assertThrows(() => chargeCard(pickupOrder), "double-charge prevented");

step(6, "Phase 3→4 — Buyer fulfilled the proxy purchase (status: PURCHASING)");
assertEq(pickupOrder.status, "PURCHASING", "moved to PURCHASING after capture");
transition(pickupOrder, "AWAITING_INBOUND");
assertEq(pickupOrder.status, "AWAITING_INBOUND", "now waiting for warehouse inbound");

step(7, "Phase 4 — Warehouse receives a parcel and matches to mailbox");
const parcel: InboundParcel = {
  trackingNo: "CJ1234567890",
  recipientLine: `We buy K  c/o ${alice.mailboxNo}  / Incheon`,
  weightKg: 0.6,
};
const matched = matchInbound(parcel, [alice, bob]);
info(`parcel ${parcel.trackingNo} → matched user ${matched?.email}`);
assert(matched?.id === alice.id, "parcel routed to the right customer by mailbox#");
pickupOrder.trackingNo = parcel.trackingNo;
transition(pickupOrder, "INSPECTING");

step(8, "Phase 4 — Inspector uploads photo, marks ready for pickup");
pickupOrder.inspectionPhotoUrl = "https://cdn.wbk.test/inspect/" + pickupOrder.id + ".jpg";
transition(pickupOrder, "READY_FOR_PICKUP");
info(`inspection photo: ${pickupOrder.inspectionPhotoUrl}`);
assertEq(pickupOrder.status, "READY_FOR_PICKUP", "ready for airport pickup");

step(9, "Phase 4 — Customer picks up at ICN, order completes");
transition(pickupOrder, "COMPLETED");
assertEq(pickupOrder.status, "COMPLETED", "fulfillment complete");

step(10, "State machine — illegal transitions are rejected");
const bad = placeOrder(bob, [{ product: p1, quantity: 1 }], "FORWARD");
assertThrows(() => transition(bad, "COMPLETED"), "PENDING_PAYMENT → COMPLETED blocked");
transition(bad, "CANCELED");
assertThrows(() => transition(bad, "PURCHASING"), "CANCELED is terminal");

step(11, "Audit — show full history of Alice's order");
for (const h of pickupOrder.history) {
  info(`${h.at}  ${h.from ?? "∅"} → ${h.to}`);
}
assert(pickupOrder.history.length === 6, "6 transitions recorded for the happy path");

// ─────────────────────────────────────────────────────────────────────────────
console.log(
  `\n${fail === 0 ? "\x1b[32m" : "\x1b[31m"}══ ${pass} passed, ${fail} failed ══\x1b[0m`,
);
process.exit(fail === 0 ? 0 : 1);
