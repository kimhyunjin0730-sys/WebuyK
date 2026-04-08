"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { DeliveryMode, FeeBreakdown } from "@wbk/shared";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { formatKrw } from "@/lib/format";

interface CartLine {
  id: string;
  quantity: number;
  optionsNote?: string | null;
  product: { id: string; title: string; vendor: string; priceKrw: number };
  lineTotal: number;
  fee: FeeBreakdown;
}

interface CartResponse {
  items: CartLine[];
  totals: FeeBreakdown;
  mode: DeliveryMode;
}

export default function CartPage() {
  const t = useTranslations("cart");
  const locale = useLocale();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<DeliveryMode>("PICKUP");
  const [data, setData] = useState<CartResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(
    async (m: DeliveryMode) => {
      try {
        const res = await api<CartResponse>(`/cart?mode=${m}`);
        setData(res);
      } catch (err: any) {
        setError(err.message);
      }
    },
    [],
  );

  useEffect(() => {
    if (user) refresh(mode);
  }, [user, mode, refresh]);

  const remove = async (id: string) => {
    await api(`/cart/${id}`, { method: "DELETE" });
    refresh(mode);
  };

  const checkout = async () => {
    if (!data || data.items.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await api("/orders", {
        method: "POST",
        body: JSON.stringify({
          deliveryMode: mode,
          pickupLocation: mode === "PICKUP" ? "ICN_T1" : undefined,
          forwardAddress:
            mode === "FORWARD"
              ? {
                  name: user?.displayName ?? "Buyer",
                  line1: "1 Demo Street",
                  city: "Demo City",
                  country: "US",
                  postalCode: "00000",
                  phone: "+10000000000",
                }
              : undefined,
        }),
      });
      router.push(`/${locale}/orders`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p>Loading…</p>;
  if (!user) return <p>Please sign in.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <div className="card flex items-center gap-4">
        <span className="text-sm font-medium">{t("mode")}:</span>
        <button
          onClick={() => setMode("PICKUP")}
          className={`rounded px-3 py-1.5 text-sm ${mode === "PICKUP" ? "bg-brand text-white" : "border border-slate-300"}`}
        >
          {t("modePickup")}
        </button>
        <button
          onClick={() => setMode("FORWARD")}
          className={`rounded px-3 py-1.5 text-sm ${mode === "FORWARD" ? "bg-brand text-white" : "border border-slate-300"}`}
        >
          {t("modeForward")}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!data || data.items.length === 0 ? (
        <p className="card text-slate-500">{t("empty")}</p>
      ) : (
        <>
          <div className="card divide-y divide-slate-200">
            {data.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <div className="flex-1">
                  <div className="font-medium">{item.product.title}</div>
                  <div className="text-xs text-slate-500">
                    {item.product.vendor} · {formatKrw(item.product.priceKrw)} × {item.quantity}
                  </div>
                </div>
                <div className="text-sm font-mono">{formatKrw(item.fee.totalKrw)}</div>
                <button
                  onClick={() => remove(item.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="card space-y-1 text-sm">
            <Row label={t("itemTotal")} value={formatKrw(data.totals.itemPriceKrw)} />
            <Row label={t("handling")} value={formatKrw(data.totals.handlingChargeKrw)} />
            <Row label={t("surcharge")} value={formatKrw(data.totals.surchargeKrw)} />
            <Row label={t("shipping")} value={formatKrw(data.totals.shippingKrw)} />
            <hr className="my-2" />
            <Row label={t("total")} value={formatKrw(data.totals.totalKrw)} bold />
            <button
              onClick={checkout}
              disabled={busy}
              className="btn-primary mt-4 w-full"
            >
              {busy ? "…" : t("checkout")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-semibold" : ""}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
