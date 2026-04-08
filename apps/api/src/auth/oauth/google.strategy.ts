import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import {
  Profile,
  Strategy,
  VerifyCallback,
} from "passport-google-oauth20";
import type { OAuthProfile } from "./oauth.types";

/**
 * Google OAuth 2.0. Always registered so the module loads even when env
 * vars are missing — the controller checks `oauthEnabled.google` before
 * dispatching, and the web hides the button when not configured.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || "missing",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "missing",
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:4000/api/auth/google/callback",
      scope: ["email", "profile"],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error("Google account did not return an email"), undefined);
    }
    const out: OAuthProfile = {
      provider: "google",
      providerAccountId: profile.id,
      email,
      displayName: profile.displayName ?? email.split("@")[0],
    };
    done(null, out);
  }
}
