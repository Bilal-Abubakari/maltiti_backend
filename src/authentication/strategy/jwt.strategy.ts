import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, ExtractJwt } from "passport-jwt";
import { UsersService } from "../../users/users.service";
import { JwtRefreshTokenStrategy } from "./jwt-refresh-token.strategy";
import { IJwtPayload } from "../../interfaces/jwt.interface";
import { User } from "../../entities/User.entity";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtRefreshTokenStrategy.name);
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "secret",
    });
    this.logger.warn("JwtStrategy initialized");
  }

  public async validate(payload: IJwtPayload): Promise<User> {
    this.logger.warn(`Payload: ${JSON.stringify(payload)}`);
    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      this.logger.error("User not found");
      throw new UnauthorizedException();
    }
    return user;
  }
}
