import { Global, Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { NotificationService } from "./notification.service";
import { NotificationController } from "./notification.controller";
import { NotificationGateway } from "./notification.gateway";
import { NotificationLinkBuilder } from "./notification-link.builder";
import { NotificationIntegrationService } from "./notification-integration.service";
import { Notification } from "../entities/Notification.entity";
import { UsersModule } from "../users/users.module";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    forwardRef(() => UsersModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET") || "secret",
        signOptions: {
          expiresIn: configService.get<string>("JWT_EXPIRATION") || "1d",
        },
      }),
    }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationGateway,
    NotificationLinkBuilder,
    NotificationIntegrationService,
  ],
  exports: [
    NotificationService,
    NotificationGateway,
    NotificationIntegrationService,
    NotificationLinkBuilder,
  ],
})
export class NotificationModule {}
