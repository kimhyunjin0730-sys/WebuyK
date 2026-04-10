import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ProductParser } from "./product-parser";
import { VisionParser } from "./vision-parser";

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: ProductParser,
    private readonly vision: VisionParser,
  ) {}

  /**
   * Parses a product by source URL. Cached rows are refreshed if older than
   * CACHE_TTL_MS so prices stay reasonably current and old mock data from
   * previous parser implementations is replaced on first re-fetch.
   */
  private static readonly CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

  async ingestByUrl(sourceUrl: string, mode: "fast" | "playwright" = "fast") {
    // Look up an existing row regardless of mode so we can update it on
    // re-parse, but only honor the TTL cache in fast mode — precise mode is
    // opt-in and should always re-fetch when the user asks for it.
    const cached = await this.prisma.product.findUnique({
      where: { sourceUrl },
    });
    if (
      mode === "fast" &&
      cached &&
      Date.now() - cached.createdAt.getTime() < ProductsService.CACHE_TTL_MS
    ) {
      return cached;
    }

    const parsed = await this.parser.parse(sourceUrl, mode);
    const data = {
      sourceUrl: parsed.sourceUrl,
      vendor: parsed.vendor,
      title: parsed.title,
      imageUrl: parsed.imageUrl ?? null,
      priceKrw: parsed.priceKrw,
      rawJson: JSON.stringify(parsed),
    };
    if (cached) {
      return this.prisma.product.update({
        where: { id: cached.id },
        data,
      });
    }
    return this.prisma.product.create({ data });
  }

  /**
   * Bookmarklet entry point. Trusts caller-provided fields (since they were
   * extracted from the user's authenticated browser session) and upserts on
   * sourceUrl so the same product across cart adds shares one row.
   */
  /**
   * Vision (screenshot) entry point. Sends the image to Claude, then upserts
   * the result keyed by sourceUrl (or a generated vision:// pseudo-url when
   * the user did not provide a source link).
   */
  async ingestByImage(input: {
    imageBase64: string;
    mimeType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
    sourceUrl?: string;
  }) {
    const parsed = await this.vision.parseImage(input);
    return this.upsertParsed({
      sourceUrl: parsed.sourceUrl,
      title: parsed.title,
      priceKrw: parsed.priceKrw,
      imageUrl: parsed.imageUrl,
      vendor: parsed.vendor,
    });
  }

  async upsertParsed(input: {
    sourceUrl: string;
    title: string;
    priceKrw: number;
    imageUrl?: string;
    vendor?: string;
  }) {
    const vendor = input.vendor || guessVendor(input.sourceUrl) || "Unknown";
    const data = {
      sourceUrl: input.sourceUrl,
      vendor,
      title: input.title,
      imageUrl: input.imageUrl ?? null,
      priceKrw: input.priceKrw,
      rawJson: JSON.stringify({ ...input, vendor, source: "bookmarklet" }),
    };
    const existing = await this.prisma.product.findUnique({
      where: { sourceUrl: input.sourceUrl },
    });
    if (existing) {
      return this.prisma.product.update({ where: { id: existing.id }, data });
    }
    return this.prisma.product.create({ data });
  }

  list() {
    return this.prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
}

function guessVendor(rawUrl: string): string | null {
  try {
    const h = new URL(rawUrl).hostname.toLowerCase();
    if (h.includes("coupang")) return "Coupang";
    if (h.includes("naver") || h.includes("smartstore")) return "Naver";
    if (h.includes("gmarket")) return "Gmarket";
    if (h.includes("11st")) return "11st";
    if (h.includes("kream")) return "Kream";
    return null;
  } catch {
    return null;
  }
}
