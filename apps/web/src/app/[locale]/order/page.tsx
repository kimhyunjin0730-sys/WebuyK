"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  CheckCircle2, Search, Loader2, Globe, Info, PackagePlus,
  Zap, Shield, Camera, Upload, X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";
import { computeFee } from "@wbk/shared";
import { formatKrw } from "@/lib/format";

interface ParsedProduct {
  id?: string;
  title: string;
  vendor: string;
  priceKrw: number;
  imageUrl?: string;
  sourceUrl?: string;
}

const SUPPORTED = [
  { name: "Naver", host: "smartstore.naver.com" },
  { name: "Kream", host: "kream.co.kr" },
  { name: "11st", host: "11st.co.kr" },
  { name: "Olive Young", host: "oliveyoung.co.kr" },
];

type VendorState =
  | { kind: "supported" }
  | { kind: "unknown" }
  | null;

type Mode = "fast" | "playwright" | "vision" | "manual";

const MODE_TABS: { id: Mode; label: string; icon: typeof Zap; hint: string }[] = [
  { id: "fast", label: "빠른 URL", icon: Zap, hint: "OG 태그 기반 즉시 인식" },
  { id: "playwright", label: "정밀 URL", icon: Shield, hint: "차단 사이트도 시도 (느림)" },
  { id: "vision", label: "스크린샷", icon: Camera, hint: "이미지 한 장이면 끝" },
];

