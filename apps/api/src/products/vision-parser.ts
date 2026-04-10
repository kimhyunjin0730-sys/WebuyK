import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import type { ParsedProduct } from "@wbk/shared";

/**
 * Screenshot → ParsedProduct via Claude vision.
 *
 * The user uploads a screenshot of any product page (typically taken on
 * their own authenticated session, so no bot wall to bypass) and Claude
 * extracts title / price / vendor as structured JSON.
 *
 * Cheap and site-agnostic — recommended fallback when Playwright fails or
 * the site is unknown.
 */
@Injectable()
export class VisionParser {
  private readonly logger = new Logger(VisionParser.name);
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (this.client) return this.client;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new BadRequestException(
        "스크린샷 모드 비활성화: 서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다.",
      );
    }
    this.client = new Anthropic({ apiKey });
    return this.client;
  }

  async parseImage(input: {
    imageBase64: string;
    mimeType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
    sourceUrl?: string;
  }): Promise<ParsedProduct> {
    const client = this.getClient();

    const systemPrompt =
      "You extract Korean e-commerce product info from a screenshot. " +
      "Return ONLY a JSON object matching this TypeScript type: " +
      `{ "title": string, "priceKrw": number, "vendor": string, "imageUrl"?: string }. ` +
      "title should be the product name in its original language. " +
      "priceKrw is the listed selling price in Korean Won as an integer (no commas, no currency symbol). " +
      "vendor is the marketplace name (Coupang, Naver, Gmarket, Olive Young, Kream, 11st, etc.) or 'Unknown'. " +
      "If you cannot determine the price, use 0. Never wrap the JSON in markdown fences.";

    let message;
    try {
      message = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 512,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: input.mimeType,
                  data: input.imageBase64,
                },
              },
              {
                type: "text",
                text:
                  "Extract the product info from this screenshot as JSON. " +
                  (input.sourceUrl
                    ? `Source URL hint: ${input.sourceUrl}`
                    : "No source URL provided."),
              },
            ],
          },
        ],
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      this.logger.warn(`Anthropic vision call failed: ${msg}`);
      throw new BadRequestException(`스크린샷 인식 실패: ${msg}`);
    }

    const textBlock = message.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new BadRequestException("스크린샷에서 상품 정보를 추출하지 못했습니다.");
    }

    const parsed = this.extractJson(textBlock.text);
    if (!parsed?.title) {
      throw new BadRequestException(
        "스크린샷에서 상품명을 찾지 못했습니다. 다른 이미지로 시도해주세요.",
      );
    }

    return {
      sourceUrl: input.sourceUrl ?? `vision://${Date.now()}`,
      vendor: parsed.vendor || "Unknown",
      title: String(parsed.title).slice(0, 200),
      imageUrl: parsed.imageUrl || undefined,
      priceKrw:
        typeof parsed.priceKrw === "number" &&
        Number.isFinite(parsed.priceKrw) &&
        parsed.priceKrw > 0
          ? Math.round(parsed.priceKrw)
          : 0,
    };
  }

  // Claude usually returns clean JSON given the system prompt, but be lenient
  // about accidental ```json fences just in case.
  private extractJson(raw: string): {
    title?: string;
    priceKrw?: number;
    vendor?: string;
    imageUrl?: string;
  } | null {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      // Try to find the first {...} block
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) return null;
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
  }
}
