import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { UsersService } from "../../users/users.service";
import { IJwtPayload } from "../../interfaces/jwt.interface";
import { User } from "../../entities/User.entity";

@Injectable()
export class CookieAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.accessToken;

    if (!token) {
      throw new UnauthorizedException("No access token found in cookies");
    }

    try {
      const payload: IJwtPayload = this.jwtService.verify(token);
      const user = await this.usersService.findOne(payload.sub);

      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      (request as Request & { user: User }).user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
