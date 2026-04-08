"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface VirtualAddress {
  mailboxNo: string;
  formattedLines: string[];
}

export default function AddressPage() {
  const t = useTranslations("address");
  const { user, loading } = useAuth();
  const [va, setVa] = useState<VirtualAddress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api<VirtualAddress>("/me/virtual-address")
      .then(setVa)
      .catch((e) => setError(e.message));
  }, [user]);

  if (loading) return <p>Loading…</p>;
  if (!user) return <p>Please sign in.</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!va) return <p>Loading address…</p>;

  return (
    <div className="card">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-2 text-sm text-slate-600">{t("intro")}</p>

      <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 font-mono text-sm leading-7">
        {va.formattedLines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>

      <div className="mt-4 inline-flex items-center gap-2 rounded bg-brand-accent/10 px-3 py-2 text-sm font-medium text-brand-accent">
        Mailbox #: {va.mailboxNo}
      </div>
    </div>
  );
}
