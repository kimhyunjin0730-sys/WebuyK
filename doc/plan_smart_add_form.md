# Plan — 스마트 추가 단일 폼 (Smart Add Form)

> 작성일: 2026-04-09
> 상태: **승인 대기 중** — 사용자가 검토·승인하기 전까지 코드 작성 금지
> Research: `doc/research_smart_add_form.md`

---

## 1. 접근 방식 (Approach)

`/order` 페이지를 **3단계 진행 폼**으로 리팩토링한다:

```
┌─────────────────────────────────────────────────┐
│  STEP 1: URL 붙여넣기                            │
│  [____________________________________]   [→]  │
└─────────────────────────────────────────────────┘
                     ↓
       클라이언트에서 사이트 즉시 분류
                     ↓
       ┌─────────────┴─────────────┐
       ↓                           ↓
   SUPPORTED                   BLOCKED / UNKNOWN
       ↓                           ↓
┌──────────────┐         ┌──────────────────────────┐
│  자동 파싱    │         │  STEP 2: 두 가지 옵션     │
│  → 결과 폼   │         │  ┌──────────┬──────────┐ │
│  (편집 가능) │         │  │ 외부 페이지│ 직접 입력 │ │
└──────────────┘         │  │ 열기      │  폼      │ │
       ↓                 │  └──────────┴──────────┘ │
   STEP 3:               └──────────────────────────┘
   [장바구니 담기]                      ↓
                                    STEP 3:
                                [장바구니 담기]
```

핵심 원칙:
- **단일 페이지** — 모달이나 라우팅 이동 없음. 인라인 확장.
- **자동이 1순위** — supported면 곧바로 자동 파싱. 사용자 클릭 1번 (Preview 또는 Add).
- **막히면 즉시 다음 옵션** — blocked / unknown / parse failure 어느 경우든 동일한 폴백 UI 등장.
- **결과는 항상 편집 가능** — 자동 파싱 성공도 폼이 표시되고 prefill만 됨. 사용자가 가격/제목 수정 후 추가 가능.

---

## 2. 코드 구조 (Code Structure)

### 2.1 새 컴포넌트 / 변경 파일

| 파일 | 변경 종류 | 역할 |
|---|---|---|
| `apps/web/src/app/[locale]/order/page.tsx` | **리팩토링** | 단일 URL 입력 → 상태 머신으로 분기. 기존 SUPPORTED/BLOCKED detect 로직 재사용 |
| `apps/web/src/components/order/SmartAddForm.tsx` | **신규** | URL 입력 + 결과 편집 + 폴백 UI를 한 컴포넌트로. order/page.tsx는 이걸 import해서 얇게 |
| `apps/web/src/components/order/ProductFields.tsx` | **신규** | title / priceKrw / imageUrl / quantity 입력 필드 그룹. 자동 파싱 prefill과 수동 입력 모두 같은 컴포넌트 사용 |
| `apps/web/src/components/order/BlockedFallback.tsx` | **신규** | 차단/실패 시의 두 옵션 UI ("외부 페이지 열기" + "직접 입력 폼") |
| `apps/web/src/lib/order-vendor.ts` | **신규** | 기존 order/page.tsx 안에 있던 `detectVendor` / `BLOCKED` / `SUPPORTED` 추출. 단일 모듈에서 import |
| `apps/web/messages/{ko,en}.json` | **편집** | `order.*` 섹션에 새 키 추가 (아래 목록) |
| `apps/api/src/cart/cart.controller.ts` | **변경 없음** | `POST /cart` 와 `POST /cart/parsed` 그대로 재사용 |
| `apps/api/src/products/product-parser.ts` | **변경 없음** | 백엔드 차단 로직 유지 |

### 2.2 새 i18n 키

