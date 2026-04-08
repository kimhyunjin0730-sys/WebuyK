import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";
import { GoogleStrategy } from "./oauth/google.strategy";
import { KakaoStrategy } from "./oauth/kakao.strategy";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "dev-only-change-me",
      signOptions: { expiresIn: "7d" },
    }),
  ],
  providers: [AuthService, JwtStrategy, GoogleStrategy, KakaoStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