function detectVendor(rawUrl: string): VendorState {
  if (!rawUrl.trim()) return null;
  try {
    const h = new URL(rawUrl).hostname.toLowerCase();
    if (
      h.includes("naver") ||
      h.includes("smartstore") ||
      h.includes("kream") ||
      h.includes("11st") ||
      h.includes("oliveyoung") ||
      h.includes("coupang") ||
      h.includes("gmarket")
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

  const [mode, setMode] = useState<Mode>("fast");
  const [url, setUrl] = useState("");
  const [qty, setQty] = useState(1);
  const [preview, setPreview] = useState<ParsedProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Manual values
  const [manualTitle, setManualTitle] = useState("");
  const [manualPrice, setManualPrice] = useState("");

  // Vision mode state
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reserved for future inline vendor hints; computed but not yet rendered.
  void useMemo(() => detectVendor(url), [url]);
  const showManual = mode === "manual";

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setPreview(null);
  };

  const parsePreview = async (targetUrl?: string) => {
    const finalUrl = targetUrl || url;
    if (!finalUrl) return;

    setError(null);
    setBusy(true);
    setPreview(null);

    try {
      const res = await api<ParsedProduct>("/products/parse", {
        method: "POST",
        body: JSON.stringify({
          url: finalUrl,
          mode: mode === "playwright" ? "playwright" : "fast",
        }),
      });
      setPreview(res);
      toast.success(
        mode === "playwright"
          ? "정밀 모드로 인식 완료"
          : "Product info recognized!",
      );
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : String(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = (file: File | null) => {
    if (!file) {
      setImageFile(null);
      setImageDataUrl(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("이미지가 너무 큽니다 (최대 5MB).");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const parseImage = async () => {
    if (!imageFile || !imageDataUrl) return;
    setError(null);
    setBusy(true);
    setPreview(null);
    try {
      // strip "data:image/png;base64," prefix
      const base64 = imageDataUrl.split(",")[1] ?? "";
      const mimeType =
        (imageFile.type as
          | "image/png"
          | "image/jpeg"
          | "image/webp"
          | "image/gif") || "image/png";
      const res = await api<ParsedProduct>("/products/parse-image", {
        method: "POST",
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          sourceUrl: url || undefined,
        }),
      });
      setPreview(res);
      toast.success("스크린샷에서 상품 인식 완료");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : String(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const onUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    // Auto-parse only in fast mode — precise mode is opt-in (slow & expensive)
    if (
      mode === "fast" &&
      newUrl.startsWith("http") &&
      newUrl.length > 20
    ) {
      const timer = setTimeout(() => parsePreview(newUrl), 1000);
      return () => clearTimeout(timer);
    }
  };

  const addToCart = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = showManual
        ? {
            title: manualTitle,
            priceKrw: Number(manualPrice),
            sourceUrl: url || "Manual Entry",
            quantity: qty,
            vendor: "Manual",
          }
        : {
            sourceUrl: url,
            quantity: qty,
          };

      await api("/cart", {
        method: "POST",
        body: JSON.stringify(payload),
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
      <div className="card text-center py-20">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-slate-300" />
        <p className="mt-4 text-slate-500">
          Please <Link href={`/${locale}/login`} className="text-brand font-bold underline">sign in</Link>{" "}
          to place a proxy order.
        </p>
      </div>
    );
  }

  const effectivePrice = showManual ? Number(manualPrice) : (preview?.priceKrw || 0);
  const previewFee = effectivePrice > 0 ? computeFee(effectivePrice * qty, "PICKUP") : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-brand">{t("title")}</h1>
        <p className="text-slate-500 max-w-lg mx-auto">{t("intro")}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-3 space-y-6">
          <div className="card space-y-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <Globe className="h-24 w-24" />
             </div>

            <div className="space-y-4">
              {/* Mode tabs */}
              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100">
                {MODE_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = mode === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => switchMode(tab.id)}
                      title={tab.hint}
                      className={`flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        active
                          ? "bg-white shadow text-brand"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => switchMode("manual")}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    mode === "manual"
                      ? "bg-white shadow text-brand"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <PackagePlus className="h-4 w-4" />
                  수동
                </button>
              </div>

              {/* URL modes (fast / playwright) */}
              {(mode === "fast" || mode === "playwright") && (
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                    {t("url")}
                  </span>
                  <div className="relative">
                    <input
                      value={url}
                      onChange={(e) => onUrlChange(e.target.value)}
                      placeholder="Paste Coupang, Naver, or any URL here..."
                      className="input pl-10 h-14 text-lg"
                    />
                    <Search className="absolute left-3 top-4 h-6 w-6 text-slate-400" />
                    <button
                      disabled={!url || busy}
                      onClick={() => parsePreview()}
                      className="absolute right-2 top-2 h-10 rounded-lg bg-brand px-4 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                    </button>
                  </div>
                  {mode === "playwright" && (
                    <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      정밀 모드는 헤드리스 브라우저를 띄워서 5~15초 걸릴 수 있습니다.
                    </p>
                  )}
                </label>
              )}

              {/* Vision mode */}
              {mode === "vision" && (
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    상품 페이지 스크린샷
                  </span>
                  {!imageDataUrl ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-40 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-brand hover:text-brand transition-colors"
                    >
                      <Upload className="h-8 w-8" />
                      <span className="text-sm font-bold">이미지 업로드 (PNG/JPG, ≤5MB)</span>
                      <span className="text-[11px] opacity-60">상품명·가격이 보이는 화면이면 OK</span>
                    </button>
                  ) : (
                    <div className="relative">
                      <img
                        src={imageDataUrl}
                        alt="Selected screenshot"
                        className="w-full max-h-64 object-contain rounded-xl border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => onPickFile(null)}
                        className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                  />
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="원본 상품 URL (선택사항)"
                    className="input h-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={parseImage}
                    disabled={!imageFile || busy}
                    className="w-full h-11 btn-primary rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    스크린샷 분석
                  </button>
                </div>
              )}

              {/* Manual mode */}
              {mode === "manual" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block">
                    <span className="text-xs font-bold uppercase text-slate-400 mb-1 block">Product Name</span>
                    <input
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="e.g. BTS Album, Skincare Set..."
                      className="input h-12"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase text-slate-400 mb-1 block">Price (KRW)</span>
                    <input
                      type="number"
                      value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                      placeholder="Amount in Won"
                      className="input h-12 font-mono"
                    />
                  </label>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs">
                  <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {(mode === "fast" || mode === "playwright") && !preview && !busy && !error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 italic text-slate-500 text-sm">
                  <Info className="h-5 w-5 opacity-50" />
                  <p>Supported: Coupang, Olive Young, Naver, Gmarket, Kream, and all major K-Malls.</p>
                </div>
              )}
            </div>

            <div className="flex items-end gap-4">
               <label className="block w-32">
                 <span className="text-xs font-bold uppercase text-slate-400 mb-1 block">{t("qty")}</span>
                 <input
                   type="number"
                   min={1}
                   value={qty}
                   onChange={(e) => setQty(Number(e.target.value))}
                   className="input h-12 text-center text-lg font-bold"
                 />
               </label>
               <button
                 type="button"
                 onClick={addToCart}
                 disabled={(showManual ? !manualTitle || !manualPrice : !preview) || busy}
                 className="flex-1 h-12 btn-primary rounded-xl flex items-center justify-center gap-2 text-lg shadow-lg shadow-brand/20 active:scale-95 transition-all"
               >
                 <PackagePlus className="h-5 w-5" />
                 {t("addToCart")}
               </button>
            </div>
          </div>
        </div>

        {/* Right Column: Summary Card */}
        <div className="lg:col-span-2 space-y-6">
           <div className="card bg-brand text-white border-0 shadow-2xl relative overflow-hidden group">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-gold/10 transition-all group-hover:scale-110" />
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                 <CheckCircle2 className="h-5 w-5 text-brand-gold" />
                 Order Preview
              </h2>
              
              {(preview || (showManual && manualTitle)) ? (
                <div className="space-y-6">
                   <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-2xl font-black text-brand-gold leading-tight">
                           {showManual ? manualTitle : preview?.title}
                        </div>
                        {(preview?.vendor === "Olive Young" || manualTitle.toLowerCase().includes("olive")) && (
                          <div className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-400 border border-green-500/30 animate-pulse">
                            -30% vs Global
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-bold text-white/50 mt-1 uppercase tracking-widest flex items-center gap-2">
                         {showManual ? "MANUAL ENTRY" : (preview?.vendor || "Recognized Vendor")}
                         {preview?.vendor === "Olive Young" && (
                           <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-brand-gold">Domestic Price Benefit</span>
                         )}
                      </div>
                   </div>

                   <div className="space-y-3 pt-4 border-t border-white/10">
                      <SummaryRow label="Item Price" value={formatKrw(effectivePrice * qty)} />
                      {previewFee && (
                        <>
                          <SummaryRow 
                            label="Handling & Inspection (8%)" 
                            value={formatKrw(previewFee.handlingChargeKrw)} 
                            tooltip="Covers proxy purchasing, visual inspection, and photography at the warehouse."
                          />
                          <SummaryRow 
                            label="Service Fee (3.5%)" 
                            value={formatKrw(previewFee.surchargeKrw)} 
                            tooltip="Includes FX risk buffer and international payment processing fees."
                          />
                          <div className="pt-4 mt-2 border-t border-white/20 flex justify-between items-center">
                             <div className="text-sm font-bold opacity-60">Total Estimated</div>
                             <div className="text-3xl font-black text-brand-gold">{formatKrw(previewFee.totalKrw)}</div>
                          </div>
                          <p className="text-[10px] text-white/40 mt-2 leading-tight">
                            * Basic international shipping (₩18,000+) will be added if you choose Overseas Delivery instead of Airport Pickup.
                          </p>
                        </>
                      )}
                   </div>
                </div>
              ) : (
                <div className="py-12 text-center space-y-4 opacity-40">
                   <Loader2 className={`h-12 w-12 mx-auto ${busy ? "animate-spin" : ""}`} />
                   <p className="text-sm">Enter a product URL or use manual mode to see pricing details.</p>
                </div>
              )}
           </div>

           <div className="card border-slate-200 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                 <Info className="h-4 w-4 text-brand" />
                 Supported Vendors
              </h3>
              <div className="flex flex-wrap gap-2">
                 {SUPPORTED.map(s => (
                   <span key={s.name} className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600">
                      {s.name}.co.kr
                   </span>
                 ))}
                 <span className="px-3 py-1.5 bg-white border border-dashed border-brand-gold rounded-full text-xs font-bold text-brand-gold">
                    + All Others via Manual
                 </span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ 
  label, 
  value, 
  tooltip 
}: { 
  label: string; 
  value: string;
  tooltip?: string;
}) {
  return (
    <div className="group/row">
      <div className="flex justify-between text-sm">
        <span className="opacity-60 flex items-center gap-1">
          {label}
          {tooltip && (
            <span title={tooltip} className="cursor-help">
              <Info className="h-3 w-3 opacity-30 group-hover/row:opacity-100 transition-opacity" />
            </span>
          )}
        </span>
        <span className="font-mono font-bold tracking-tight">{value}</span>
      </div>
    </div>
  );
}


