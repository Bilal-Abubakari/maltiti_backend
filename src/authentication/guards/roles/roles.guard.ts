import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Roles } from "./roles.decorator";
import { User } from "../../../entities/User.entity";

@Injectable()
export class RolesGuard implements CanActivate {
  private logger = new Logger(RolesGuard.name);
  constructor(private reflector: Reflector) {}
  public canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get(Roles, context.getHandler());
    if (!roles) {
      this.logger.warn("No roles defined for route");
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user as User;
    const hasRole = roles.includes(user.userType);
    if (!hasRole) {
      this.logger.warn(
        `User role ${user.userType} not authorized for this route`,
      );
    }
    return hasRole;
  }
}
