import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { User } from "../entities/User.entity";
import { SeederService } from "./seeder.service";
import { Cooperative } from "../entities/Cooperative.entity";
import { CooperativeMember } from "../entities/CooperativeMember.entity";
import { Product } from "../entities/Product.entity";
import { Verification } from "../entities/Verification.entity";
import { Cart } from "../entities/Cart.entity";
import { Checkout } from "../entities/Checkout.entity";
import { Batch } from "../entities/Batch.entity";
import { Ingredient } from "../entities/Ingredient.entity";
import { Sale } from "../entities/Sale.entity";
import { Customer } from "../entities/Customer.entity";
import { AuditLog } from "../entities/AuditLog.entity";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get<string>("DATABASE_HOST"),
        port: configService.get<number>("DATABASE_PORT"),
        username: configService.get<string>("DATABASE_USER"),
        password: configService.get<string>("DATABASE_PASSWORD"),
        database: configService.get<string>("DATABASE_NAME"),
        ssl: {
          rejectUnauthorized: false,
        },
        entities: [
          User,
          Cooperative,
          CooperativeMember,
          Product,
          Batch,
          Verification,
          Cart,
          Checkout,
          Ingredient,
          Sale,
          Customer,
          AuditLog,
        ],
        synchronize: false,
        autoLoadEntities: false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User]),
    ConfigModule,
  ],
  providers: [SeederService],
  exports: [SeederService, TypeOrmModule],
})
export class DatabaseModule {}
