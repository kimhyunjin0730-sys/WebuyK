import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, KakaoProfile } from "passport-kakao";
import type { OAuthProfile } from "./oauth.types";

/**
 * Kakao OAuth. Email comes from `_json.kakao_account.email` and is only
 * present if the app has the "account_email" scope approved by Kakao
 * (review required). When email is missing we synthesize a stable
 * placeholder so we can still create the account.
 */
@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, "kakao") {
  constructor() {
    super(
      {
        clientID: process.env.KAKAO_CLIENT_ID || "missing",
        clientSecret: process.env.KAKAO_CLIENT_SECRET || undefined,
        callbackURL:
          process.env.KAKAO_CALLBACK_URL ||
          "http://localhost:4000/api/auth/kakao/callback",
      },
      (
        _accessToken: string,
        _refreshToken: string,
        profile: KakaoProfile,
        done: (err: any, user?: any) => void,
      ) => {
        const id = String(profile.id);
        const email =
          profile._json?.kakao_account?.email ?? `kakao_${id}@noemail.kakao`;
        const displayName =
          profile.displayName ??
          profile._json?.kakao_account?.profile?.nickname ??
          profile._json?.properties?.nickname ??
          `Kakao ${id}`;
        const out: OAuthProfile = {
          provider: "kakao",
          providerAccountId: id,
          email,
          displayName,
        };
        done(null, out);
      },
    );
  }
}
