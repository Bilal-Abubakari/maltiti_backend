import {
  Body,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Req,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Controller,
} from "@nestjs/common";
import { Request } from "express";
import * as crypto from "node:crypto";
import { Roles } from "../authentication/guards/roles/roles.decorator";
import { CurrentUser } from "../authentication/decorators/current-user.decorator";
import { User } from "../entities/User.entity";
import { IResponse, ordersPagination } from "../interfaces/general";
import { CheckoutService } from "./checkout.service";
import { CookieAuthGuard } from "../authentication/guards/cookie-auth.guard";
import { RolesGuard } from "../authentication/guards/roles/roles.guard";
import {
  InitializeTransaction,
  UpdateSaleStatusDto,
  PlaceOrderDto,
  GuestInitializeTransactionDto,
  GuestPlaceOrderDto,
  GetOrderStatusDto,
  GuestGetDeliveryCostDto,
} from "../dto/checkout.dto";
import { Checkout } from "../entities/Checkout.entity";
import { Sale } from "../entities/Sale.entity";
import { Role } from "../enum/role.enum";
import { OrderStatus } from "../enum/order-status.enum";
import { PaymentStatus } from "../enum/payment-status.enum";
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiExtraModels,
} from "@nestjs/swagger";
import {
  CheckoutsResponseDto,
  CheckoutResponseDto,
  OrdersPaginationResponseDto,
  DeliveryResponseDto,
  InitializeTransactionResponseDto,
  SaleResponseDto,
  CheckoutDto,
  CustomerDto,
  UserDto,
  CartDto,
  OrdersPaginationDto,
  InitializeTransactionDataDto,
  SaleLineItemDto,
} from "../dto/checkoutResponse.dto";
import { SaleDto } from "../dto/sales/sale.dto";
import { GetDeliveryCostDto } from "../dto/checkout/getDeliveryCost.dto";
import { PaymentInitializationApiResponse } from "../interfaces/payment.interface";
import { PaystackWebhookEvent } from "../interfaces/webhook.interface";

