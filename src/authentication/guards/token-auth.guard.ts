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
import { TokenExpiredError } from "jsonwebtoken";

@Injectable()
export class TokenAuthGuard implements CanActivate {
  private readonly logger = new Logger(TokenAuthGuard.name);
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly reflector: Reflector,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get(Roles, context.getHandler());
    const request = context.switchToHttp().getRequest<Request>();

    // Attempt to get token from Authorization header
    const token = request.headers.authorization?.split(" ")[1];

    // If no token, allow access ONLY if no roles are required
    if (!token) {
      this.logger.error("No access token found in Authorization header");
      throw new UnauthorizedException(
        "No access token found in Authorization header",
      );
    }

    let payload: IJwtPayload;
    try {
      payload = this.jwtService.verify(token);
    } catch (error) {
      this.logger.error(`Error: ${error.message}`);
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException("Token has expired");
      }
      throw new ForbiddenException("Invalid token");
    }

    const user = await this.usersService.findOne(payload.sub);

    if (!user) {
      this.logger.error(`User not found: ${payload.sub}`);
      throw new UnauthorizedException("User not found");
    }

    // Attach user to request so @CurrentUser() can find it
    (request as Request & { user: User }).user = user;

    // If roles are specified, check if user has permission
    if (roles && !roles.includes(user.userType)) {
      this.logger.error(
        `User ${user.id} with role ${user.userType} does not have required roles [${roles}]`,
      );
      return false;
    }

    return true;
  }
}
