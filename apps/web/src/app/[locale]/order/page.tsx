"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, Bookmark, CheckCircle2 } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";
import { computeFee } from "@wbk/shared";
import { formatKrw } from "@/lib/format";

interface ParsedProduct {
  id: string;
  title: string;
  vendor: string;
  priceKrw: number;
}

const SUPPORTED = [
  { name: "Naver", host: "smartstore.naver.com" },
  { name: "Kream", host: "kream.co.kr" },
  { name: "11st", host: "11st.co.kr" },
];

const BLOCKED = [
  { match: "coupang", name: "쿠팡 / Coupang" },
  { match: "gmarket", name: "G마켓 / Gmarket" },
];

type VendorState =
  | { kind: "blocked"; name: string }
  | { kind: "supported" }
  | { kind: "unknown" }
  | null;

function detectVendor(rawUrl: string): VendorState {
  if (!rawUrl.trim()) return null;
  try {
    const h = new URL(rawUrl).hostname.toLowerCase();
    const blocked = BLOCKED.find((b) => h.includes(b.match));
    if (blocked) return { kind: "blocked", name: blocked.name };
    if (
      h.includes("naver") ||
      h.includes("smartstore") ||
      h.includes("kream") ||
      h.includes("11st")
    )
      return { kind: "supported" };
    return { kind: "unknown" };
  } catch {
    return null;
  }
}

export default function OrderPage() {
  const t = useTranslations("order");
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [url, setUrl] = useState("");
  const [qty, setQty] = useState(1);
  const [preview, setPreview] = useState<ParsedProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const vendorState = useMemo(() => detectVendor(url), [url]);
  const isBlocked = vendorState?.kind === "blocked";
  const blockedName = vendorState?.kind === "blocked" ? vendorState.name : null;

  const parsePreview = async () => {
    if (isBlocked) return;
    setError(null);
    setBusy(true);
    try {
      const res = await api<ParsedProduct>("/products/parse", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      setPreview(res);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : String(err);
      setError(msg);
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  const addToCart = async () => {
    if (isBlocked) return;
    setBusy(true);
    setError(null);
    try {
      await api("/cart", {
        method: "POST",
        body: JSON.stringify({ sourceUrl: url, quantity: qty }),
      });
      toast.success(t("addedToCart"));
      router.push(`/${locale}/cart`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : String(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="card">
        <p>
          Please <Link href={`/${locale}/login`} className="underline">sign in</Link>{" "}
          to place a proxy order.
        </p>
      </div>
    );
  }

  const previewFee = preview && computeFee(preview.priceKrw * qty, "PICKUP");

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("intro")}</p>

        {/* Supported sites pills */}
        <div className="mt-4">
          <div className="text-xs font-medium uppercase text-slate-500">
            {t("supportedTitle")}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {SUPPORTED.map((s) => (
              <span
                key={s.name}
                className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
              >
                <CheckCircle2 className="h-3 w-3" />
                {s.name}
              </span>
            ))}
            {BLOCKED.map((b) => (
              <Link
                key={b.match}
                href={`/${locale}/bookmarklet`}
                className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                title={`${b.name} via bookmarklet`}
              >
                <Bookmark className="h-3 w-3" />
                {b.name.split(" / ")[0]} → Bookmarklet
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase text-slate-500">
              {t("url")}
            </span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://smartstore.naver.com/..."
              className={`input ${
                isBlocked ? "border-amber-400 focus:border-amber-400 focus:ring-amber-400" : ""
              }`}
            />
          </label>

          {/* Inline blocked-vendor notice */}
          {isBlocked && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <span className="font-semibold">{blockedName}</span>
                {t("coupangNotice")}
                <Link
                  href={`/${locale}/bookmarklet`}
                  className="font-semibold underline underline-offset-2"
                >
                  {t("coupangNoticeLink")}
                </Link>
                {t("coupangNoticeTail")}
              </div>
            </div>
          )}

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

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={parsePreview}
              disabled={!url || busy || isBlocked}
              className="btn-secondary"
            >
              {t("preview")}
            </button>
            <button
              type="button"
              onClick={addToCart}
              disabled={!url || busy || isBlocked}
              className="btn-primary"
            >
              {t("addToCart")}
            </button>
          </div>

          {!preview && !error && !isBlocked && (
            <p className="text-xs text-slate-400">{t("previewHint")}</p>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {preview && previewFee && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 text-sm">
              <div className="font-semibold">{preview.title}</div>
              <div className="mt-1 text-xs text-slate-500">
                {preview.vendor} · {formatKrw(preview.priceKrw)} × {qty}
              </div>
              <hr className="my-3 border-slate-200" />
              <Row label="Item" value={formatKrw(previewFee.itemPriceKrw)} />
              <Row label="Handling" value={formatKrw(previewFee.handlingChargeKrw)} />
              <Row label="Surcharge" value={formatKrw(previewFee.surchargeKrw)} />
              <Row label="Total (pickup)" value={formatKrw(previewFee.totalKrw)} bold />
            </div>
          )}
        </div>
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
    <div className={`flex justify-between ${bold ? "mt-1 text-base font-semibold" : ""}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
