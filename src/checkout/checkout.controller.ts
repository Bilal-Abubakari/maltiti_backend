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
import { CurrentUser } from "../authentication/decorators/current-user.decorator";
import { User } from "../entities/User.entity";
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
  UpdateSaleStatusDto,
  PlaceOrderDto,
  UpdateDeliveryCostDto,
} from "../dto/checkout.dto";
import { Checkout } from "../entities/Checkout.entity";
import { Sale } from "../entities/Sale.entity";
import { Role } from "../enum/role.enum";
import { SaleStatus } from "../enum/sale-status.enum";
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

@ApiTags("Checkout")
@Controller("checkout")
@UseGuards(CookieAuthGuard, RolesGuard)
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

  @Get("confirm-payment/:checkoutId")
  @Roles([Role.User])
  @ApiOperation({ summary: "Confirm payment for an order" })
  @ApiParam({ name: "checkoutId", description: "Checkout ID" })
  @ApiResponse({
    status: 200,
    description: "Payment confirmed successfully",
    type: CheckoutResponseDto,
  })
  public async confirmPayment(
    @CurrentUser() user: User,
    @Param("checkoutId") checkoutId: string,
  ): Promise<IResponse<Checkout>> {
    const response = await this.checkoutService.confirmPayment(
      user.id,
      checkoutId,
    );
    return {
      message: "Payment confirmed successfully",
      data: response,
    };
  }

  @Post("delivery")
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
  @Roles([Role.Admin])
  @ApiOperation({ summary: "Get all orders (admin)" })
  @ApiQuery({ name: "saleStatus", enum: SaleStatus, required: false })
  @ApiQuery({ name: "searchTerm", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: "Orders loaded successfully",
    type: OrdersPaginationResponseDto,
  })
  public async getAllOrders(
    @Query("saleStatus") saleStatus: SaleStatus,
    @Query("searchTerm") searchTerm: string,
    @Query("page") page: number,
  ): Promise<IResponse<ordersPagination>> {
    const response = await this.checkoutService.getAllOrders(
      page,
      10,
      searchTerm,
      saleStatus,
    );
    return {
      message: "Orders loaded successfully",
      data: response,
    };
  }

  @Post("initialize-transaction")
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
  ): Promise<IInitializeTransactionResponse<IInitalizeTransactionData>> {
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

  @Post("pay-for-order/:checkoutId")
  @Roles([Role.User])
  @ApiOperation({
    summary:
      "Initialize payment for a previously placed order (invoice requested or pending payment)",
  })
  @ApiParam({ name: "checkoutId", description: "Checkout ID" })
  @ApiResponse({
    status: 200,
    description: "Payment initialized successfully",
    type: InitializeTransactionResponseDto,
  })
  public async payForOrder(
    @CurrentUser() user: User,
    @Param("checkoutId") checkoutId: string,
  ): Promise<IInitializeTransactionResponse<IInitalizeTransactionData>> {
    const response = await this.checkoutService.payForOrder(
      user.id,
      checkoutId,
    );
    return {
      message: "Payment initialized successfully",
      ...response,
    };
  }

  @Patch("sale-status/:id")
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
      data.status,
    );
    return {
      message: "Sale status updated successfully",
      data: response,
    };
  }

  @Patch("delivery-cost/:id")
  @Roles([Role.Admin])
  @ApiOperation({
    summary:
      "Update delivery cost for an order (e.g., for international orders)",
  })
  @ApiParam({ name: "id", description: "Checkout ID" })
  @ApiResponse({
    status: 200,
    description:
      "Delivery cost updated successfully. Customer will be notified.",
    type: CheckoutResponseDto,
  })
  public async updateDeliveryCost(
    @Param("id") id: string,
    @Body() data: UpdateDeliveryCostDto,
  ): Promise<IResponse<Checkout>> {
    const response = await this.checkoutService.updateDeliveryCost(id, data);
    return {
      message: "Delivery cost updated successfully. Customer will be notified.",
      data: response,
    };
  }

  @Patch("cancel-order/:id")
  @Roles([Role.User])
  @ApiOperation({ summary: "Cancel an order" })
  @ApiParam({ name: "id", description: "Checkout ID" })
  @ApiResponse({
    status: 200,
    description:
      "Order has been successfully cancelled. If you have paid, you will receive refund in 3 working days",
    type: CheckoutResponseDto,
  })
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
