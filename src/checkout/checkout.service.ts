import { Injectable, Logger } from "@nestjs/common";
import {
  InitializeTransaction,
  PlaceOrderDto,
  GuestInitializeTransactionDto,
  GuestPlaceOrderDto,
  GuestGetDeliveryCostDto,
} from "../dto/checkout.dto";
import { Checkout } from "../entities/Checkout.entity";
import { ordersPagination } from "../interfaces/general";
import { Sale } from "../entities/Sale.entity";
import { OrderStatus } from "../enum/order-status.enum";
import { PaymentStatus } from "../enum/payment-status.enum";
import { GetDeliveryCostDto } from "../dto/checkout/getDeliveryCost.dto";
import { DeliveryCostService } from "./delivery-cost.service";
import { OrderOperationsService } from "./order-operations.service";
import { OrderQueriesService } from "./order-queries.service";
import { TransactionService } from "./transaction.service";
import { PaymentService } from "./payment.service";
import {
  IInitializeTransactionData,
  IInitializeTransactionResponse,
} from "../interfaces/payment.interface";

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger("CheckoutService");
  constructor(
    private readonly deliveryCostService: DeliveryCostService,
    private readonly orderOperationsService: OrderOperationsService,
    private readonly orderQueriesService: OrderQueriesService,
    private readonly transactionService: TransactionService,
    private readonly paymentService: PaymentService,
  ) {}

  public async getDeliveryCost(
    id: string,
    dto: GetDeliveryCostDto,
  ): Promise<number> {
    return this.deliveryCostService.getDeliveryCost(id, dto);
  }

  public async initializeTransaction(
    id: string,
    data: InitializeTransaction,
  ): Promise<IInitializeTransactionResponse<IInitializeTransactionData>> {
    return this.transactionService.initializeTransaction(id, data);
  }

  public async placeOrder(id: string, data: PlaceOrderDto): Promise<Checkout> {
    return this.transactionService.placeOrder(id, data);
  }

  public async payForOrder(
    userId: string,
    checkoutId: string,
  ): Promise<IInitializeTransactionResponse<IInitializeTransactionData>> {
    return this.transactionService.payForOrder(userId, checkoutId);
  }

  public async confirmPayment(
    userId: string,
    saleId: string,
  ): Promise<Checkout> {
    return this.orderOperationsService.confirmPayment(userId, saleId);
  }

  public async confirmGuestPayment(saleId: string): Promise<Checkout> {
    return this.orderOperationsService.confirmGuestPayment(saleId);
  }

  public async updateSaleStatus(
    id: string,
    orderStatus?: OrderStatus,
    paymentStatus?: PaymentStatus,
  ): Promise<Sale> {
    return this.orderOperationsService.updateSaleStatus(
      id,
      orderStatus,
      paymentStatus,
    );
  }

  public async cancelOrder(id: string): Promise<Checkout> {
    return this.orderOperationsService.cancelOrder(id);
  }

  // Guest checkout methods
  public async getGuestDeliveryCost(
    dto: GuestGetDeliveryCostDto,
  ): Promise<number> {
    return this.deliveryCostService.getGuestDeliveryCost(dto);
  }

  public async guestInitializeTransaction(
    data: GuestInitializeTransactionDto,
  ): Promise<IInitializeTransactionResponse<IInitializeTransactionData>> {
    return this.transactionService.guestInitializeTransaction(data);
  }

  public async guestPlaceOrder(data: GuestPlaceOrderDto): Promise<Checkout> {
    return this.transactionService.guestPlaceOrder(data);
  }

  public async payForGuestOrder(
    checkoutId: string,
    email: string,
  ): Promise<IInitializeTransactionResponse<IInitializeTransactionData>> {
    return this.transactionService.payForGuestOrder(checkoutId, email);
  }

  public async getOrders(id: string): Promise<Checkout[]> {
    return this.orderQueriesService.getOrders(id);
  }

  public async getOrder(id: string): Promise<Checkout> {
    return this.orderQueriesService.getOrder(id);
  }

  public async getAllOrders(
    page: number = 1,
    limit: number = 10,
    searchTerm: string = "",
    orderStatus?: OrderStatus,
    paymentStatus?: PaymentStatus,
  ): Promise<ordersPagination> {
    return this.orderQueriesService.getAllOrders(
      page,
      limit,
      searchTerm,
      orderStatus,
      paymentStatus,
    );
  }

  public async getOrderStatus(
    checkoutId: string,
    email: string,
  ): Promise<Checkout> {
    return this.orderQueriesService.getOrderStatus(checkoutId, email);
  }

  public async verifyAndMarkPaid(reference: string): Promise<void> {
    this.logger.log(`Verifying payment for reference: ${reference}`);
    return this.paymentService.verifyAndMarkPaid(reference);
  }

  public async handleRefund(transactionReference: string): Promise<void> {
    this.logger.log(`Processing refund for reference: ${transactionReference}`);
    return this.paymentService.handleRefund(transactionReference);
  }
}
