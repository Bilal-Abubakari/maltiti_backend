import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { UsersService } from "../../users/users.service";
import { IJwtPayload } from "../../interfaces/jwt.interface";
import { User } from "../../entities/User.entity";

/**
 * Optional authentication guard
 * Attaches user to request if valid token is present
 * Does not throw errors if token is missing or invalid
 * Useful for endpoints that have different behavior for authenticated vs anonymous users
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.accessToken;

    // No token - allow anonymous access
    if (!token) {
      return true;
    }

    try {
      const payload: IJwtPayload = this.jwtService.verify(token);
      const user = await this.usersService.findOne(payload.sub);

      if (user) {
        (request as Request & { user: User }).user = user;
      }
    } catch {
      // Invalid token - still allow access but as anonymous
      // Silently fail and continue as anonymous user
    }

    return true;
  }
}
