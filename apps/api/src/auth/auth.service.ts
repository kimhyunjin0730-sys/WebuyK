import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { generateMailboxNo } from "../virtual-address/mailbox.util";
import type { SignupInput, LoginInput } from "@wbk/shared";
import type { OAuthProfile } from "./oauth/oauth.types";

const DEFAULT_VIRTUAL_ADDRESS = {
  line1: "We buy K Bonded Hub, 12 Gonghang-ro 296beon-gil",
  line2: "Bldg C, Dock 4",
  city: "Incheon",
  postal: "22382",
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signup(input: SignupInput) {
    const exists = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (exists) throw new ConflictException("Email already registered");

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        displayName: input.displayName,
        countryCode: input.countryCode,
        virtualAddress: {
          create: { mailboxNo: generateMailboxNo(), ...DEFAULT_VIRTUAL_ADDRESS },
        },
      },
      include: { virtualAddress: true },
    });
    return this.toAuthPayload(user);
  }

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { virtualAddress: true },
    });
    if (!user || !user.passwordHash) {
      // No password set → this account was created via OAuth and has no
      // local credential. Surface a generic error so we don't leak which
      // emails are OAuth-only.
      throw new UnauthorizedException("Invalid credentials");
    }
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    return this.toAuthPayload(user);
  }

  /**
   * Resolve an OAuth callback into a JWT-issued session.
   *
   * Lookup order:
   *   1. Existing OAuthAccount row (provider + providerAccountId) → reuse user
   *   2. Existing User by email → link the OAuth account to it
   *   3. Otherwise create a fresh User + virtual address + OAuth link
   *
   * Step 2 is what lets a user who originally signed up with email/password
   * later "Continue with Google" using the same email and end up in the
   * same account.
   */
  async findOrCreateOAuthUser(profile: OAuthProfile) {
    const linked = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
        },
      },
      include: { user: { include: { virtualAddress: true } } },
    });
    if (linked) return this.toAuthPayload(linked.user);

    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: profile.email },
      include: { virtualAddress: true },
    });

    let user = existingByEmail;
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          displayName: profile.displayName,
          virtualAddress: {
            create: {
              mailboxNo: generateMailboxNo(),
              ...DEFAULT_VIRTUAL_ADDRESS,
            },
          },
        },
        include: { virtualAddress: true },
      });
    }

    await this.prisma.oAuthAccount.create({
      data: {
        userId: user.id,
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      },
    });

    return this.toAuthPayload(user);
  }

  private toAuthPayload(user: {
    id: string;
    email: string;
    role: string;
    displayName: string;
    virtualAddress: { mailboxNo: string } | null;
  }) {
    const accessToken = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        mailboxNo: user.virtualAddress?.mailboxNo ?? null,
      },
    };
  }
}
