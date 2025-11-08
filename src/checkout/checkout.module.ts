import { Module } from "@nestjs/common";
import { CheckoutController } from "./checkout.controller";
import { CheckoutService } from "./checkout.service";
import { UsersModule } from "../users/users.module";
import { CartModule } from "../cart/cart.module";
import { UsersService } from "../users/users.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Checkout } from "../entities/Checkout.entity";
import { NotificationService } from "../notification/notification.service";

@Module({
  imports: [TypeOrmModule.forFeature([Checkout]), UsersModule, CartModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, UsersService, NotificationService],
})
export class CheckoutModule {}
