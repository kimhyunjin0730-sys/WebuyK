import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ProductParser } from "./product-parser";

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: ProductParser,
  ) {}

  /** Parses (or re-uses cached) a product by source URL. */
  async ingestByUrl(sourceUrl: string) {
    const cached = await this.prisma.product.findUnique({
      where: { sourceUrl },
    });
    if (cached) return cached;

    const parsed = await this.parser.parse(sourceUrl);
    return this.prisma.product.create({
      data: {
        sourceUrl: parsed.sourceUrl,
        vendor: parsed.vendor,
        title: parsed.title,
        imageUrl: parsed.imageUrl ?? null,
        priceKrw: parsed.priceKrw,
        rawJson: JSON.stringify(parsed),
      },
    });
  }

  list() {
    return this.prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
}
