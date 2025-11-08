import { ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";

@Injectable()
export class JwtRefreshTokenGuard extends AuthGuard("jwt-refresh-token") {
  private readonly logger = new Logger(JwtRefreshTokenGuard.name);

  public canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    this.logger.log("JwtRefreshTokenGuard activated");
    return super.canActivate(context);
  }
}
