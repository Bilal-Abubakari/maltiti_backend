import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../entities/User.entity";
import { Verification } from "../entities/Verification.entity";
import { NotificationService } from "../notification/notification.service";
import { RolesGuard } from "../authentication/guards/roles/roles.guard";
import { AuthenticationModule } from "../authentication/authentication.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Verification]),
    AuthenticationModule,
  ],
  providers: [UsersService, NotificationService, RolesGuard],
  controllers: [UsersController],
  exports: [TypeOrmModule, UsersService],
})
export class UsersModule {}
