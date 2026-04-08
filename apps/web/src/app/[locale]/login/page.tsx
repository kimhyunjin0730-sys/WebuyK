"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { OAuthButtons } from "@/components/oauth-buttons";

export default function LoginPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("demo@wbk.test");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.push(`/${locale}/order`);
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm rounded-xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">{t("loginTitle")}</h1>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <Field label={t("email")}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            required
          />
        </Field>
        <Field label={t("password")}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            required
          />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "…" : t("submitLogin")}
        </button>
      </form>
      <div className="mt-4">
        <OAuthButtons />
      </div>
      <Link
        href={`/${locale}/signup`}
        className="mt-4 block text-center text-sm text-slate-500 hover:underline"
      >
        {t("switchToSignup")}
      </Link>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
