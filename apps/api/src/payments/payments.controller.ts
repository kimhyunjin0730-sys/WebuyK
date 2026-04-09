import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, CurrentUserPayload } from "../auth/current-user.decorator";
import { PaymentsService } from "./payments.service";

interface CaptureBody {
  impUid: string;
}

@UseGuards(JwtAuthGuard)
@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /**
   * Called by the web checkout button after IMP.request_pay returns success.
   * The body must contain `impUid` (Portone's imp_uid). For the MockGateway
   * branch in dev/CI any non-empty string is accepted.
   */
  @Post("orders/:orderId/capture")
  async captureForOrder(
    @CurrentUser() user: CurrentUserPayload,
    @Param("orderId") orderId: string,
    @Body() body: CaptureBody,
  ) {
    if (!body?.impUid) {
      throw new BadRequestException("impUid is required");
    }
    await this.payments.captureByOrder(orderId, user.userId, body.impUid);
    return { ok: true };
  }
}
