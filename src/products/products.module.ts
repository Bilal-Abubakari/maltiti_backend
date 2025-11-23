import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductsService } from "./products.service";
import { ProductsController } from "./products.controller";
import { Product } from "../entities/Product.entity";
import { Batch } from "../entities/Batch.entity";
import { IngredientsService } from "./ingredients/ingredients.service";
import { Ingredient } from "../entities/Ingredient.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Product, Batch, Ingredient])],
  exports: [TypeOrmModule, ProductsService],
  providers: [ProductsService, IngredientsService],
  controllers: [ProductsController],
})
export class ProductsModule {}
