"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Bookmark, Link2, ShoppingCart, Trash2 } from "lucide-react";
import type { DeliveryMode, FeeBreakdown } from "@wbk/shared";
import { api, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";
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
  const toast = useToast();
  const [mode, setMode] = useState<DeliveryMode>("PICKUP");
  const [data, setData] = useState<CartResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(
    async (m: DeliveryMode) => {
      try {
        const res = await api<CartResponse>(`/cart?mode=${m}`);
        setData(res);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : String(err));
      }
    },
    [toast],
  );

  useEffect(() => {
    if (user) refresh(mode);
  }, [user, mode, refresh]);

  const remove = async (id: string) => {
    try {
      await api(`/cart/${id}`, { method: "DELETE" });
      toast.success(t("removed"));
      refresh(mode);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    }
  };

  const checkout = async () => {
    if (!data || data.items.length === 0) return;
    setBusy(true);
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
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p>Loading…</p>;
  if (!user) return <p>Please sign in.</p>;

  const isEmpty = !data || data.items.length === 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      {!isEmpty && (
        <div className="card flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium">{t("mode")}:</span>
          <button
            onClick={() => setMode("PICKUP")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === "PICKUP"
                ? "bg-brand text-white shadow"
                : "border border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t("modePickup")}
          </button>
          <button
            onClick={() => setMode("FORWARD")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === "FORWARD"
                ? "bg-brand text-white shadow"
                : "border border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t("modeForward")}
          </button>
        </div>
      )}

      {isEmpty ? (
        <EmptyCart />
      ) : (
        <>
          <div className="card divide-y divide-slate-100 p-0">
            {data!.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-5 first:rounded-t-xl last:rounded-b-xl hover:bg-slate-50/50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-bold uppercase text-slate-500">
                  {item.product.vendor.slice(0, 3)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{item.product.title}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {item.product.vendor} · {formatKrw(item.product.priceKrw)} × {item.quantity}
                  </div>
                </div>
                <div className="text-sm font-mono font-semibold">
                  {formatKrw(item.fee.totalKrw)}
                </div>
                <button
                  onClick={() => remove(item.id)}
                  className="rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="card space-y-1 text-sm">
            <Row label={t("itemTotal")} value={formatKrw(data!.totals.itemPriceKrw)} />
            <Row label={t("handling")} value={formatKrw(data!.totals.handlingChargeKrw)} />
            <Row label={t("surcharge")} value={formatKrw(data!.totals.surchargeKrw)} />
            <Row label={t("shipping")} value={formatKrw(data!.totals.shippingKrw)} />
            <hr className="my-3 border-slate-200" />
            <Row label={t("total")} value={formatKrw(data!.totals.totalKrw)} bold />
            <button
              onClick={checkout}
              disabled={busy}
              className="btn-primary mt-4 w-full py-3 text-base"
            >
              {busy ? "…" : t("checkout")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyCart() {
  const t = useTranslations("cart");
  const locale = useLocale();
  return (
    <div className="space-y-6">
      <div className="card flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <ShoppingCart className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">{t("emptyTitle")}</h2>
        <p className="mt-1 max-w-md text-sm text-slate-500">{t("emptySub")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href={`/${locale}/order`}
          className="group card flex flex-col items-start gap-3 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">{t("howToA")}</h3>
            <p className="mt-1 text-sm text-slate-500">{t("howToADesc")}</p>
          </div>
          <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-brand group-hover:gap-2 transition-all">
            {t("howToAcCta")}
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>

        <Link
          href={`/${locale}/bookmarklet`}
          className="group card flex flex-col items-start gap-3 transition-all hover:-translate-y-0.5 hover:border-brand-gold hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-gold/10 text-brand-gold">
            <Bookmark className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">{t("howToB")}</h3>
            <p className="mt-1 text-sm text-slate-500">{t("howToBDesc")}</p>
          </div>
          <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-brand-gold group-hover:gap-2 transition-all">
            {t("howToBCta")}
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </div>
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
