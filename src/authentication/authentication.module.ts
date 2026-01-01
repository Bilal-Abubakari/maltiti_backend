import { Module, Global } from "@nestjs/common";
import { AuthenticationController } from "./authentication.controller";
import { AuthenticationService } from "./authentication.service";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import { RefreshTokenIdsStorage } from "./refresh-token-ids-storage";
import * as process from "process";
import { ConfigModule } from "@nestjs/config";
import { LocalStrategy } from "./strategy/local.strategy";
import { JwtRefreshTokenStrategy } from "./strategy/jwt-refresh-token.strategy";
import { JwtStrategy } from "./strategy/jwt.strategy";
import { NotificationService } from "../notification/notification.service";
import { CookieAuthGuard } from "./guards/cookie-auth.guard";
import { OptionalAuthGuard } from "./guards/optional-auth.guard";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../entities/User.entity";
import { Verification } from "../entities/Verification.entity";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Verification]),
    ConfigModule.forRoot(),
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "secret",
      signOptions: { expiresIn: "1h" },
    }),
  ],
  controllers: [AuthenticationController],
  providers: [
    AuthenticationService,
    JwtStrategy,
    UsersService,
    RefreshTokenIdsStorage,
    LocalStrategy,
    JwtRefreshTokenStrategy,
    NotificationService,
    CookieAuthGuard,
    OptionalAuthGuard,
  ],
  exports: [JwtModule, AuthenticationService, UsersService, OptionalAuthGuard],
})
export class AuthenticationModule {}
