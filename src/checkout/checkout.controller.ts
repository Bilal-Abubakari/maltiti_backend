import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../authentication/guards/roles/roles.decorator";
import {
  IInitalizeTransactionData,
  IInitializeTransactionResponse,
  IResponse,
  ordersPagination,
} from "../interfaces/general";
import { CheckoutService } from "./checkout.service";
import { CookieAuthGuard } from "../authentication/guards/cookie-auth.guard";
import { RolesGuard } from "../authentication/guards/roles/roles.guard";
import {
  InitializeTransaction,
  OrderStatus,
  PaymentStatus,
} from "../dto/checkout.dto";
import { Checkout } from "../entities/Checkout.entity";
import {
  paymentStatus as paymentsStatus,
  status,
} from "../interfaces/checkout.interface";
import { Role } from "../enum/role.enum";

@Controller("checkout")
@UseGuards(CookieAuthGuard, RolesGuard)
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Get("orders/:id")
  @Roles([Role.User])
  public async getOrders(
    @Param("id") id: string,
  ): Promise<IResponse<Checkout[]>> {
    const response = await this.checkoutService.getOrders(id);
    return {
      message: "Customer cart loaded successfully",
      data: response,
    };
  }

  @Get("order/:id")
  @Roles([Role.User])
  public async getOrder(@Param("id") id: string): Promise<IResponse<Checkout>> {
    const response = await this.checkoutService.getOrder(id);
    return {
      message: "Customer cart loaded successfully",
      data: response,
    };
  }

  @Get("test-mail")
  public async testMail(): Promise<void> {
    await this.checkoutService.testMail();
  }

  @Get("confirm-payment/:userId/:checkoutId")
  @Roles([Role.User])
  public async confirmPayment(
    @Param("userId") userId: string,
    @Param("checkoutId") checkoutId: string,
  ): Promise<IResponse<Checkout>> {
    const response = await this.checkoutService.confirmPayment(
      userId,
      checkoutId,
    );
    return {
      message: "Payment confirmed successfully",
      data: response,
    };
  }

  @Get(":id/:location")
  @Roles([Role.User])
  public async getTransportation(
    @Param("id") id: string,
    @Param("location") location: "local" | "other",
  ): Promise<IResponse<number>> {
    const response = await this.checkoutService.getTransportation(id, location);
    return {
      message: "Customer cart loaded successfully",
      data: response,
    };
  }

  @Get("orders")
  @Roles([Role.Admin])
  public async getAllOrders(
    @Query("orderStatus") orderStatus: status,
    @Query("searchTerm") searchTerm: string,
    @Query("page") page: number,
    @Query("paymentStatus") paymentStatus: paymentsStatus,
  ): Promise<IResponse<ordersPagination>> {
    const response = await this.checkoutService.getAllOrders(
      page,
      10,
      searchTerm,
      orderStatus,
      paymentStatus,
    );
    return {
      message: "Orders loaded successfully",
      data: response,
    };
  }

  @Post("initialize-transaction/:id")
  @Roles([Role.User])
  public async initializeTransaction(
    @Body() data: InitializeTransaction,
    @Param("id") id: string,
  ): Promise<IInitializeTransactionResponse<IInitalizeTransactionData>> {
    const response = await this.checkoutService.initializeTransaction(id, data);
    return {
      message: "Customer cart loaded successfully",
      ...response,
    };
  }

  @Patch("order-status/:id")
  @Roles([Role.Admin])
  public async orderStatus(
    @Param("id") id: string,
    @Body() data: OrderStatus,
  ): Promise<IResponse<Checkout>> {
    const response = await this.checkoutService.orderStatus(id, data);
    return {
      message: "Order status updated successfully",
      data: response.raw,
    };
  }

  @Patch("payment-status/:id")
  @Roles([Role.Admin])
  public async paymentStatus(
    @Param("id") id: string,
    @Body() data: PaymentStatus,
  ): Promise<IResponse<Checkout>> {
    const response = await this.checkoutService.paymentStatus(id, data);
    return {
      message: "Order status updated successfully",
      data: response.raw,
    };
  }

  @Patch("cancel-order/:id")
  @Roles([Role.User])
  public async cancelOrder(
    @Param("id") id: string,
  ): Promise<IResponse<Checkout>> {
    const response = await this.checkoutService.cancelOrder(id);
    return {
      message:
        "Order has been successfully cancelled. If you have paid, you will receive refund in 3 working days",
      data: response,
    };
  }
}
