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
import { Sale } from "../entities/Sale.entity";
import { Cart } from "../entities/Cart.entity";
import { Customer } from "../entities/Customer.entity";
import { User } from "../entities/User.entity";
import { NotificationModule } from "../notification/notification.module";
import { ProductCrudService } from "./product-crud.service";
import { ProductRecommendationService } from "./product-recommendation.service";
import { ProductExportService } from "./product-export.service";
import { ProductNotificationService } from "./product-notification.service";
import { ProductSearchService } from "./product-search.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      Batch,
      Ingredient,
      Sale,
      Cart,
      Customer,
      User,
    ]),
    IngredientsModule,
    NotificationModule,
  ],
  exports: [
    TypeOrmModule,
    ProductsService,
    ProductCrudService,
    ProductRecommendationService,
    ProductExportService,
    ProductNotificationService,
    ProductSearchService,
  ],
  providers: [
    ProductsService,
    ProductCrudService,
    ProductRecommendationService,
    ProductExportService,
    ProductNotificationService,
    ProductSearchService,
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
