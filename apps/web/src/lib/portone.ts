// Portone (I'mport) v1 — frontend loader + minimal type surface.
//
// We dynamically inject the IMP SDK on the first checkout click instead of
// adding it to the root layout, so users who never reach the orders page
// don't pay the script cost.
//
// The IMP code is read from NEXT_PUBLIC_PORTONE_IMP_CODE; if it's missing
// loadIMP() throws so the caller can show a friendly "결제 미설정" message
// instead of opening a broken modal.

export interface PortoneRequestPayParams {
  pg?: string;
  pay_method?: "card" | "trans" | "vbank" | "phone" | "kakaopay" | "tosspay";
  merchant_uid: string;
  name: string;
  amount: number;
  buyer_email?: string;
  buyer_name?: string;
  buyer_tel?: string;
  m_redirect_url?: string;
}

export interface PortoneResponse {
  success: boolean;
  imp_uid: string | null;
  merchant_uid: string;
  error_code?: string;
  error_msg?: string;
}

interface IMPGlobal {
  init: (impCode: string) => void;
  request_pay: (
    params: PortoneRequestPayParams,
    callback: (rsp: PortoneResponse) => void,
  ) => void;
}

declare global {
  interface Window {
    IMP?: IMPGlobal;
  }
}

const SDK_URL = "https://cdn.iamport.kr/v1/iamport.js";

let loadPromise: Promise<IMPGlobal> | null = null;

export function getImpCode(): string | null {
  return process.env.NEXT_PUBLIC_PORTONE_IMP_CODE || null;
}

export async function loadIMP(): Promise<IMPGlobal> {
  if (typeof window === "undefined") {
    throw new Error("loadIMP must be called in the browser");
  }
  if (window.IMP) return window.IMP;
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<IMPGlobal>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => {
      if (window.IMP) {
        const code = getImpCode();
        if (!code) {
          reject(
            new Error(
              "NEXT_PUBLIC_PORTONE_IMP_CODE is not set. Add it to apps/web/.env.local.",
            ),
          );
          return;
        }
        window.IMP.init(code);
        resolve(window.IMP);
      } else {
        reject(new Error("IMP SDK loaded but window.IMP is undefined"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load Portone IMP SDK"));
    document.head.appendChild(script);
  });

  return loadPromise;
}
