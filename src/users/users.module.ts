import { Module, forwardRef } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../entities/User.entity";
import { Verification } from "../entities/Verification.entity";
import { NotificationService } from "../notification/notification.service";
import { RolesGuard } from "../authentication/guards/roles/roles.guard";
import { AuthenticationModule } from "../authentication/authentication.module";
import { AuditModule } from "../audit/audit.module";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuditInterceptor } from "../interceptors/audit.interceptor";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Verification]),
    AuthenticationModule,
    forwardRef(() => AuditModule),
  ],
  providers: [
    UsersService,
    NotificationService,
    RolesGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  controllers: [UsersController],
  exports: [TypeOrmModule, UsersService],
})
export class UsersModule {}
