import { Module } from "@nestjs/common";
import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Cart } from "../entities/Cart.entity";
import { UsersModule } from "../users/users.module";
import { ProductsModule } from "../products/products.module";
import { NotificationService } from "../notification/notification.service";
import { AuthenticationModule } from "../authentication/authentication.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Cart]),
    UsersModule,
    ProductsModule,
    AuthenticationModule,
  ],
  controllers: [CartController],
  providers: [CartService, NotificationService],
  exports: [TypeOrmModule],
})
export class CartModule {}
