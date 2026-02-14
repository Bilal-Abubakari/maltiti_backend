import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthenticationModule } from "./authentication/authentication.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { UsersModule } from "./users/users.module";
import { MailerModule } from "@nestjs-modules/mailer";
import { join } from "node:path";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter";
import { CooperativeModule } from "./cooperative/cooperative.module";
import { ProductsModule } from "./products/products.module";
import { CartModule } from "./cart/cart.module";
import { CheckoutModule } from "./checkout/checkout.module";
import { DatabaseModule } from "./database/database.module";
import { UploadModule } from "./upload/upload.module";
import { SalesModule } from "./sales/sales.module";
import { CustomerModule } from "./customer/customer.module";
import { ReportsModule } from "./reports/reports.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { AuditModule } from "./audit/audit.module";
import { ProfileModule } from "./profile/profile.module";
import { ContactModule } from "./contact/contact.module";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { NotificationModule } from "./notification/notification.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuditModule,
    ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 1000, // 1 second
        limit: 3, // 3 requests per second
      },
      {
        name: "medium",
        ttl: 10000, // 10 seconds
        limit: 20, // 20 requests per 10 seconds
      },
      {
        name: "long",
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>("TRANSPORT_HOST"),
          port: configService.get<number>("TRANSPORT_PORT"),
          auth: {
            user: configService.get<string>("TRANSPORT_USER"),
            pass: configService.get<string>("TRANSPORT_PASSWORD"),
          },
        },
        defaults: {
          from: '"No Reply" <info@maltitiaenterprise.com',
        },
        template: {
          dir: __dirname.includes("dist")
            ? join(__dirname, "..", "templates")
            : join(__dirname, "templates"),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
    AuthenticationModule,
    UsersModule,
    CooperativeModule,
    ProductsModule,
    CartModule,
    CheckoutModule,
    UploadModule,
    SalesModule,
    CustomerModule,
    ReportsModule,
    DashboardModule,
    ProfileModule,
    ContactModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
