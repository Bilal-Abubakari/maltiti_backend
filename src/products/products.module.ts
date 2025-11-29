import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductsService } from "./products.service";
import { ProductsController } from "./products.controller";
import { Product } from "../entities/Product.entity";
import { Batch } from "../entities/Batch.entity";
import { IngredientsService } from "./ingredients/ingredients.service";
import { Ingredient } from "../entities/Ingredient.entity";
import { BatchesService } from "./batches/batches.service";
import { BatchesController } from "./batches/batches.controller";
import { AuthenticationModule } from "../authentication/authentication.module";
import { IngredientsModule } from "./ingredients/ingredients.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Batch, Ingredient]),
    AuthenticationModule,
    IngredientsModule,
  ],
  exports: [TypeOrmModule, ProductsService],
  providers: [ProductsService, IngredientsService, BatchesService],
  controllers: [ProductsController, BatchesController],
})
export class ProductsModule {}
