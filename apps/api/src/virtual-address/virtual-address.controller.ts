import { Controller, Get, NotFoundException, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, CurrentUserPayload } from "../auth/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

@UseGuards(JwtAuthGuard)
@Controller("me/virtual-address")
export class VirtualAddressController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get(@CurrentUser() user: CurrentUserPayload) {
    const va = await this.prisma.virtualAddress.findUnique({
      where: { userId: user.userId },
    });
    if (!va) throw new NotFoundException("Virtual address not assigned");
    return {
      mailboxNo: va.mailboxNo,
      formattedLines: [
        `${va.line1}`,
        va.line2 ?? "",
        `${va.city} ${va.postal}`,
        `Korea, Republic of`,
        `Recipient code: ${va.mailboxNo}`,
      ].filter(Boolean),
    };
  }
}
