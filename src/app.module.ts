import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthenticationModule } from "./authentication/authentication.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { UsersModule } from "./users/users.module";
import { MailerModule } from "@nestjs-modules/mailer";
import { join } from "path";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter";
import { CooperativeModule } from "./cooperative/cooperative.module";
import { ProductsModule } from "./products/products.module";
import { CartModule } from "./cart/cart.module";
import { CheckoutModule } from "./checkout/checkout.module";
import { NotificationService } from "./notification/notification.service";
import { DatabaseModule } from "./database/database.module";
import { UploadModule } from "./upload/upload.module";
import { SalesModule } from "./sales/sales.module";
import { CustomerModule } from "./customer/customer.module";
import { ReportsModule } from "./reports/reports.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { AuditModule } from "./audit/audit.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuditModule,
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
  ],
  controllers: [AppController],
  providers: [AppService, NotificationService],
})
export class AppModule {}
