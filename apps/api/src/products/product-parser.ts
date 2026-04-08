import { BadRequestException, Injectable } from "@nestjs/common";
import type { ParsedProduct } from "@wbk/shared";

/**
 * URL → ParsedProduct.
 *
 * In production this delegates to vendor-specific scrapers / official APIs.
 * For local development we use a deterministic mock so the proxy-order flow
 * is exercisable end-to-end without depending on third-party rate limits or
 * legal review of scraping policies. Replace `parse()` with the real
 * implementation per `Open Question #1` in the implementation plan.
 */
@Injectable()
export class ProductParser {
  async parse(rawUrl: string): Promise<ParsedProduct> {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new BadRequestException("Invalid URL");
    }

    const vendor = this.detectVendor(url.hostname);
    if (!vendor) {
      throw new BadRequestException(
        `Unsupported vendor: ${url.hostname}. Supported: Coupang, Naver, Gmarket, 11st, Kream`,
      );
    }

    // Deterministic price/title from URL hash so dev runs are reproducible.
    const seed = hash(rawUrl);
    const priceKrw = 5_000 + (seed % 95) * 1_000; // 5,000 ~ 99,000 KRW
    const titleSeed = TITLES[seed % TITLES.length];

    return {
      sourceUrl: rawUrl,
      vendor,
      title: `${titleSeed} (${vendor})`,
      imageUrl: undefined,
      priceKrw,
    };
  }

  private detectVendor(host: string): string | null {
    const h = host.toLowerCase();
    if (h.includes("coupang")) return "Coupang";
    if (h.includes("naver")) return "Naver";
    if (h.includes("gmarket")) return "Gmarket";
    if (h.includes("11st")) return "11st";
    if (h.includes("kream")) return "Kream";
    return null;
  }
}

const TITLES = [
  "Laneige Lip Sleeping Mask",
  "Innisfree Green Tea Serum",
  "BTS Photobook (Limited)",
  "Stray Kids Album Set",
  "Korean Beef Jerky 200g",
  "Samyang Buldak Ramen 5-pack",
  "Kakao Friends Plush",
  "Etude House Eyeshadow Palette",
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h | 0);
}
