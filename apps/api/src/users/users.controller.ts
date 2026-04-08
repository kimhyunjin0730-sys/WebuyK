import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, CurrentUserPayload } from "../auth/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

@UseGuards(JwtAuthGuard)
@Controller("me")
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async me(@CurrentUser() user: CurrentUserPayload) {
    const u = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: { virtualAddress: true, backupAddress: true },
    });
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      countryCode: u.countryCode,
      mailboxNo: u.virtualAddress?.mailboxNo ?? null,
      backupAddress: u.backupAddress,
    };
  }
}
