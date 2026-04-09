"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { formatKrw } from "@/lib/format";

type Status = "loading" | "needs-auth" | "confirm" | "submitting" | "done" | "error";

export default function BookmarkletAddPage() {
  const params = useSearchParams();
  const locale = useLocale();
  const { user, loading } = useAuth();

  const initialTitle = params.get("title") ?? "";
  const initialPrice = Number(params.get("price") ?? 0);
  const initialImage = params.get("image") ?? "";
  const sourceUrl = params.get("url") ?? "";

  const [title, setTitle] = useState(initialTitle);
  const [priceKrw, setPriceKrw] = useState(initialPrice);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setStatus("needs-auth");
      return;
    }
    if (!sourceUrl || !initialTitle || !initialPrice) {
      setStatus("error");
      setError("북마클릿이 보낸 데이터가 비어 있습니다. URL/title/price 파라미터를 확인하세요.");
      return;
    }
    setStatus("confirm");
  }, [loading, user, sourceUrl, initialTitle, initialPrice]);

  const submit = async () => {
    setStatus("submitting");
    setError(null);
    try {
      await api("/cart/parsed", {
        method: "POST",
        body: JSON.stringify({
          sourceUrl,
          title: title.trim(),
          priceKrw: Math.round(priceKrw),
          imageUrl: initialImage || undefined,
          quantity,
        }),
      });
      setStatus("done");
      setTimeout(() => window.close(), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add to cart failed");
      setStatus("error");
    }
  };

  if (status === "loading") return <p className="p-6 text-sm">Loading…</p>;

  if (status === "needs-auth") {
    return (
      <div className="space-y-3 p-6 text-sm">
        <h1 className="text-lg font-semibold">로그인이 필요합니다</h1>
        <p className="text-slate-600">
          We buy K에 먼저 로그인한 다음, 원래 페이지에서 북마클릿을 다시 눌러주세요.
        </p>
        <Link
          className="inline-block rounded bg-brand px-4 py-2 text-white"
          href={`/${locale}/auth/sign-in`}
        >
          로그인하러 가기
        </Link>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="space-y-2 p-6 text-sm">
        <h1 className="text-lg font-semibold text-green-700">✓ 장바구니에 담았습니다</h1>
        <p className="text-slate-600">잠시 후 이 창은 자동으로 닫힙니다.</p>
        <Link className="text-brand underline" href={`/${locale}/cart`}>
          장바구니 열기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6 text-sm">
      <h1 className="text-lg font-semibold">장바구니에 담기</h1>

      {initialImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={initialImage}
          alt=""
          className="h-32 w-32 rounded border object-cover"
        />
      )}

      <label className="block">
        <span className="text-xs text-slate-500">상품명</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>

      <label className="block">
        <span className="text-xs text-slate-500">가격 (KRW)</span>
        <input
          type="number"
          value={priceKrw}
          onChange={(e) => setPriceKrw(Number(e.target.value))}
          className="mt-1 w-full rounded border px-2 py-1"
        />
        <div className="mt-1 text-xs text-slate-400">{formatKrw(priceKrw)}</div>
      </label>

      <label className="block">
        <span className="text-xs text-slate-500">수량</span>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
          className="mt-1 w-24 rounded border px-2 py-1"
        />
      </label>

      <div className="text-xs text-slate-400 break-all">출처: {sourceUrl}</div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={status === "submitting"}
          className="rounded bg-brand px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {status === "submitting" ? "담는 중…" : "장바구니에 담기"}
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded border px-4 py-2"
        >
          취소
        </button>
      </div>
    </div>
  );
}
