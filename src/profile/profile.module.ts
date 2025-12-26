import { Module, forwardRef } from "@nestjs/common";
import { ProfileController } from "./profile.controller";
import { UsersModule } from "../users/users.module";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuditInterceptor } from "../interceptors/audit.interceptor";

/**
 * Module for user profile and settings management
 */
@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [ProfileController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class ProfileModule {}
