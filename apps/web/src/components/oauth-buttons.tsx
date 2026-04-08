"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api-client";

interface ProviderInfo {
  enabled: boolean;
  mock: boolean;
  url: string; // path returned by API, e.g. "/api/auth/google" or "/api/auth/mock?provider=google"
}

type ProvidersResponse = {
  google: ProviderInfo;
  kakao: ProviderInfo;
};

// API_BASE_URL ends in "/api". The provider URLs the server returns also
// start with "/api" so we strip the duplicate prefix to avoid /api/api/...
const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "");

export function OAuthButtons() {
  const [providers, setProviders] = useState<ProvidersResponse | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/auth/providers`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setProviders)
      .catch(() => setProviders(null));
  }, []);

  if (!providers) return null;
  const { google, kakao } = providers;
  if (!google.enabled && !kakao.enabled) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <hr className="flex-1 border-slate-200" />
        <span>OR</span>
        <hr className="flex-1 border-slate-200" />
      </div>
      {google.enabled && (
        <ProviderLink
          href={`${API_ORIGIN}${google.url}`}
          mock={google.mock}
          label="Continue with Google"
          className="border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
          icon="G"
        />
      )}
      {kakao.enabled && (
        <ProviderLink
          href={`${API_ORIGIN}${kakao.url}`}
          mock={kakao.mock}
          label="Continue with Kakao"
          className="bg-[#FEE500] text-[#191600] hover:brightness-95"
          icon="K"
        />
      )}
    </div>
  );
}

function ProviderLink({
  href,
  mock,
  label,
  icon,
  className,
}: {
  href: string;
  mock: boolean;
  label: string;
  icon: string;
  className: string;
}) {
  return (
    <a
      href={href}
      className={`flex w-full items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium ${className}`}
    >
      <span aria-hidden className="font-bold">
        {icon}
      </span>
      <span>{label}</span>
      {mock && (
        <span className="ml-2 rounded bg-slate-900/10 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider">
          test
        </span>
      )}
    </a>
  );
}
