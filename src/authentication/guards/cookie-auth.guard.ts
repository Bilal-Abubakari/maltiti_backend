import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { UsersService } from "../../users/users.service";
import { IJwtPayload } from "../../interfaces/jwt.interface";
import { User } from "../../entities/User.entity";
import { Roles } from "./roles/roles.decorator";
import { Reflector } from "@nestjs/core";

@Injectable()
export class CookieAuthGuard implements CanActivate {
  private logger = new Logger(CookieAuthGuard.name);
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private reflector: Reflector,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get(Roles, context.getHandler());
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.accessToken;
    if (!token) {
      this.logger.error("No access token found in cookies");
      throw new UnauthorizedException("No access token found in cookies");
    }

    try {
      const payload: IJwtPayload = this.jwtService.verify(token);
      const user = await this.usersService.findOne(payload.sub);

      if (!user) {
        this.logger.error(`User not found: ${payload.sub}`);
        throw new UnauthorizedException("User not found");
      }

      (request as Request & { user: User }).user = user;
      return roles.includes(user.userType);
    } catch (error) {
      this.logger.error(`Error: ${error.message}`);
      throw new ForbiddenException("Invalid token");
    }
  }
}
