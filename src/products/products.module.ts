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
import { IngredientsModule } from "./ingredients/ingredients.module";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuditInterceptor } from "../interceptors/audit.interceptor";

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Batch, Ingredient]),
    IngredientsModule,
  ],
  exports: [TypeOrmModule, ProductsService],
  providers: [
    ProductsService,
    IngredientsService,
    BatchesService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  controllers: [ProductsController, BatchesController],
})
export class ProductsModule {}
