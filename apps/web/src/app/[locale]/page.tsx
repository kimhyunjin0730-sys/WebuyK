import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Box, Camera, MapPin, Search, UserPlus } from "lucide-react";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("home");
  const tBrand = await getTranslations("brand");

  const steps = [
    { icon: <UserPlus className="h-6 w-6" />, text: t("step1") },
    { icon: <Search className="h-6 w-6" />, text: t("step2") },
    { icon: <Box className="h-6 w-6" />, text: t("step3") },
    { icon: <Camera className="h-6 w-6" />, text: t("step4") },
    { icon: <MapPin className="h-6 w-6" />, text: t("step5") },
  ];

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-premium px-8 py-20 text-white shadow-2xl transition-all hover:shadow-brand/20">
        <div className="relative z-10 max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-accent/20 px-4 py-1.5 text-sm font-medium text-brand-accent border border-brand-accent/30">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-accent opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-accent"></span>
            </span>
            {tBrand("tagline")}
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
            {t("heroTitle").split(".").map((part, i) => (
              <span key={i} className={i === 1 ? "block text-brand-gold" : "block"}>
                {part}{i === 0 ? "." : ""}
              </span>
            ))}
          </h1>
          <p className="mt-8 text-xl text-slate-300 leading-relaxed max-w-2xl">
            {t("heroSub")}
          </p>
          <div className="mt-12 flex flex-wrap gap-4">
            <Link
              href={`/${locale}/signup`}
              className="group flex items-center gap-2 rounded-full bg-brand-gold px-8 py-4 text-lg font-bold text-brand hover:scale-105 transition-all shadow-lg shadow-brand-gold/20"
            >
              {t("ctaPrimary")}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href={`/${locale}/order`}
              className="flex items-center gap-2 rounded-full border border-slate-700 bg-white/5 px-8 py-4 text-lg font-semibold hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              {t("ctaSecondary")}
            </Link>
          </div>
        </div>
        
        {/* Background Decorative Element */}
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-brand-gold/10 blur-[100px]" />
        <div className="absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-brand-accent/10 blur-[100px]" />
      </section>

      {/* Steps Section */}
      <section>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900">{t("stepsTitle")}</h2>
          <div className="mt-2 h-1.5 w-20 bg-brand-gold mx-auto rounded-full" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, i) => (
            <div
              key={i}
              className="group relative flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center transition-all hover:border-brand-gold hover:shadow-xl hover:-translate-y-1"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                {step.icon}
              </div>
              <div className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 border-2 border-white shadow-sm transition-all group-hover:bg-brand-gold group-hover:text-white">
                {i + 1}
              </div>
              <p className="mt-4 text-sm font-medium text-slate-700 leading-snug">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Quote / Stats */}
      <section className="grid md:grid-cols-3 gap-8 border-t border-slate-200 pt-12">
        <div className="text-center">
          <div className="text-3xl font-black text-brand">10k+</div>
          <div className="text-sm text-slate-500 uppercase tracking-widest mt-1">Orders Processed</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-black text-brand-accent">24h</div>
          <div className="text-sm text-slate-500 uppercase tracking-widest mt-1">Inspection Avg.</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-black text-brand">150+</div>
          <div className="text-sm text-slate-500 uppercase tracking-widest mt-1">Countries Served</div>
        </div>
      </section>
    </div>
  );
}

