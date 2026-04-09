import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
} from "@nestjs/common";
import * as cheerio from "cheerio";
import type { Browser } from "playwright";
import type { ParsedProduct } from "@wbk/shared";

/**
 * URL → ParsedProduct.
 *
 * Real best-effort scraper for vendors that don't actively block bots.
 * Strategy:
 *   1. reject blocked vendors (Coupang, Gmarket) up front with a clear
 *      message pointing the user to the bookmarklet workaround
 *   2. fetch the URL with browser-like headers
 *   3. parse JSON-LD `Product` schema (most reliable when present)
 *   4. fall back to OpenGraph meta tags
 *   5. fall back to <title>
 *   6. throw a clear error if title or price still missing
 *
 * Blocked vendors must use the bookmarklet at /bookmarklet which extracts
 * product data from the user's authenticated browser tab, bypassing edge-
 * level bot detection (Akamai for Coupang, similar for Gmarket).
 */

// Hostname substring → display name. The order page mirrors this list so
// the same set of sites is rejected client-side without a round trip.
const BLOCKED_VENDORS: { match: string; name: string }[] = [
  { match: "coupang", name: "쿠팡" },
  { match: "gmarket", name: "G마켓" },
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface JsonLdProduct {
  name?: string;
  image?: string;
  priceRaw?: string | number;
}

@Injectable()
export class ProductParser implements OnModuleDestroy {
  private readonly logger = new Logger(ProductParser.name);
  // Lazily-launched shared browser. Reused across requests so we only pay
  // the chromium startup cost once. null when Playwright isn't installed
  // (e.g. on Vercel serverless) — fast mode still works.
  private browser: Browser | null = null;

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close().catch(() => undefined);
      this.browser = null;
    }
  }

  async parse(
    rawUrl: string,
    mode: "fast" | "playwright" = "fast",
  ): Promise<ParsedProduct> {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new BadRequestException("Invalid URL");
    }

    const host = url.hostname.toLowerCase();
    const isBlockedVendor = BLOCKED_VENDORS.some((b) => host.includes(b.match));
    const vendor =
      this.detectVendor(host) ||
      (isBlockedVendor ? "Search-Optimized Site" : "General");

    // Playwright path: real headless browser. Used for bot-protected sites
    // (Coupang, G마켓) or whenever the user explicitly chooses precise mode.
    if (mode === "playwright") {
      return this.parseWithPlaywright(rawUrl, vendor);
    }

    let html: string;
    try {
      if (isBlockedVendor) {
        this.logger.log(
          `Fast mode hit blocked vendor ${vendor}; suggesting playwright/vision`,
        );
        throw new BadRequestException(
          `${vendor}은(는) 봇 차단 정책 때문에 빠른 모드로 인식할 수 없습니다. ` +
            `정밀(Playwright) 모드 또는 스크린샷 모드를 사용해주세요.`,
        );
      }
      html = await this.fetchHtml(rawUrl, vendor);
    } catch (e) {
      throw e;
    }

    const $ = cheerio.load(html);

    const jsonLd = this.extractJsonLd($);
    const og = {
      title: $('meta[property="og:title"]').attr("content") || $('meta[name="twitter:title"]').attr("content"),
      image: $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content"),
      price: $(
        'meta[property="og:price:amount"], meta[property="product:price:amount"], meta[name="product:price:amount"]',
      ).attr("content"),
    };

    // Specific vendor selectors (fallback)
    let vendorPrice: string | null = null;
    if (vendor === "Olive Young") {
      vendorPrice = $(".price-2 .tx_cur").first().text().trim() || 
                    $(".price .tx_cur").first().text().trim() ||
                    $(".price-1 .tx_cur").first().text().trim();
    } else if (vendor === "Naver") {
      vendorPrice = $('meta[property="product:price:amount"]').attr("content") || 
                    $(".price_main").first().text().trim();
    }

    const rawTitle =
      jsonLd?.name ||
      og.title ||
      $("h1").first().text().trim() ||
      $("title").text().trim() ||
      null;
    const imageUrl = jsonLd?.image || og.image || undefined;
    const rawPrice = jsonLd?.priceRaw ?? og.price ?? vendorPrice ?? this.trySearchPrice($) ?? null;
    const priceKrw = rawPrice != null ? this.parseKrw(rawPrice) : null;


    if (!rawTitle) {
      throw new BadRequestException("상품명을 찾을 수 없습니다. 수동으로 입력해 주세요.");
    }

    return {
      sourceUrl: rawUrl,
      vendor,
      title: this.cleanTitle(rawTitle),
      imageUrl,
      priceKrw: priceKrw || 0, // Default to 0 instead of failing, user can fix it manually
    };
  }

  private trySearchPrice($: cheerio.CheerioAPI): string | null {
    // Look for common price patterns in text if meta tags missing
    const text = $("body").text().slice(0, 10000); // Check first 10k chars
    const match = text.match(/(\d{1,3}(,\d{3})*)\s?원/);
    return match ? match[1] : null;
  }


  private async fetchHtml(rawUrl: string, vendor: string): Promise<string> {
    try {
      const res = await fetch(rawUrl, {
        headers: {
          "User-Agent": UA,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache",
        },
        redirect: "follow",
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      return await res.text();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      this.logger.warn(`Fetch failed for ${rawUrl}: ${msg}`);
      throw new BadRequestException(
        `${vendor} 상품 페이지 가져오기 실패 (${msg}). 사이트가 봇을 차단 중일 수 있습니다.`,
      );
    }
  }

  private extractJsonLd($: cheerio.CheerioAPI): JsonLdProduct | null {
    const scripts = $('script[type="application/ld+json"]').toArray();
    for (const el of scripts) {
      const text = $(el).text();
      if (!text.trim()) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        continue;
      }
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const product = this.findProductNode(item);
        if (product) return product;
      }
    }
    return null;
  }

  private findProductNode(node: unknown): JsonLdProduct | null {
    if (!node || typeof node !== "object") return null;
    const obj = node as Record<string, unknown>;
    const t = obj["@type"];
    const isProduct =
      t === "Product" || (Array.isArray(t) && t.includes("Product"));
    if (isProduct) {
      const offers = obj.offers;
      const offer = Array.isArray(offers) ? offers[0] : offers;
      const offerObj = (offer ?? {}) as Record<string, unknown>;
      const priceSpec = offerObj.priceSpecification as
        | Record<string, unknown>
        | undefined;
      const image = obj.image;
      return {
        name: typeof obj.name === "string" ? obj.name : undefined,
        image:
          typeof image === "string"
            ? image
            : Array.isArray(image) && typeof image[0] === "string"
              ? (image[0] as string)
              : undefined,
        priceRaw:
          (offerObj.price as string | number | undefined) ??
          (priceSpec?.price as string | number | undefined),
      };
    }
    // Some sites wrap Product inside @graph
    const graph = obj["@graph"];
    if (Array.isArray(graph)) {
      for (const child of graph) {
        const found = this.findProductNode(child);
        if (found) return found;
      }
    }
    return null;
  }

  private parseKrw(s: string | number): number | null {
    if (typeof s === "number") return Math.round(s) > 0 ? Math.round(s) : null;
    const cleaned = s.replace(/[^\d.]/g, "");
    if (!cleaned) return null;
    const n = Math.round(parseFloat(cleaned));
    return n > 0 ? n : null;
  }

  private cleanTitle(s: string): string {
    return s.replace(/\s+/g, " ").trim().slice(0, 200);
  }

  /**
   * Headless-browser path. Spins up a real Chromium, navigates to the URL,
   * waits for network idle, then extracts JSON-LD / OG / vendor selectors
   * from the rendered DOM. Reuses one browser process across requests.
   *
   * Requires the `playwright` dependency and (in production) an environment
   * where Chromium can be installed — Render/Fly with the Playwright base
   * image, NOT Vercel serverless.
   */
  private async parseWithPlaywright(
    rawUrl: string,
    vendor: string,
  ): Promise<ParsedProduct> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      userAgent: UA,
      locale: "ko-KR",
      viewport: { width: 1280, height: 800 },
      extraHTTPHeaders: {
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    const page = await context.newPage();
    try {
      await page.goto(rawUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      // Best-effort wait for vendor-specific selectors so dynamic prices render.
      await page
        .waitForLoadState("networkidle", { timeout: 8_000 })
        .catch(() => undefined);

      const html = await page.content();
      const $ = cheerio.load(html);
      const jsonLd = this.extractJsonLd($);
      const og = {
        title:
          $('meta[property="og:title"]').attr("content") ||
          $('meta[name="twitter:title"]').attr("content"),
        image:
          $('meta[property="og:image"]').attr("content") ||
          $('meta[name="twitter:image"]').attr("content"),
        price: $(
          'meta[property="og:price:amount"], meta[property="product:price:amount"], meta[name="product:price:amount"]',
        ).attr("content"),
      };

      // Vendor-specific DOM selectors (only used when JSON-LD/OG miss)
      let vendorTitle: string | null = null;
      let vendorPrice: string | null = null;
      let vendorImage: string | null = null;
      if (vendor === "Coupang") {
        vendorTitle = $("h1.prod-buy-header__title").first().text().trim() || null;
        vendorPrice =
          $(".total-price strong").first().text().trim() ||
          $(".prod-price .total-price").first().text().trim() ||
          null;
        vendorImage = $(".prod-image__detail").attr("src") || null;
      } else if (vendor === "Gmarket") {
        vendorTitle = $(".itemtit").first().text().trim() || null;
        vendorPrice = $(".price_real").first().text().trim() || null;
      } else if (vendor === "Naver") {
        vendorPrice =
          $('meta[property="product:price:amount"]').attr("content") ||
          $("._1LY7DqCnwR").first().text().trim() ||
          null;
      } else if (vendor === "Olive Young") {
        vendorPrice =
          $(".price-2 .tx_cur").first().text().trim() ||
          $(".price .tx_cur").first().text().trim() ||
          null;
      }

      const rawTitle =
        jsonLd?.name ||
        og.title ||
        vendorTitle ||
        $("h1").first().text().trim() ||
        $("title").text().trim() ||
        null;
      const imageUrl =
        jsonLd?.image || og.image || vendorImage || undefined;
      const rawPrice =
        jsonLd?.priceRaw ?? og.price ?? vendorPrice ?? this.trySearchPrice($);
      const priceKrw = rawPrice != null ? this.parseKrw(rawPrice) : null;

      if (!rawTitle) {
        throw new BadRequestException(
          "정밀 모드에서도 상품명을 찾지 못했습니다. 스크린샷 모드를 시도해주세요.",
        );
      }
      return {
        sourceUrl: rawUrl,
        vendor,
        title: this.cleanTitle(rawTitle),
        imageUrl: imageUrl ?? undefined,
        priceKrw: priceKrw || 0,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      this.logger.warn(`Playwright parse failed for ${rawUrl}: ${msg}`);
      throw new BadRequestException(
        `정밀 모드 인식 실패 (${msg}). 스크린샷 모드를 시도해보세요.`,
      );
    } finally {
      await context.close().catch(() => undefined);
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser) return this.browser;
    // Lazy-import so the module still loads on environments without
    // playwright installed (e.g. local dev that hasn't run pnpm install yet).
    let chromium: typeof import("playwright").chromium;
    try {
      ({ chromium } = await import("playwright"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      throw new BadRequestException(
        `정밀 모드는 Playwright가 설치된 서버에서만 동작합니다 (${msg}).`,
      );
    }
    this.browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    return this.browser;
  }

  private detectVendor(host: string): string | null {
    const h = host.toLowerCase();
    if (h.includes("naver") || h.includes("smartstore")) return "Naver";
    if (h.includes("11st")) return "11st";
    if (h.includes("kream")) return "Kream";
    if (h.includes("oliveyoung")) return "Olive Young";
    if (h.includes("coupang")) return "Coupang";
    if (h.includes("gmarket")) return "Gmarket";
    return null;
  }
}

