import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductsService } from "./products.service";
import { ProductsController } from "./products.controller";
import { Product } from "../entities/Product.entity";
import { Batch } from "../entities/Batch.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Product, Batch])],
  exports: [TypeOrmModule, ProductsService],
  providers: [ProductsService],
  controllers: [ProductsController],
})
export class ProductsModule {}
