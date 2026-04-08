export const routing = {
  locales: ["en", "ko"] as const,
  defaultLocale: "en" as const,
};
export type Locale = (typeof routing.locales)[number];
