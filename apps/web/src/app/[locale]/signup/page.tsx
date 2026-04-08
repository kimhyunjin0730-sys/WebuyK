"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { OAuthButtons } from "@/components/oauth-buttons";

export default function SignupPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const { signup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState("US");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signup({ email, password, displayName, countryCode: country });
      router.push(`/${locale}/address`);
    } catch (err: any) {
      setError(err.message ?? "Signup failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm rounded-xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">{t("signupTitle")}</h1>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase text-slate-500">
            {t("displayName")}
          </span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase text-slate-500">
            {t("email")}
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase text-slate-500">
            {t("password")}
          </span>
          <input
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase text-slate-500">
            {t("country")}
          </span>
          <input
            value={country}
            maxLength={2}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            className="input"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "…" : t("submitSignup")}
        </button>
      </form>
      <div className="mt-4">
        <OAuthButtons />
      </div>
      <Link
        href={`/${locale}/login`}
        className="mt-4 block text-center text-sm text-slate-500 hover:underline"
      >
        {t("switchToLogin")}
      </Link>
    </div>
  );
}
