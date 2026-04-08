import { PrismaClient, OrderStatus, DeliveryMode } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateMailboxNo } from "../src/virtual-address/mailbox.util";
import { computeFee } from "@wbk/shared";

const prisma = new PrismaClient();

const VIRTUAL_ADDRESS = {
  line1: "We buy K Bonded Hub, 12 Gonghang-ro 296beon-gil",
  line2: "Bldg C, Dock 4",
  city: "Incheon",
  postal: "22382",
};

async function upsertUser(opts: {
  email: string;
  password?: string;
  displayName: string;
  role: "USER" | "ADMIN";
  countryCode?: string;
}) {
  const passwordHash = opts.password ? await bcrypt.hash(opts.password, 10) : null;
  return prisma.user.upsert({
    where: { email: opts.email },
    update: {},
    create: {
      email: opts.email,
      passwordHash,
      displayName: opts.displayName,
      role: opts.role,
      countryCode: opts.countryCode ?? (opts.role === "ADMIN" ? "KR" : "US"),
    },
  });
}

async function ensureVirtualAddress(userId: string) {
  const existing = await prisma.virtualAddress.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.virtualAddress.create({
    data: { userId, mailboxNo: generateMailboxNo(), ...VIRTUAL_ADDRESS },
  });
}

async function main() {
  // ---------- Users ----------
  const admin = await upsertUser({
    email: "admin@wbk.test",
    password: "admin1234",
    displayName: "WBK Admin",
    role: "ADMIN",
  });
  const demo = await upsertUser({
    email: "demo@wbk.test",
    password: "demo1234",
    displayName: "Demo Buyer",
    role: "USER",
  });
  // Pre-existing OAuth-only test users so the mock OAuth buttons resolve to
  // accounts that already have history attached.
  const googleUser = await upsertUser({
    email: "google-test@wbk.test",
    displayName: "Google Test User",
    role: "USER",
  });
  const kakaoUser = await upsertUser({
    email: "kakao-test@wbk.test",
    displayName: "Kakao Test User",
    role: "USER",
    countryCode: "KR",
  });

  for (const user of [admin, demo, googleUser, kakaoUser]) {
    await ensureVirtualAddress(user.id);
  }

  // Pre-link the mock OAuth identities so the first click on the test
  // button resolves the same row that the mock controller would create.
  for (const [provider, user] of [
    ["google", googleUser],
    ["kakao", kakaoUser],
  ] as const) {
    await prisma.oAuthAccount.upsert({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: `mock-${provider}-${user.email}`,
        },
      },
      update: {},
      create: {
        userId: user.id,
        provider,
        providerAccountId: `mock-${provider}-${user.email}`,
      },
    });
  }

  // ---------- Catalog ----------
  const sampleProducts = [
    {
      sourceUrl: "https://www.coupang.com/vp/products/seed-1",
      vendor: "Coupang",
      title: "Laneige Lip Sleeping Mask 20g",
      priceKrw: 18_900,
    },
    {
      sourceUrl: "https://shopping.naver.com/seed-2",
      vendor: "Naver",
      title: "BTS Official Photobook (Limited)",
      priceKrw: 64_000,
    },
    {
      sourceUrl: "https://www.gmarket.co.kr/seed-3",
      vendor: "Gmarket",
      title: "Samyang Buldak Ramen 5-pack",
      priceKrw: 8_400,
    },
    {
      sourceUrl: "https://kream.co.kr/seed-4",
      vendor: "Kream",
      title: "Stray Kids Album Set",
      priceKrw: 124_000,
    },
  ];

  const products = [];
  for (const p of sampleProducts) {
    const row = await prisma.product.upsert({
      where: { sourceUrl: p.sourceUrl },
      update: {},
      create: { ...p, imageUrl: null, rawJson: JSON.stringify(p) },
    });
    products.push(row);
  }

  // ---------- Sample orders for the demo buyer ----------
  // One per status so the orders / admin pages light up immediately.
  await prisma.order.deleteMany({ where: { userId: demo.id } });

  const samples: Array<{
    status: OrderStatus;
    deliveryMode: DeliveryMode;
    productIdx: number;
  }> = [
    { status: "PENDING_PAYMENT", deliveryMode: "PICKUP", productIdx: 0 },
    { status: "AWAITING_INBOUND", deliveryMode: "PICKUP", productIdx: 1 },
    { status: "INSPECTING", deliveryMode: "PICKUP", productIdx: 2 },
    { status: "READY_FOR_PICKUP", deliveryMode: "PICKUP", productIdx: 3 },
    { status: "COMPLETED", deliveryMode: "FORWARD", productIdx: 0 },
  ];

  for (const s of samples) {
    const product = products[s.productIdx];
    const fee = computeFee(product.priceKrw, s.deliveryMode);
    const order = await prisma.order.create({
      data: {
        userId: demo.id,
        status: s.status,
        deliveryMode: s.deliveryMode,
        pickupLocation: s.deliveryMode === "PICKUP" ? "ICN_T1" : null,
        forwardJson:
          s.deliveryMode === "FORWARD"
            ? JSON.stringify({
                name: "Demo Buyer",
                line1: "1 Demo Street",
                city: "Demo City",
                country: "US",
                postalCode: "00000",
                phone: "+10000000000",
              })
            : null,
        itemTotalKrw: fee.itemPriceKrw,
        handlingKrw: fee.handlingChargeKrw,
        surchargeKrw: fee.surchargeKrw,
        shippingKrw: fee.shippingKrw,
        totalKrw: fee.totalKrw,
        items: {
          create: [
            {
              productId: product.id,
              quantity: 1,
              unitPriceKrw: product.priceKrw,
            },
          ],
        },
        payments: {
          create:
            s.status === "PENDING_PAYMENT"
              ? []
              : [
                  {
                    provider: "mock",
                    providerRef: `mock_seed_${s.status.toLowerCase()}`,
                    amountKrw: fee.totalKrw,
                    status: s.status === "COMPLETED" ? "CAPTURED" : "PRE_AUTHORIZED",
                  },
                ],
        },
      },
    });

    if (s.status === "INSPECTING" || s.status === "READY_FOR_PICKUP" || s.status === "COMPLETED") {
      await prisma.shipment.create({
        data: {
          orderId: order.id,
          trackingNo: `SEED-TRK-${order.id.slice(-6)}`,
          carrier: "CJ",
          receivedAt: new Date(),
        },
      });
    }
    if (s.status === "READY_FOR_PICKUP" || s.status === "COMPLETED") {
      await prisma.inspection.create({
        data: {
          orderId: order.id,
          photoUrl: "https://placehold.co/400x300?text=inspection",
          notes: "Looks good — sealed package.",
        },
      });
    }
  }

  console.log("✔ seed complete");
  console.log("  Email accounts:");
  console.log("    admin@wbk.test / admin1234   (ADMIN)");
  console.log("    demo@wbk.test  / demo1234    (USER, has 5 sample orders)");
  console.log("  Mock-OAuth accounts (click 'Continue with Google/Kakao'):");
  console.log("    google-test@wbk.test         (USER)");
  console.log("    kakao-test@wbk.test          (USER)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
