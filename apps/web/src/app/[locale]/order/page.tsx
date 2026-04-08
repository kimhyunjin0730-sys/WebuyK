"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { computeFee } from "@wbk/shared";
import { formatKrw } from "@/lib/format";

interface ParsedProduct {
  id: string;
  title: string;
  vendor: string;
  priceKrw: number;
}

export default function OrderPage() {
  const t = useTranslations("order");
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [qty, setQty] = useState(1);
  const [preview, setPreview] = useState<ParsedProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsePreview = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await api<ParsedProduct>("/products/parse", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      setPreview(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  const addToCart = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/cart", {
        method: "POST",
        body: JSON.stringify({ sourceUrl: url, quantity: qty }),
      });
      router.push(`/${locale}/cart`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="card">
        <p>
          Please <a href={`/${locale}/login`} className="underline">sign in</a>{" "}
          to place a proxy order.
        </p>
      </div>
    );
  }

  const previewFee = preview && computeFee(preview.priceKrw * qty, "PICKUP");

  return (
    <div className="card">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-2 text-sm text-slate-600">{t("intro")}</p>
      <p className="mt-1 text-xs text-slate-400">{t("tip")}</p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase text-slate-500">
            {t("url")}
          </span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.coupang.com/vp/products/..."
            className="input"
          />
        </label>
        <label className="block w-32">
          <span className="mb-1 block text-xs font-medium uppercase text-slate-500">
            {t("qty")}
          </span>
          <input
            type="number"
            min={1}
            max={99}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="input"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={parsePreview}
            disabled={!url || busy}
            className="btn-secondary"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={addToCart}
            disabled={!url || busy}
            className="btn-primary"
          >
            {t("addToCart")}
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {preview && previewFee && (
          <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="font-medium">{preview.title}</div>
            <div className="text-xs text-slate-500">
              {preview.vendor} · {formatKrw(preview.priceKrw)} × {qty}
            </div>
            <hr className="my-3" />
            <Row label="Item" value={formatKrw(previewFee.itemPriceKrw)} />
            <Row label="Handling" value={formatKrw(previewFee.handlingChargeKrw)} />
            <Row label="Surcharge" value={formatKrw(previewFee.surchargeKrw)} />
            <Row label="Total (pickup)" value={formatKrw(previewFee.totalKrw)} bold />
          </div>
        )}
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
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
