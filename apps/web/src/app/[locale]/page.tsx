import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("home");
  const tBrand = await getTranslations("brand");
  return (
    <div className="space-y-12">
      <section className="rounded-2xl bg-white p-10 shadow-sm">
        <h1 className="text-4xl font-bold tracking-tight">{t("heroTitle")}</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">{t("heroSub")}</p>
        <p className="mt-2 text-sm text-slate-500">{tBrand("tagline")}</p>
        <div className="mt-6 flex gap-3">
          <Link
            href={`/${locale}/signup`}
            className="rounded bg-brand px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            {t("ctaPrimary")}
          </Link>
          <Link
            href={`/${locale}/order`}
            className="rounded border border-slate-300 px-5 py-2.5 text-sm font-medium hover:bg-slate-100"
          >
            {t("ctaSecondary")}
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t("stepsTitle")}</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-5">
          {[t("step1"), t("step2"), t("step3"), t("step4"), t("step5")].map(
            (text, i) => (
              <li
                key={i}
                className="rounded-lg border border-slate-200 bg-white p-4 text-sm"
              >
                <div className="text-2xl font-bold text-brand-accent">
                  {i + 1}
                </div>
                <p className="mt-2 text-slate-700">{text}</p>
              </li>
            ),
          )}
        </ol>
      </section>
    </div>
  );
}
