import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import * as cheerio from "cheerio";
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

function blockedHint(name: string): string {
  return (
    `${name}은(는) 봇 차단 정책 때문에 URL 자동 인식이 불가능합니다. ` +
    `${name} 상품을 담으려면 /bookmarklet 페이지의 북마클릿을 설치해 사용해주세요.`
  );
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface JsonLdProduct {
  name?: string;
  image?: string;
  priceRaw?: string | number;
}

@Injectable()
export class ProductParser {
  private readonly logger = new Logger(ProductParser.name);

  async parse(rawUrl: string): Promise<ParsedProduct> {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new BadRequestException("Invalid URL");
    }

    const host = url.hostname.toLowerCase();
    const blocked = BLOCKED_VENDORS.find((b) => host.includes(b.match));
    if (blocked) {
      throw new BadRequestException(blockedHint(blocked.name));
    }
    const vendor = this.detectVendor(host);
    if (!vendor) {
      throw new BadRequestException(
        `지원하지 않는 사이트입니다: ${url.hostname}. 지원 목록: 네이버 스마트스토어/쇼핑, Kream, 11번가. ` +
          `쿠팡·G마켓은 /bookmarklet 페이지의 북마클릿을 사용해주세요.`,
      );
    }

    const html = await this.fetchHtml(rawUrl, vendor);
    const $ = cheerio.load(html);

    const jsonLd = this.extractJsonLd($);
    const og = {
      title: $('meta[property="og:title"]').attr("content"),
      image: $('meta[property="og:image"]').attr("content"),
      price: $(
        'meta[property="og:price:amount"], meta[property="product:price:amount"]',
      ).attr("content"),
    };

    const rawTitle =
      jsonLd?.name ||
      og.title ||
      $("title").text().trim() ||
      null;
    const imageUrl = jsonLd?.image || og.image || undefined;
    const rawPrice = jsonLd?.priceRaw ?? og.price ?? null;
    const priceKrw = rawPrice != null ? this.parseKrw(rawPrice) : null;

    if (!rawTitle || !priceKrw) {
      this.logger.warn(
        `Parse failed for ${vendor} ${rawUrl}: title=${!!rawTitle} price=${priceKrw}`,
      );
      throw new BadRequestException(
        `${vendor} 상품 정보 자동 인식에 실패했습니다 (${!rawTitle ? "제목" : "가격"} 추출 실패). ` +
          `상품 페이지가 봇 차단되었거나 메타 태그가 없을 수 있습니다.`,
      );
    }

    return {
      sourceUrl: rawUrl,
      vendor,
      title: this.cleanTitle(rawTitle),
      imageUrl,
      priceKrw,
    };
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

  private detectVendor(host: string): string | null {
    const h = host.toLowerCase();
    // Coupang and Gmarket intentionally excluded — use the bookmarklet.
    if (h.includes("naver") || h.includes("smartstore")) return "Naver";
    if (h.includes("11st")) return "11st";
    if (h.includes("kream")) return "Kream";
    return null;
  }
}