| 키 | 한국어 | English |
|---|---|---|
| `order.smartTitle` | 상품 추가 | Add a product |
| `order.smartIntro` | 한국 쇼핑몰 상품 URL을 붙여넣으세요. 자동으로 인식하거나, 막힌 사이트면 두 가지 우회로를 안내해드립니다. | Paste a Korean shop product URL. We auto-detect it, or offer two workarounds for sites that block bots. |
| `order.fallbackTitle` | 자동 인식이 안 되는 사이트네요 | This site can't be auto-detected |
| `order.fallbackSubtitle` | 두 가지 방법 중 편한 쪽을 선택하세요. | Pick whichever you prefer. |
| `order.openExternalTitle` | 1) 외부 페이지에서 북마클릿 사용 | 1) Open in browser, use bookmarklet |
| `order.openExternalDesc` | 새 탭에서 상품 페이지를 열고, 이미 설치된 북마클릿(또는 지금 설치)으로 한 번에 담기. | Open the product in a new tab and use the (already installed or new) bookmarklet to capture it. |
| `order.openExternalCta` | 페이지 열기 | Open page |
| `order.manualTitle` | 2) 직접 입력 | 2) Enter manually |
| `order.manualDesc` | 자동 인식이 안 될 때의 마지막 폴백. 상품명·가격을 직접 입력해서 그대로 장바구니에 담을 수 있습니다. | Last-resort fallback. Type the title and price yourself and we'll add it as-is. |
| `order.fieldTitle` | 상품명 | Product name |
| `order.fieldPriceKrw` | 가격 (KRW) | Price (KRW) |
| `order.fieldImageUrl` | 이미지 URL (선택) | Image URL (optional) |
| `order.fieldQty` | 수량 | Quantity |
| `order.parsedFromUrl` | 자동 인식된 정보입니다. 필요하면 수정하세요. | Auto-detected from the URL. Edit if needed. |
| `order.manualFromUser` | 직접 입력 모드입니다. | Manual entry mode. |
| `order.addToCartShort` | 장바구니에 담기 | Add to cart |

기존 키 중 일부는 더 이상 사용 안 함 (`order.preview`, `order.previewHint`) — **삭제는 본 작업에서 안 함** (롤백 안전성 우선, 미사용 키 정리는 별도 작업).

### 2.3 상태 머신 (FormState)

```ts
type FormState =
  | { kind: "empty" }                          // URL 비어있음
  | { kind: "detecting"; url: string }         // 사이트 분류 중 (사실상 즉시 끝남)
  | { kind: "auto"; url: string;               // 자동 파싱 시도 중
      status: "loading" | "ok" | "fail";
      data?: ProductFields;                    // ok일 때 prefill
      error?: string }                         // fail일 때 메시지
  | { kind: "blocked"; url: string;            // 차단 사이트로 즉시 분류됨
      vendorName: string }                     // "쿠팡 / Coupang" 등
  | { kind: "manual"; url: string;             // 사용자가 수동 입력 모드 진입
      data: ProductFields };
```

전이:
- `empty` → `detecting` → `auto(loading)` (supported일 때) | `blocked` (blocked일 때) | `auto(loading)` (unknown은 시도해본다)
- `auto(loading)` → `auto(ok)` (성공) | `auto(fail)` (실패)
- `auto(fail)` 또는 `blocked` → 사용자가 "직접 입력" 클릭 → `manual`
- 어느 상태든 URL 변경 시 `empty` 또는 재감지

### 2.4 ProductFields 타입

```ts
interface ProductFields {
  title: string;
  priceKrw: number;
  imageUrl?: string;
  quantity: number;
}
```

자동 파싱 결과를 이 타입으로 변환해서 폼에 prefill. 수동 입력도 같은 타입으로 모음.

---

## 3. 코드 스니펫 (sketches)

> ⚠️ 아래는 **승인 후** 작성할 코드의 스케치입니다. 승인 전에는 실제 파일에 쓰지 않습니다.

### 3.1 `apps/web/src/lib/order-vendor.ts` (신규)

```ts
// Vendor classification used by the order page state machine.
// Mirrored on the backend in `apps/api/src/products/product-parser.ts`
// (BLOCKED_VENDORS). Keep both lists in sync.

export interface BlockedVendor {
  match: string;       // hostname substring
  name: string;        // display name "쿠팡 / Coupang"
}

export const BLOCKED_VENDORS: BlockedVendor[] = [
  { match: "coupang", name: "쿠팡 / Coupang" },
  { match: "gmarket", name: "G마켓 / Gmarket" },
];

export const SUPPORTED_HOSTS = [
  "smartstore.naver.com",
  "shopping.naver.com",
  "kream.co.kr",
  "11st.co.kr",
] as const;

export type VendorClassification =
  | { kind: "empty" }
  | { kind: "invalid" }
  | { kind: "blocked"; vendor: BlockedVendor }
  | { kind: "supported" }
  | { kind: "unknown" };

export function classifyUrl(rawUrl: string): VendorClassification {
  const trimmed = rawUrl.trim();
  if (!trimmed) return { kind: "empty" };
  let host: string;
  try {
    host = new URL(trimmed).hostname.toLowerCase();
  } catch {
    return { kind: "invalid" };
  }
  const blocked = BLOCKED_VENDORS.find((b) => host.includes(b.match));
  if (blocked) return { kind: "blocked", vendor: blocked };
  const isSupported =
    host.includes("naver") ||
    host.includes("smartstore") ||
    host.includes("kream") ||
    host.includes("11st");
  return isSupported ? { kind: "supported" } : { kind: "unknown" };
}
```

