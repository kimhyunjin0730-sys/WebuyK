// Minimal type shim for passport-kakao (no official @types package).
declare module "passport-kakao" {
  import { Strategy as PassportStrategy } from "passport";

  export interface KakaoStrategyOptions {
    clientID: string;
    clientSecret?: string;
    callbackURL: string;
  }

  export interface KakaoProfile {
    id: string | number;
    username?: string;
    displayName?: string;
    _json?: {
      id: number;
      kakao_account?: {
        email?: string;
        profile?: { nickname?: string };
      };
      properties?: { nickname?: string };
    };
  }

  export type KakaoVerify = (
    accessToken: string,
    refreshToken: string,
    profile: KakaoProfile,
    done: (err: any, user?: any) => void,
  ) => void;

  export class Strategy extends PassportStrategy {
    constructor(options: KakaoStrategyOptions, verify: KakaoVerify);
    name: string;
  }
}
