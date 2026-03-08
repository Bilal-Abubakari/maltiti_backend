import { Module } from "@nestjs/common";
import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Cart } from "../entities/Cart.entity";
import { ProductsModule } from "../products/products.module";

@Module({
  imports: [TypeOrmModule.forFeature([Cart]), ProductsModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [TypeOrmModule, CartService],
})
export class CartModule {}
