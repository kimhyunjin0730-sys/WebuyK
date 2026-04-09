"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Globe, LogIn, LogOut, Package, ShoppingCart, User } from "lucide-react";

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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href={link("/")} className="flex items-center gap-2 group">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-brand group-hover:bg-brand-accent transition-colors">
            <span className="text-white font-bold text-lg">K</span>
            <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-brand-gold border-2 border-white" />
          </div>
          <span className="text-xl font-bold tracking-tighter text-brand">
            {tBrand("name")}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          <Link href={link("/order")} className="flex items-center gap-1.5 text-slate-600 hover:text-brand transition-colors">
            <Package className="h-4 w-4" />
            {t("order")}
          </Link>
          <Link href={link("/cart")} className="flex items-center gap-1.5 text-slate-600 hover:text-brand transition-colors">
            <ShoppingCart className="h-4 w-4" />
            {t("cart")}
          </Link>
          {user && (
            <>
              <Link href={link("/orders")} className="text-slate-600 hover:text-brand transition-colors">
                {t("orders")}
              </Link>
              <Link href={link("/address")} className="text-slate-600 hover:text-brand transition-colors">
                {t("address")}
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href={switchLocaleHref}
            className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <Globe className="h-3 w-3" />
            {otherLocale.toUpperCase()}
          </Link>

          <div className="h-6 w-px bg-slate-200" />

          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm font-medium text-slate-600 md:inline">
                {user.displayName}
              </span>
              <button
                onClick={logout}
                className="flex items-center justify-center rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 hover:text-brand-accent transition-all"
                title={t("logout")}
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href={link("/login")}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 hover:text-brand transition-colors"
              >
                <LogIn className="h-4 w-4" />
                {t("login")}
              </Link>
              <Link
                href={link("/signup")}
                className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-white shadow-lg shadow-brand/10 hover:opacity-90 transition-all hover:scale-105 active:scale-95"
              >
                {t("signup")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

