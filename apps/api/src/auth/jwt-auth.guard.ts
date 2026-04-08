import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}

@Injectable()
export class AdminGuard extends AuthGuard("jwt") {
  handleRequest<TUser = any>(err: any, user: any, _info: any, _ctx: ExecutionContext): TUser {
    if (err || !user || user.role !== "ADMIN") {
      throw err ?? new Error("Forbidden: admin only");
    }
    return user as TUser;
  }
}
