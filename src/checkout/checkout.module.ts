import { Module } from "@nestjs/common";
import { CheckoutController } from "./checkout.controller";
import { CheckoutService } from "./checkout.service";
import { CartModule } from "../cart/cart.module";
import { UsersService } from "../users/users.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Checkout } from "../entities/Checkout.entity";
import { Sale } from "../entities/Sale.entity";
import { SalePayment } from "../entities/SalePayment.entity";
import { Customer } from "../entities/Customer.entity";
import { AuthenticationModule } from "../authentication/authentication.module";
import { DeliveryCostService } from "./delivery-cost.service";
import { PaymentService } from "./payment.service";
import { OrderOperationsService } from "./order-operations.service";
import { OrderQueriesService } from "./order-queries.service";
import { CustomerManagementService } from "./customer-management.service";
import { TransactionService } from "./transaction.service";
import { Cart } from "../entities/Cart.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Checkout, Sale, SalePayment, Customer, Cart]),
    CartModule,
    AuthenticationModule,
  ],
  controllers: [CheckoutController],
  providers: [
    CheckoutService,
    UsersService,
    DeliveryCostService,
    PaymentService,
    OrderOperationsService,
    OrderQueriesService,
    CustomerManagementService,
    TransactionService,
  ],
  exports: [PaymentService],
})
export class CheckoutModule {}
