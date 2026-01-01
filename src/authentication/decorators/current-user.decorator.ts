import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { User } from "../../entities/User.entity";

/**
 * Custom decorator to extract the current user from the request
 * Returns undefined if user is not authenticated
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
