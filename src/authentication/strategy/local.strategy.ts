import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { JwtRefreshTokenStrategy } from "./jwt-refresh-token.strategy";
import { AuthenticationService } from "../authentication.service";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtRefreshTokenStrategy.name);

  constructor(private authService: AuthenticationService) {
    super({ usernameField: "username" });
    this.logger.warn("LocalStrategy initialized");
  }

  public async validate(username: string, password: string): Promise<unknown> {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
