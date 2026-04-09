"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bookmark, CheckCircle2, MousePointer2, Sparkles } from "lucide-react";

const BOOKMARKLET_TEMPLATE = `javascript:(function(){function J(){try{var ss=document.querySelectorAll('script[type="application/ld+json"]');for(var i=0;i<ss.length;i++){var d=JSON.parse(ss[i].textContent);var a=Array.isArray(d)?d:[d];for(var j=0;j<a.length;j++){var x=a[j],t=x['@type'];if(t=='Product'||(Array.isArray(t)&&t.indexOf('Product')>=0)){var o=Array.isArray(x.offers)?x.offers[0]:x.offers||{};return{n:x.name,i:typeof x.image=='string'?x.image:(x.image&&x.image[0]||''),p:o.price||(o.priceSpecification&&o.priceSpecification.price)||''};}if(x['@graph']){for(var k=0;k<x['@graph'].length;k++){var g=x['@graph'][k],gt=g['@type'];if(gt=='Product'||(Array.isArray(gt)&&gt.indexOf('Product')>=0)){var go=Array.isArray(g.offers)?g.offers[0]:g.offers||{};return{n:g.name,i:typeof g.image=='string'?g.image:(g.image&&g.image[0]||''),p:go.price||''};}}}}}}catch(e){}return null;}function M(p){var m=document.querySelector('meta[property="'+p+'"]');return m?m.getAttribute('content'):'';}var d=J()||{};var t=d.n||M('og:title')||document.title;var im=d.i||M('og:image')||'';var pr=d.p||M('og:price:amount')||M('product:price:amount')||'';var h=location.host;if(!pr&&h.indexOf('coupang')>=0){var e=document.querySelector('.total-price strong, .prod-coupon-price strong, [class*="totalPrice"] strong, [class*="prodPrice"] strong');if(e)pr=e.textContent;}if(!pr&&(h.indexOf('smartstore')>=0||h.indexOf('shopping.naver')>=0)){var e2=document.querySelector('[class*="price"] strong, [class*="Price"] strong');if(e2)pr=e2.textContent;}pr=String(pr).replace(/[^\\d.]/g,'');if(!t||!pr){alert('We buy K: 상품 정보 추출 실패\\\\n페이지에서 제목 또는 가격을 찾지 못했습니다.');return;}var u='__ORIGIN__/__LOCALE__/bookmarklet/add?title='+encodeURIComponent(t.trim())+'&price='+encodeURIComponent(pr)+'&image='+encodeURIComponent(im)+'&url='+encodeURIComponent(location.href);window.open(u,'wbk_add','width=520,height=680');})();`;

const SUPPORTED_SITES = [
  { name: "Coupang", note: "전용 셀렉터 + DOM 추출", highlight: true },
  { name: "Naver SmartStore", note: "OG + JSON-LD" },
  { name: "Naver Shopping", note: "JSON-LD" },
  { name: "Kream", note: "JSON-LD" },
  { name: "11번가", note: "OG + 셀렉터" },
  { name: "G마켓", note: "OG" },
];

export default function BookmarkletInstallPage() {
  const t = useTranslations("bookmarklet");
  const locale = useLocale();
  const [bookmarkletHref, setBookmarkletHref] = useState<string>("javascript:void(0)");

  useEffect(() => {
    const origin = window.location.origin;
    setBookmarkletHref(
      BOOKMARKLET_TEMPLATE.replace("__ORIGIN__", origin).replace("__LOCALE__", locale),
    );
  }, [locale]);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="card relative overflow-hidden bg-gradient-to-br from-brand to-brand-muted text-white">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-brand-gold/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-brand-accent/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3 w-3" />
            One-click add to cart
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/80">{t("subtitle")}</p>
        </div>
      </div>

      {/* Why */}
      <section className="card">
        <h2 className="text-lg font-semibold">{t("whyTitle")}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[t("why1"), t("why2"), t("why3")].map((text, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4"
            >
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Install steps */}
      <section className="card">
        <h2 className="text-lg font-semibold">{t("installTitle")}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Step n={1} title={t("step1")} desc={t("step1Desc")} />
          <Step n={2} title={t("step2")} desc={t("step2Desc")} />
          <Step n={3} title={t("step3")} desc={t("step3Desc")} />
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-gradient-to-br from-amber-50 to-white p-8 text-center">
          <a
            href={bookmarkletHref}
            onClick={(e) => e.preventDefault()}
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand to-brand-muted px-7 py-4 text-base font-bold text-white shadow-xl shadow-brand/20 transition-transform hover:-translate-y-0.5 active:translate-y-0"
            draggable
          >
            <Bookmark className="h-5 w-5" />
            {t("dragMe")}
          </a>
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-slate-500">
            <MousePointer2 className="h-3.5 w-3.5" />
            {t("dragHint")}
          </div>
        </div>
      </section>

      {/* Supported sites */}
      <section className="card">
        <h2 className="text-lg font-semibold">{t("supportedTitle")}</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {SUPPORTED_SITES.map((s) => (
            <div
              key={s.name}
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                s.highlight
                  ? "border-brand-gold/40 bg-brand-gold/5"
                  : "border-slate-200"
              }`}
            >
              <CheckCircle2
                className={`mt-0.5 h-4 w-4 ${s.highlight ? "text-brand-gold" : "text-green-600"}`}
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold">{s.name}</div>
                <div className="text-xs text-slate-500">{s.note}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trouble */}
      <section className="card bg-slate-50/60">
        <h2 className="text-base font-semibold">{t("troubleTitle")}</h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          <li>• {t("trouble1")}</li>
          <li>• {t("trouble2")}</li>
          <li>• {t("trouble3")}</li>
        </ul>
      </section>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-4">
      <div className="absolute -top-3 left-4 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow">
        {n}
      </div>
      <div className="mt-2 text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs text-slate-500 leading-relaxed">{desc}</div>
    </div>
  );
}