### 3.2 `apps/web/src/components/order/ProductFields.tsx` (신규)

```tsx
"use client";
import { formatKrw } from "@/lib/format";

export interface ProductFieldsValue {
  title: string;
  priceKrw: number;
  imageUrl?: string;
  quantity: number;
}

interface Props {
  value: ProductFieldsValue;
  onChange: (next: ProductFieldsValue) => void;
  hint?: string;          // "자동 인식된 정보입니다" 등
  disabled?: boolean;
}

export function ProductFields({ value, onChange, hint, disabled }: Props) {
  const set = <K extends keyof ProductFieldsValue>(k: K, v: ProductFieldsValue[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-3">
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      <Field label="상품명">
        <input
          className="input"
          value={value.title}
          onChange={(e) => set("title", e.target.value)}
          disabled={disabled}
        />
      </Field>
      <div className="flex gap-3">
        <Field label="가격 (KRW)">
          <input
            type="number"
            className="input"
            value={value.priceKrw || ""}
            onChange={(e) => set("priceKrw", Number(e.target.value) || 0)}
            disabled={disabled}
          />
          <span className="mt-1 block text-xs text-slate-400">{formatKrw(value.priceKrw)}</span>
        </Field>
        <Field label="수량">
          <input
            type="number"
            min={1}
            max={99}
            className="input w-24"
            value={value.quantity}
            onChange={(e) => set("quantity", Math.max(1, Number(e.target.value)))}
            disabled={disabled}
          />
        </Field>
      </div>
      <Field label="이미지 URL (선택)">
        <input
          className="input"
          value={value.imageUrl ?? ""}
          onChange={(e) => set("imageUrl", e.target.value || undefined)}
          disabled={disabled}
        />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase text-slate-500">{label}</span>
      {children}
    </label>
  );
}
```

### 3.3 `apps/web/src/components/order/BlockedFallback.tsx` (신규)

```tsx
"use client";
import { ExternalLink, Pencil } from "lucide-react";
import Link from "next/link";

interface Props {
  url: string;
  vendorName?: string;     // "쿠팡 / Coupang" — undefined면 unknown
  locale: string;
  onChooseManual: () => void;
}

export function BlockedFallback({ url, vendorName, locale, onChooseManual }: Props) {
  return (
    <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/60 p-5">
      <div>
        <h3 className="font-semibold text-amber-900">
          {vendorName ?? "이 사이트"}는 자동 인식이 안 돼요
        </h3>
        <p className="mt-1 text-sm text-amber-800">두 가지 방법 중 편한 쪽을 선택하세요.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-lg border border-amber-300 bg-white p-4 hover:border-brand-gold hover:shadow"
        >
          <ExternalLink className="h-5 w-5 text-amber-600" />
          <div className="mt-2 text-sm font-semibold">1) 외부 페이지 열기</div>
          <p className="mt-1 text-xs text-slate-600">
            새 탭에서 그 페이지를 열고, 북마클릿 한 번 클릭으로 바로 담기.
          </p>
          <Link
            href={`/${locale}/bookmarklet`}
            className="mt-2 inline-block text-xs font-semibold text-brand-gold underline"
          >
            북마클릿 설치 안내 →
          </Link>
        </a>

        <button
          type="button"
          onClick={onChooseManual}
          className="group rounded-lg border border-amber-300 bg-white p-4 text-left hover:border-brand hover:shadow"
        >
          <Pencil className="h-5 w-5 text-amber-600" />
          <div className="mt-2 text-sm font-semibold">2) 직접 입력</div>
          <p className="mt-1 text-xs text-slate-600">
            상품명·가격을 직접 적고 그대로 장바구니에 담기.
          </p>
        </button>
      </div>
    </div>
  );
}
```

### 3.4 `apps/web/src/components/order/SmartAddForm.tsx` (신규 — 핵심)

```tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api-client";
import { useToast } from "@/lib/toast";
import { classifyUrl } from "@/lib/order-vendor";
import { ProductFields, type ProductFieldsValue } from "./ProductFields";
import { BlockedFallback } from "./BlockedFallback";

interface ParsedProduct {
  title: string;
  vendor: string;
  priceKrw: number;
  imageUrl?: string;
}

type Mode =
  | { kind: "idle" }                                          // URL 입력 전 또는 빈 상태
  | { kind: "auto-loading" }                                  // 자동 파싱 중
  | { kind: "auto-ok"; data: ProductFieldsValue }             // 자동 파싱 성공 → 편집 가능
  | { kind: "auto-fail"; reason: string }                     // 자동 파싱 실패 → fallback
  | { kind: "blocked"; vendorName: string }                   // 차단 사이트 → fallback
  | { kind: "manual"; data: ProductFieldsValue };             // 수동 입력 모드

export function SmartAddForm() {
  const t = useTranslations("order");
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();

  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [busy, setBusy] = useState(false);

  const classification = useMemo(() => classifyUrl(url), [url]);

  // URL이 바뀌면 mode 리셋
  useEffect(() => {
    if (classification.kind === "empty" || classification.kind === "invalid") {
      setMode({ kind: "idle" });
    } else if (classification.kind === "blocked") {
      setMode({ kind: "blocked", vendorName: classification.vendor.name });
    } else {
      setMode({ kind: "idle" }); // 사용자가 "Detect" 눌러야 자동 파싱 시작
    }
  }, [classification]);

  const runAutoParse = async () => {
    if (classification.kind !== "supported" && classification.kind !== "unknown") return;
    setMode({ kind: "auto-loading" });
    try {
      const res = await api<ParsedProduct>("/products/parse", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      setMode({
        kind: "auto-ok",
        data: {
          title: res.title,
          priceKrw: res.priceKrw,
          imageUrl: res.imageUrl,
          quantity: 1,
        },
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : String(err);
      setMode({ kind: "auto-fail", reason: msg });
    }
  };

  const switchToManual = () =>
    setMode({
      kind: "manual",
      data: { title: "", priceKrw: 0, imageUrl: undefined, quantity: 1 },
    });

  const submit = async () => {
    setBusy(true);
    try {
      // 자동/수동 모두 동일한 엔드포인트 사용:
      //   - 자동(auto-ok)에서 사용자가 편집 가능하므로 항상 /cart/parsed 사용
      //   - 수동(manual)도 /cart/parsed
      // /cart (URL 기반)는 사실상 사용 안 하지만 호환성 위해 남겨둠.
      const data = mode.kind === "auto-ok" || mode.kind === "manual" ? mode.data : null;
      if (!data) return;
      await api("/cart/parsed", {
        method: "POST",
        body: JSON.stringify({
          sourceUrl: url,
          title: data.title.trim(),
          priceKrw: Math.round(data.priceKrw),
          imageUrl: data.imageUrl || undefined,
          quantity: data.quantity,
        }),
      });
      toast.success(t("addedToCart"));
      router.push(`/${locale}/cart`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const showFields = mode.kind === "auto-ok" || mode.kind === "manual";
  const fieldsData =
    mode.kind === "auto-ok" || mode.kind === "manual" ? mode.data : null;

  return (
    <div className="card space-y-5">
      {/* STEP 1: URL */}
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase text-slate-500">
          {t("url")}
        </span>
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://smartstore.naver.com/..."
            className="input"
          />
          {(classification.kind === "supported" ||
            classification.kind === "unknown") &&
            mode.kind !== "auto-loading" &&
            mode.kind !== "auto-ok" && (
              <button type="button" onClick={runAutoParse} className="btn-primary whitespace-nowrap">
                자동 인식
              </button>
            )}
        </div>
      </label>

      {/* STEP 2A: blocked or auto-fail → fallback */}
      {(mode.kind === "blocked" || mode.kind === "auto-fail") && (
        <BlockedFallback
          url={url}
          vendorName={mode.kind === "blocked" ? mode.vendorName : undefined}
          locale={locale}
          onChooseManual={switchToManual}
        />
      )}

      {/* STEP 2B: auto loading */}
      {mode.kind === "auto-loading" && (
        <p className="text-sm text-slate-500">자동 인식 중…</p>
      )}

      {/* STEP 3: editable fields (auto-ok or manual) */}
      {showFields && fieldsData && (
        <>
          <ProductFields
            value={fieldsData}
            onChange={(next) =>
              setMode((m) =>
                m.kind === "auto-ok" || m.kind === "manual"
                  ? { ...m, data: next }
                  : m,
              )
            }
            hint={mode.kind === "auto-ok" ? t("parsedFromUrl") : t("manualFromUser")}
          />
          <button
            type="button"
            onClick={submit}
            disabled={busy || !fieldsData.title || fieldsData.priceKrw <= 0}
            className="btn-primary w-full"
          >
            {busy ? "…" : t("addToCartShort")}
          </button>
        </>
      )}
    </div>
  );
}
```

