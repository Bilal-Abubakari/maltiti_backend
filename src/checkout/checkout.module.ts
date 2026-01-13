import { Module } from "@nestjs/common";
import { CheckoutController } from "./checkout.controller";
import { CheckoutService } from "./checkout.service";
import { UsersModule } from "../users/users.module";
import { CartModule } from "../cart/cart.module";
import { UsersService } from "../users/users.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Checkout } from "../entities/Checkout.entity";
import { Sale } from "../entities/Sale.entity";
import { Customer } from "../entities/Customer.entity";
import { NotificationService } from "../notification/notification.service";
import { AuthenticationModule } from "../authentication/authentication.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Checkout, Sale, Customer]),
    UsersModule,
    CartModule,
    AuthenticationModule,
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService, UsersService, NotificationService],
})
export class CheckoutModule {}
