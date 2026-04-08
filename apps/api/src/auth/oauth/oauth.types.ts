// Shared shape that every OAuth strategy normalizes profiles into before
// handing them to AuthService. Keeps provider-specific quirks isolated.
export interface OAuthProfile {
  provider: "google" | "kakao";
  providerAccountId: string;
  email: string;
  displayName: string;
}
