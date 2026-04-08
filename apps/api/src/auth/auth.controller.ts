import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { ZodValidate } from "../common/zod.pipe";
import { LoginSchema, SignupSchema } from "@wbk/shared";
import type { OAuthProfile } from "./oauth/oauth.types";

type ProviderName = "google" | "kakao";

interface ProviderInfo {
  enabled: boolean;
  mock: boolean;
  url: string; // path the web client should send the user to
}

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("signup")
  signup(@Body(new ZodValidate(SignupSchema)) body: any) {
    return this.auth.signup(body);
  }

  @Post("login")
  login(@Body(new ZodValidate(LoginSchema)) body: any) {
    return this.auth.login(body);
  }

  /**
   * Public discovery endpoint — the web sign-in page calls this on mount
   * and renders one button per provider, pointing at whichever URL the
   * server says is currently active. When OAuth env vars are missing the
   * URL points at the local mock so the entire flow remains clickable in
   * dev / CI without third-party credentials.
   */
  @Get("providers")
  providers(): Record<ProviderName, ProviderInfo> {
    return {
      google: this.providerInfo(
        "google",
        Boolean(
          process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
        ),
      ),
      kakao: this.providerInfo("kakao", Boolean(process.env.KAKAO_CLIENT_ID)),
    };
  }

  private providerInfo(name: ProviderName, configured: boolean): ProviderInfo {
    return configured
      ? { enabled: true, mock: false, url: `/api/auth/${name}` }
      : { enabled: true, mock: true, url: `/api/auth/mock?provider=${name}` };
  }

  // ---------- Google ----------
  @Get("google")
  @UseGuards(AuthGuard("google"))
  googleStart() {
    // Passport handles the redirect to Google.
  }

  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  googleCallback(@Req() req: Request, @Res() res: Response) {
    return this.completeOAuth(req, res);
  }

  // ---------- Kakao ----------
  @Get("kakao")
  @UseGuards(AuthGuard("kakao"))
  kakaoStart() {
    // Passport handles the redirect to Kakao.
  }

  @Get("kakao/callback")
  @UseGuards(AuthGuard("kakao"))
  kakaoCallback(@Req() req: Request, @Res() res: Response) {
    return this.completeOAuth(req, res);
  }

  // ---------- Mock provider (dev/test only) ----------
  /**
   * Pretends to be Google/Kakao without contacting them. Hitting this URL
   * is equivalent to a user clicking "Approve" on the real consent screen.
   *
   * Default behavior: log in (or create) a stable per-provider test user
   * so repeated clicks resume the same account.
   *
   * Override for ad-hoc identities:
   *   GET /api/auth/mock?provider=google&email=alice@wbk.test&name=Alice
   */
  @Get("mock")
  async mockOAuth(
    @Query("provider") provider: ProviderName,
    @Query("email") email: string | undefined,
    @Query("name") name: string | undefined,
    @Res() res: Response,
  ) {
    if (provider !== "google" && provider !== "kakao") {
      return res.status(400).send("provider must be 'google' or 'kakao'");
    }
    const safeEmail = email && /.+@.+\..+/.test(email) ? email : `${provider}-test@wbk.test`;
    const safeName = name?.slice(0, 60) || (provider === "google" ? "Google Test User" : "Kakao Test User");
    const profile: OAuthProfile = {
      provider,
      // Stable id derived from email so the same email always maps to the
      // same OAuthAccount row regardless of how many times you click.
      providerAccountId: `mock-${provider}-${safeEmail}`,
      email: safeEmail,
      displayName: safeName,
    };
    return this.completeOAuth(profile, res);
  }

  /**
   * Shared tail for every OAuth provider (real or mock): turn the
   * normalized profile into a JWT and bounce the browser back to the web
   * app's /auth/callback page, which stores the token in localStorage and
   * routes the user onward.
   */
  private async completeOAuth(profileOrReq: OAuthProfile | Request, res: Response) {
    const profile =
      "provider" in profileOrReq
        ? profileOrReq
        : ((profileOrReq as Request).user as OAuthProfile);
    const result = await this.auth.findOrCreateOAuthUser(profile);
    const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
    const url = new URL(`${webOrigin}/en/auth/callback`);
    url.searchParams.set("token", result.accessToken);
    return res.redirect(url.toString());
  }
}
