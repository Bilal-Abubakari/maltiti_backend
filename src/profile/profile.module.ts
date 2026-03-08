import { Module } from "@nestjs/common";
import { ProfileController } from "./profile.controller";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuditInterceptor } from "../interceptors/audit.interceptor";

/**
 * Module for user profile and settings management
 */
@Module({
  imports: [],
  controllers: [ProfileController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class ProfileModule {}
