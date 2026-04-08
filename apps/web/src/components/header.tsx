"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function Header() {
  const t = useTranslations("nav");
  const tBrand = useTranslations("brand");
  const locale = useLocale();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const link = (href: string) => `/${locale}${href}`;
  const otherLocale = locale === "en" ? "ko" : "en";
  const switchLocaleHref = pathname.replace(`/${locale}`, `/${otherLocale}`) || `/${otherLocale}`;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href={link("/")} className="flex items-center gap-2">
          <span className="inline-block h-6 w-6 rounded bg-brand-accent" />
          <span className="text-lg font-semibold tracking-tight">
            {tBrand("name")}
          </span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href={link("/order")} className="hover:underline">
            {t("order")}
          </Link>
          <Link href={link("/cart")} className="hover:underline">
            {t("cart")}
          </Link>
          {user && (
            <>
              <Link href={link("/orders")} className="hover:underline">
                {t("orders")}
              </Link>
              <Link href={link("/address")} className="hover:underline">
                {t("address")}
              </Link>
            </>
          )}
          {user?.role === "ADMIN" && (
            <Link href={link("/admin")} className="hover:underline">
              {t("admin")}
            </Link>
          )}
          {user ? (
            <button
              onClick={logout}
              className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
            >
              {t("logout")} ({user.displayName})
            </button>
          ) : (
            <>
              <Link href={link("/login")} className="hover:underline">
                {t("login")}
              </Link>
              <Link
                href={link("/signup")}
                className="rounded bg-brand px-3 py-1 text-white hover:opacity-90"
              >
                {t("signup")}
              </Link>
            </>
          )}
          <Link
            href={switchLocaleHref}
            className="text-xs text-slate-500 hover:underline"
          >
            {otherLocale.toUpperCase()}
          </Link>
        </nav>
      </div>
    </header>
  );
}
