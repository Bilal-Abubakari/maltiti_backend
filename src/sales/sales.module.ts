import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SalesService } from "./sales.service";
import { SalesController } from "./sales.controller";
import { Sale } from "../entities/Sale.entity";
import { Customer } from "../entities/Customer.entity";
import { Batch } from "../entities/Batch.entity";
import { Product } from "../entities/Product.entity";
import { BatchesService } from "../products/batches/batches.service";

@Module({
  imports: [TypeOrmModule.forFeature([Sale, Customer, Batch, Product])],
  providers: [SalesService, BatchesService],
  controllers: [SalesController],
  exports: [SalesService],
})
export class SalesModule {}