@ApiTags("Checkout")
@Controller("checkout")
@ApiExtraModels(
  CheckoutDto,
  SaleDto,
  CustomerDto,
  UserDto,
  CartDto,
  OrdersPaginationDto,
  InitializeTransactionDataDto,
  SaleLineItemDto,
)
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Get("orders")
  @UseGuards(CookieAuthGuard, RolesGuard)
  @Roles([Role.User])
  @ApiOperation({ summary: "Get all orders for current user" })
  @ApiResponse({
    status: 200,
    description: "Customer orders loaded successfully",
    type: CheckoutsResponseDto,
  })
  public async getOrders(
    @CurrentUser() user: User,
  ): Promise<IResponse<Checkout[]>> {
    const response = await this.checkoutService.getOrders(user.id);
    return {
      message: "Customer orders loaded successfully",
      data: response,
    };
  }

  @Get("order/:id")
  @UseGuards(CookieAuthGuard, RolesGuard)
  @Roles([Role.User])
  @ApiOperation({ summary: "Get a specific order" })
  @ApiParam({ name: "id", description: "Order ID" })
  @ApiResponse({
    status: 200,
    description: "Order loaded successfully",
    type: CheckoutResponseDto,
  })
  public async getOrder(@Param("id") id: string): Promise<IResponse<Checkout>> {
    const response = await this.checkoutService.getOrder(id);
    return {
      message: "Order loaded successfully",
      data: response,
    };
  }

  @Get("guest/confirm-payment/:saleId")
  @ApiOperation({
    summary: "Confirm payment for a guest order (no authentication required)",
    description:
      "Public endpoint to confirm payment after Paystack redirect for guest users",
  })
  @ApiParam({ name: "saleId", description: "Sale ID" })
  @ApiResponse({
    status: 200,
    description: "Payment confirmed successfully",
    type: CheckoutResponseDto,
  })
  public async confirmGuestPayment(
    @Param("saleId") saleId: string,
  ): Promise<IResponse<Checkout>> {
    const response = await this.checkoutService.confirmGuestPayment(saleId);
    return {
      message: "Payment confirmed successfully",
      data: response,
    };
  }

  @Get("confirm-payment/:saleId")
  @UseGuards(CookieAuthGuard, RolesGuard)
  @Roles([Role.User])
  @ApiOperation({ summary: "Confirm payment for an order" })
  @ApiParam({ name: "saleId", description: "Sale ID" })
  @ApiResponse({
    status: 200,
    description: "Payment confirmed successfully",
    type: CheckoutResponseDto,
  })
  public async confirmPayment(
    @CurrentUser() user: User,
    @Param("saleId") saleId: string,
  ): Promise<IResponse<Checkout>> {
    const response = await this.checkoutService.confirmPayment(user.id, saleId);
    return {
      message: "Payment confirmed successfully",
      data: response,
    };
  }

  @Post("delivery")
  @UseGuards(CookieAuthGuard, RolesGuard)
  @Roles([Role.User])
  @ApiOperation({
    summary: "Calculate delivery cost based on location details",
  })
  @ApiResponse({
    status: 201,
    description: "Transportation cost calculated successfully",
    type: DeliveryResponseDto,
  })
  public async getDeliveryCost(
    @CurrentUser() user: User,
    @Body() dto: GetDeliveryCostDto,
  ): Promise<IResponse<number>> {
    const response = await this.checkoutService.getDeliveryCost(user.id, dto);
    return {
      message: "Transportation cost calculated successfully",
      data: response,
    };
  }

  @Get("admin/orders")
  @UseGuards(CookieAuthGuard, RolesGuard)
  @Roles([Role.Admin])
  @ApiOperation({ summary: "Get all orders (admin)" })
  @ApiQuery({ name: "orderStatus", enum: OrderStatus, required: false })
  @ApiQuery({ name: "paymentStatus", enum: PaymentStatus, required: false })
  @ApiQuery({ name: "searchTerm", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: "Orders loaded successfully",
    type: OrdersPaginationResponseDto,
  })
  public async getAllOrders(
    @Query("orderStatus") orderStatus: OrderStatus,
    @Query("paymentStatus") paymentStatus: PaymentStatus,
    @Query("searchTerm") searchTerm: string,
    @Query("page") page: number,
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

  @Post("initialize-transaction")
  @UseGuards(CookieAuthGuard, RolesGuard)
  @Roles([Role.User])
  @ApiOperation({ summary: "Initialize payment transaction" })
  @ApiResponse({
    status: 201,
    description: "Transaction initialized successfully",
    type: InitializeTransactionResponseDto,
  })
  public async initializeTransaction(
    @CurrentUser() user: User,
    @Body() data: InitializeTransaction,
  ): Promise<PaymentInitializationApiResponse> {
    const response = await this.checkoutService.initializeTransaction(
      user.id,
      data,
    );
    return {
      message: "Transaction initialized successfully",
      ...response,
    };
  }

  @Post("place-order")
  @UseGuards(CookieAuthGuard, RolesGuard)
  @Roles([Role.User])
  @ApiOperation({
    summary:
      "Place an order without immediate payment - payment can be made later",
  })
  @ApiResponse({
    status: 201,
    description:
      "Order placed successfully. You can make payment later from your dashboard.",
    type: CheckoutResponseDto,
  })
  public async placeOrder(
    @CurrentUser() user: User,
    @Body() data: PlaceOrderDto,
  ): Promise<IResponse<Checkout>> {
    const response = await this.checkoutService.placeOrder(user.id, data);
    return {
      message:
        "Order placed successfully. You can make payment later from your dashboard.",
      data: response,
    };
  }

  @Post("pay-for-order/:saleId")
  @UseGuards(CookieAuthGuard, RolesGuard)
  @Roles([Role.User])
  @ApiOperation({
    summary:
      "Initialize payment for a previously placed order (invoice requested or pending payment)",
  })
  @ApiParam({ name: "saleId", description: "Sale ID" })
  @ApiResponse({
    status: 200,
    description: "Payment initialized successfully",
    type: InitializeTransactionResponseDto,
  })
  public async payForOrder(
    @CurrentUser() user: User,
    @Param("saleId") saleId: string,
  ): Promise<InitializeTransactionResponseDto> {
    const response = await this.checkoutService.payForOrder(user.id, saleId);
    return {
      message: "Payment initialized successfully",
      ...response,
    };
  }

  @Patch("sale-status/:id")
  @UseGuards(CookieAuthGuard, RolesGuard)
  @Roles([Role.Admin])
  @ApiOperation({ summary: "Update sale status" })
  @ApiParam({ name: "id", description: "Checkout ID" })
  @ApiResponse({
    status: 200,
    description: "Sale status updated successfully",
    type: SaleResponseDto,
  })
  public async updateSaleStatus(
    @Param("id") id: string,
    @Body() data: UpdateSaleStatusDto,
  ): Promise<IResponse<Sale>> {
    const response = await this.checkoutService.updateSaleStatus(
      id,
      data.orderStatus,
      data.paymentStatus,
    );
    return {
      message: "Sale status updated successfully",
      data: response,
    };
  }

  @Patch("cancel-order/:id")
  @UseGuards(CookieAuthGuard, RolesGuard)
  @Roles([Role.User])
  @ApiOperation({ summary: "Cancel an order" })
  @ApiParam({ name: "id", description: "Checkout ID" })
  @ApiResponse({
    status: 200,
    description:
      "Order has been successfully cancelled. If you have paid, you will receive refund in 7-12 business days",
    type: CheckoutResponseDto,
  })
  public async cancelOrder(
    @Param("id") id: string,
  ): Promise<IResponse<Checkout>> {
    const response = await this.checkoutService.cancelOrder(id);
    return {
      message:
        "Order has been successfully cancelled. If you have paid, you will receive refund in 7-12 business days",
      data: response,
    };
  }

  // Guest checkout endpoints (no authentication required)
  @Post("guest/delivery")
  @ApiOperation({
    summary: "Calculate delivery cost for guest checkout",
  })
  @ApiResponse({
    status: 201,
    description: "Transportation cost calculated successfully",
    type: DeliveryResponseDto,
  })
  public async getGuestDeliveryCost(
    @Body() dto: GuestGetDeliveryCostDto,
  ): Promise<IResponse<number>> {
    const response = await this.checkoutService.getGuestDeliveryCost(dto);
    return {
      message: "Transportation cost calculated successfully",
      data: response,
    };
  }

  @Post("guest/initialize-transaction")
  @ApiOperation({ summary: "Initialize payment transaction for guest user" })
  @ApiResponse({
    status: 201,
    description: "Transaction initialized successfully",
    type: InitializeTransactionResponseDto,
  })
  public async guestInitializeTransaction(
    @Body() data: GuestInitializeTransactionDto,
  ): Promise<InitializeTransactionResponseDto> {
    const response =
      await this.checkoutService.guestInitializeTransaction(data);
    return {
      message: "Transaction initialized successfully",
      ...response,
    };
  }

  @Post("guest/place-order")
  @ApiOperation({
    summary:
      "Place an order as guest without immediate payment - payment can be made later",
  })
  @ApiResponse({
    status: 201,
    description:
      "Order placed successfully. Check your email for order tracking information.",
    type: CheckoutResponseDto,
  })
  public async guestPlaceOrder(
    @Body() data: GuestPlaceOrderDto,
  ): Promise<IResponse<Checkout>> {
    const response = await this.checkoutService.guestPlaceOrder(data);
    return {
      message:
        "Order placed successfully. Check your email for order tracking information.",
      data: response,
    };
  }

  @Get("track/:checkoutId")
  @ApiOperation({
    summary:
      "Track order status by checkout ID and email (no authentication required - works for all orders)",
    description:
      "Track any order using the checkout ID and email address. Works for orders placed by guests, registered users, or created by admins.",
  })
  @ApiParam({ name: "checkoutId", description: "Checkout ID" })
  @ApiQuery({
    name: "email",
    description: "Email address associated with the order",
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: "Order status retrieved successfully",
    type: CheckoutResponseDto,
  })
  public async getOrderStatus(
    @Param("checkoutId") checkoutId: string,
    @Query() query: GetOrderStatusDto,
  ): Promise<IResponse<Checkout>> {
    const response = await this.checkoutService.getOrderStatus(
      checkoutId,
      query.email,
    );
    return {
      message: "Order status retrieved successfully",
      data: response,
    };
  }

  @Post("guest/pay-for-order/:saleId")
  @ApiOperation({
    summary:
      "Initialize payment for any order without authentication (invoice requested or pending payment)",
    description:
      "Initialize payment for any order using checkout ID and email. Works for orders placed by guests, registered users, or created by admins.",
  })
  @ApiParam({ name: "saleId", description: "Sale ID" })
  @ApiQuery({
    name: "email",
    description: "Email address associated with the order",
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: "Payment initialized successfully",
    type: InitializeTransactionResponseDto,
  })
  public async payForGuestOrder(
    @Param("saleId") saleId: string,
    @Query() query: GetOrderStatusDto,
  ): Promise<InitializeTransactionResponseDto> {
    const response = await this.checkoutService.payForGuestOrder(
      saleId,
      query.email,
    );
    return {
      message: "Payment initialized successfully",
      ...response,
    };
  }

  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Paystack webhook for payment notifications",
    description:
      "Webhook endpoint to receive payment notifications from Paystack. Validates signature and processes successful payments.",
  })
  @ApiResponse({
    status: 200,
    description: "Webhook processed successfully",
    schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          example: "ok",
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Invalid signature",
  })
  public async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ status: string }> {
    const signature = req.headers["x-paystack-signature"] as string;

    if (!signature) {
      throw new UnauthorizedException("Missing signature");
    }

    // Get the raw body for signature verification
    const rawBody = req.rawBody
      ? req.rawBody.toString("utf8")
      : JSON.stringify(req.body);

    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest("hex");

    if (hash !== signature) {
      throw new UnauthorizedException("Invalid signature");
    }

    const event = req.body as PaystackWebhookEvent;

    if (event.event === "charge.success") {
      const reference = event.data.reference;

      await this.checkoutService.verifyAndMarkPaid(reference);
    } else if (event.event === "refund.processed") {
      const transactionReference = event.data.transaction_reference;

      if (transactionReference) {
        await this.checkoutService.handleRefund(transactionReference);
      }
    }

    return { status: "ok" };
  }
}
