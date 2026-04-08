"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useAuth } from "@/lib/auth-context";

function CallbackInner() {
  const params = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const { acceptToken } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setError("Missing token in callback");
      return;
    }
    acceptToken(token)
      .then(() => router.replace(`/${locale}/order`))
      .catch((e) => setError(e?.message ?? "Failed to complete sign-in"));
  }, [params, router, locale, acceptToken]);

  if (error) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <p className="text-sm text-red-600">{error}</p>
        <a href={`/${locale}/login`} className="mt-3 inline-block text-sm underline">
          Back to sign-in
        </a>
      </div>
    );
  }
  return (
    <div className="card mx-auto max-w-md text-center text-sm text-slate-500">
      Completing sign-in…
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}