### 3.5 `apps/web/src/app/[locale]/order/page.tsx` (얇아짐)

```tsx
"use client";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { SmartAddForm } from "@/components/order/SmartAddForm";

export default function OrderPage() {
  const t = useTranslations("order");
  const locale = useLocale();
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="card">
        <p>
          Please{" "}
          <Link href={`/${locale}/login`} className="underline">
            sign in
          </Link>{" "}
          to place a proxy order.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("smartTitle")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("smartIntro")}</p>
      </div>
      <SmartAddForm />
    </div>
  );
}
```

---

## 4. 트레이드오프

| 결정 | 장점 | 단점 / 비용 |
|---|---|---|
| 단일 페이지 + 인라인 확장 | 모달/페이지 이동 없음. 모바일 친화적. 사용자 인지 부담 최소. | order/page.tsx의 책임이 늘지만, 컴포넌트로 분리해서 관리 가능. |
| 자동 파싱 결과를 항상 편집 가능하게 prefill | 가격이 틀린 경우 사용자가 즉시 보정. preview vs add 두 단계가 사라짐. | 사용자가 의도치 않게 prefill을 망치는 risk → "자동 인식된 정보입니다" 힌트로 완화. |
| 모든 add를 `/cart/parsed`로 통일 | 코드 단순화. 두 갈래 흐름 → 한 갈래. | 백엔드의 `/cart` (URL 기반) 엔드포인트는 사실상 deadcode가 됨. **삭제는 본 작업에서 안 함** (rollback 안전성). 별도 작업으로 정리. |
| BLOCKED/SUPPORTED를 클라이언트 모듈로 추출 | 한 곳에서 관리. 헤더의 칩, fallback, validation 모두 같은 데이터 사용. | 백엔드(`product-parser.ts`)와 여전히 별도 리스트. 동기화 문서로 명시. |
| 수동 입력 폴백을 fallback으로만 노출 | 자동이 1순위라는 시그널 유지. 사용자의 "수동 입력 primary 안 됨" 우려와 일치. | 사용자가 "수동 입력만 쓰고 싶다"는 케이스는 여전히 자동 시도가 한 번 필요. → 무시 (드문 케이스). |
| 외부 페이지를 `target="_blank"`로 새 탭에 연다 | 사용자의 진짜 브라우저에서 봇 차단 우회. 북마클릿과 자연스럽게 결합. | 새 탭으로 이동하면 원래 폼 상태는 그대로 두고, 사용자가 돌아왔을 때 입력했던 URL이 그대로 있음. 좋음. |
| 자동 파싱이 unknown 사이트에서도 시도됨 | 시도해서 잘 되면 행운. 안 되면 폴백으로 자연스럽게 전환. | unknown 사이트의 fetch가 백엔드 시간을 잡아먹음 (timeout 필요). → 본 작업에서 timeout 추가는 안 함, 별도 hardening. |

---

## 5. 기능별 명칭 사용 기록

| 항목 | 명칭 | 위치 |
|---|---|---|
| 상태 머신 타입 | `Mode` | `SmartAddForm.tsx` |
| 분류 함수 | `classifyUrl` | `lib/order-vendor.ts` |
| 분류 결과 타입 | `VendorClassification` | `lib/order-vendor.ts` |
| 차단 사이트 리스트 | `BLOCKED_VENDORS` | `lib/order-vendor.ts` (백엔드 `product-parser.ts`와 동기화) |
| 지원 호스트 리스트 | `SUPPORTED_HOSTS` | `lib/order-vendor.ts` |
| 폼 값 타입 | `ProductFieldsValue` | `components/order/ProductFields.tsx` |
| 폴백 카드 컴포넌트 | `BlockedFallback` | `components/order/BlockedFallback.tsx` |
| 메인 폼 컴포넌트 | `SmartAddForm` | `components/order/SmartAddForm.tsx` |
| 자동 파싱 액션 | `runAutoParse` | `SmartAddForm.tsx` |
| 수동 입력 진입 액션 | `switchToManual` | `SmartAddForm.tsx` |
| 최종 제출 액션 | `submit` | `SmartAddForm.tsx` |

