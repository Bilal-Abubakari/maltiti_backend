import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SalesService } from "./sales.service";
import { InvoiceService } from "./invoice.service";
import { ReceiptService } from "./receipt.service";
import { WaybillService } from "./waybill.service";
import { SalesController } from "./sales.controller";
import { Sale } from "../entities/Sale.entity";
import { Customer } from "../entities/Customer.entity";
import { Batch } from "../entities/Batch.entity";
import { Product } from "../entities/Product.entity";
import { Checkout } from "../entities/Checkout.entity";
import { BatchesService } from "../products/batches/batches.service";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuditInterceptor } from "../interceptors/audit.interceptor";
import { DocumentGenerationService } from "./document-generation.service";
import { OrderTrackingService } from "./order-tracking.service";
import { SaleQueryService } from "./sale-query.service";
import { LineItemManagementService } from "./line-item-management.service";
import { NotificationService } from "../notification/notification.service";
import { StockManagementService } from "./stock-management.service";
import { CheckoutModule } from "../checkout/checkout.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, Customer, Batch, Product, Checkout]),
    CheckoutModule,
  ],
  providers: [
    SalesService,
    InvoiceService,
    ReceiptService,
    WaybillService,
    BatchesService,
    DocumentGenerationService,
    OrderTrackingService,
    SaleQueryService,
    LineItemManagementService,
    StockManagementService,
    NotificationService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  controllers: [SalesController],
  exports: [SalesService, InvoiceService, ReceiptService, WaybillService],
})
export class SalesModule {}
