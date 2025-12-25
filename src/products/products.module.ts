import { Module, forwardRef } from "@nestjs/common";
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
import { AuditModule } from "../audit/audit.module";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuditInterceptor } from "../interceptors/audit.interceptor";

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Batch, Ingredient]),
    AuthenticationModule,
    IngredientsModule,
    forwardRef(() => AuditModule),
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