---

## 6. Pagination

본 작업에는 페이지네이션이 없습니다. 개발 원칙의 "cursor pagination 강제" 규정은 향후 목록 조회 작업 시 적용 예정입니다 (예: `/orders` 또는 `/admin/orders`의 페이지네이션 설계 시).

---

## 7. 작업 단계 (체크리스트)

> 승인 후 이 순서대로 구현. 매 단계 끝나면 typecheck + git 커밋.

- [ ] **v0.6.1** — `apps/web/src/lib/order-vendor.ts` 신규 작성, `classifyUrl` + 타입 + 리스트 추출
- [ ] **v0.6.2** — `apps/web/src/components/order/ProductFields.tsx` 신규 작성
- [ ] **v0.6.3** — `apps/web/src/components/order/BlockedFallback.tsx` 신규 작성
- [ ] **v0.6.4** — `apps/web/src/components/order/SmartAddForm.tsx` 신규 작성
- [ ] **v0.6.5** — `apps/web/src/app/[locale]/order/page.tsx` 리팩토링 (얇아짐, SmartAddForm import)
- [ ] **v0.6.6** — `apps/web/messages/{ko,en}.json` 새 키 추가
- [ ] **v0.6.7** — typecheck (`tsc --noEmit`) 클린 확인 + 단일 git 커밋 "smart add form v0.6"
- [ ] **v0.6.8** — 실제 dev 서버 띄우고 사용자가 검증:
  - 네이버 URL → 자동 파싱 → 결과 편집 → 장바구니 (toast)
  - 쿠팡 URL → 즉시 폴백 → "외부 페이지 열기" 클릭 → 새 탭 / 또는 "직접 입력" 클릭 → 입력 → 장바구니
  - 빈 상태 → 입력 안 됐을 때 UI 깨끗

피드백 받고 plan 업데이트 후 다음 작업(Portone V2)로 이동.

---

## 8. 위험 / 미해결 사항

| 위험 | 완화책 |
|---|---|
| 자동 파싱이 unknown 사이트에서 오래 걸림 (timeout 없음) | 본 작업 범위 외. fetch에 AbortController + 5초 timeout 추가하는 별도 작업으로 분리. |
| 백엔드 `/cart` (URL 기반) deadcode 화 | 본 작업에선 삭제 안 함. 별도 정리 작업 issue로 기록. |
| 수동 입력 시 가격을 음수/0으로 넣을 수 있음 | 클라이언트에서 `priceKrw <= 0`이면 submit 비활성화. 백엔드 Zod도 이미 `positive()` 강제. |
| 외부 페이지를 새 탭으로 연 사용자가 북마클릿을 미설치 | BlockedFallback에 "북마클릿 설치 안내 →" 링크 포함. 한 번 설치하면 영구 사용. |
| BLOCKED_VENDORS 리스트가 클라/백엔드 두 곳 | 본 작업에선 동기화 의무를 주석으로 명시. 통합은 별도 (가능하면 `packages/shared`로 이동). |

---

## 9. 검증 계획 (피드백)

구현 완료 후 사용자가 직접 dev 서버에서 다음 6개 케이스를 돌려서 확인:

1. **네이버 스마트스토어 URL** → 자동 파싱 성공 → 폼 prefill → 수정 없이 담기 → 장바구니에 정확한 상품
2. **네이버 스마트스토어 URL** → 자동 파싱 성공 → 가격 수정 → 담기 → 수정된 가격 반영
3. **쿠팡 URL** → 클라이언트 즉시 차단 감지 → 폴백 카드 등장 → "외부 페이지 열기" 클릭 → 새 탭에서 쿠팡 페이지 열림
4. **쿠팡 URL** → 폴백 → "직접 입력" 클릭 → 폼에 빈 필드 → 입력 → 담기 → 장바구니에 입력값 반영
5. **G마켓 URL** → 쿠팡과 동일한 흐름
6. **잘못된 URL** (예: `not a url`) → 폼이 깨지지 않음 / 버튼 비활성화

피드백은 추측이 아닌 **실제 dev 서버 실행 결과** 기반.

---

## 10. 다음 작업

본 plan 승인 + 구현 + 검증이 끝나면, 같은 plan-first 프로세스로:
→ `doc/research_portone_v2_migration.md` + `doc/plan_portone_v2_migration.md` 작성
→ V2 API Secret 받아오기 (사용자 작업)
→ 승인 → 구현
