import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Response } from "express";
import { SalesService } from "./sales.service";
import { CreateSaleDto } from "../dto/sales/createSale.dto";
import { UpdateSaleDto } from "../dto/sales/updateSale.dto";
import { UpdateSaleStatusDto } from "../dto/sales/updateSaleStatus.dto";
import { AddLineItemDto } from "../dto/addLineItem.dto";
import { AssignBatchesDto } from "../dto/assignBatches.dto";
import { ListSalesDto } from "../dto/listSales.dto";
import { ListSalesByEmailDto } from "../dto/sales/listSalesByEmail.dto";
import { GenerateInvoiceDto } from "../dto/generateInvoice.dto";
import { GenerateReceiptDto } from "../dto/generateReceipt.dto";
import { GenerateWaybillDto } from "../dto/generateWaybill.dto";
import { ConfirmDeliveryDto } from "../dto/sales/confirmDelivery.dto";
import { TrackOrderDto } from "../dto/sales/trackOrder.dto";
import { TrackOrderResponseDto } from "../dto/sales/trackOrderResponse.dto";
import { SaleResponseDto } from "../dto/sales/saleResponse.dto";
import { PaginatedSaleResponseDto } from "../dto/sales/paginatedSaleResponse.dto";
import {
  CancelSaleByCustomerDto,
  CancelSaleByAdminDto,
  CancelSaleResponseDto,
} from "../dto/sales/cancelSale.dto";
import { IPaginatedResponse, IResponse } from "../interfaces/general";
import { AuditLog } from "../interceptors/audit.interceptor";
import { AuditActionType } from "../enum/audit-action-type.enum";
import { AuditEntityType } from "../enum/audit-entity-type.enum";
import { CookieAuthGuard } from "../authentication/guards/cookie-auth.guard";
import { RolesGuard } from "../authentication/guards/roles/roles.guard";
import { Roles } from "../authentication/guards/roles/roles.decorator";
import { Role } from "../enum/role.enum";
import { OrderStatus } from "../enum/order-status.enum";
import { PaymentStatus } from "../enum/payment-status.enum";
import { UpdateDeliveryCostDto } from "../dto/checkout.dto";
import {
  InitializeTransactionDataDto,
  InitializeTransactionResponseDto,
} from "../dto/checkoutResponse.dto";
import {
  IInitializeTransactionData,
  IInitializeTransactionResponse,
} from "../interfaces/payment.interface";

@ApiExtraModels(
  InitializeTransactionDataDto,
  InitializeTransactionResponseDto,
  CancelSaleResponseDto,
)
@ApiTags("Sales")
@Controller("sales")
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @UseGuards(CookieAuthGuard, RolesGuard)
  @Roles([Role.Admin, Role.SuperAdmin])
  @ApiOperation({ summary: "Create a new sale" })
  @ApiResponse({ status: 201, type: SaleResponseDto })
  public async createSale(
    @Body() createSaleDto: CreateSaleDto,
  ): Promise<SaleResponseDto> {
    return this.salesService.createSale(createSaleDto);
  }

  @Patch(":id")
  @UseGuards(CookieAuthGuard, RolesGuard)
  @Roles([Role.Admin, Role.SuperAdmin])
  @ApiOperation({ summary: "Edit sale details" })
  @ApiResponse({ status: 200, type: SaleResponseDto })
  @AuditLog({
    actionType: AuditActionType.SALE_UPDATED,
    entityType: AuditEntityType.SALE,
    description: "Updated sale details",
    getEntityId: result => result?.id,
  })
  public async updateSale(
    @Param("id") saleId: string,
    @Body() updateDto: UpdateSaleDto,
  ): Promise<SaleResponseDto> {
    return this.salesService.updateSale(saleId, updateDto);
  }

  @Put(":id/status")
  @ApiOperation({ summary: "Update sale status" })
  @ApiResponse({ status: 200, type: SaleResponseDto })
  public async updateSaleStatus(
    @Param("id") saleId: string,
    @Body() updateDto: UpdateSaleStatusDto,
  ): Promise<SaleResponseDto> {
    return this.salesService.updateSaleStatus(saleId, updateDto);
  }

  @Post(":id/line-items")
  @ApiOperation({ summary: "Add line item to sale" })
  @ApiResponse({ status: 200, type: SaleResponseDto })
  public async addLineItem(
    @Param("id") saleId: string,
    @Body() addDto: AddLineItemDto,
  ): Promise<SaleResponseDto> {
    return this.salesService.addLineItem(saleId, addDto);
  }

  @Put(":id/batches")
  @ApiOperation({ summary: "Assign batches to line item" })
  @ApiResponse({ status: 200, type: SaleResponseDto })
  public async assignBatches(
    @Param("id") saleId: string,
    @Body() assignDto: AssignBatchesDto,
  ): Promise<SaleResponseDto> {
    return this.salesService.assignBatches(saleId, assignDto);
  }

  @Get("track/:saleId")
  @ApiOperation({
    summary:
      "Track order status by sale ID and email (no authentication required)",
    description:
      "Track any order using the sale ID and email address. Works for orders placed by guests, registered users, or created by admins.",
  })
  @ApiParam({ name: "saleId", description: "Sale/Order ID" })
  @ApiQuery({
    name: "email",
    description: "Email address associated with the order",
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: "Order tracked successfully",
    type: TrackOrderResponseDto,
  })
  public async trackOrder(
    @Param("saleId") saleId: string,
    @Query() query: TrackOrderDto,
  ): Promise<IResponse<SaleResponseDto>> {
    const sale = await this.salesService.trackOrder(saleId, query.email);

    return {
      message: "Order tracked successfully",
      data: sale,
    };
  }

  @Post("pay/:saleId")
  @ApiOperation({
    summary:
      "Initialize payment for order by sale ID (no authentication required)",
    description:
      "Initialize payment for any order using sale ID and email. Works for orders with INVOICE_REQUESTED or PENDING_PAYMENT status.",
  })
  @ApiParam({ name: "saleId", description: "Sale/Order ID" })
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
  @ApiResponse({
    status: 201,
    description: "Payment initialized successfully",
    type: InitializeTransactionResponseDto,
  })
  public async payForOrder(
    @Param("saleId") saleId: string,
    @Query() query: TrackOrderDto,
  ): Promise<IInitializeTransactionResponse<IInitializeTransactionData>> {
    const paymentData = await this.salesService.payForOrder(
      saleId,
      query.email,
    );

    return {
      message: "Payment initialized successfully",
      ...paymentData,
    };
  }

  @Get()
  @UseGuards(CookieAuthGuard, RolesGuard)
  @Roles([Role.Admin, Role.SuperAdmin])
  @ApiOperation({ summary: "List sales" })
  @ApiResponse({ status: 200, type: Object })
  public async listSales(
    @Query() query: ListSalesDto,
  ): Promise<IPaginatedResponse<SaleResponseDto>> {
    const sales = await this.salesService.listSales(query);

    return {
      message: "Sales loaded successfully",
      data: sales,
    };
  }

  @Get("by-email")
  @ApiOperation({
    summary: "List sales by customer email (no authentication required)",
    description:
      "Retrieve all sales associated with a specific customer email address. " +
      "Supports filtering by order status and payment status with pagination.",
  })
  @ApiQuery({
    name: "email",
    description: "Email address of the customer",
    required: true,
    type: String,
  })
  @ApiQuery({
    name: "orderStatus",
    description: "Filter by order status",
    required: false,
    enum: OrderStatus,
  })
  @ApiQuery({
    name: "paymentStatus",
    description: "Filter by payment status",
    required: false,
    enum: PaymentStatus,
  })
  @ApiQuery({
    name: "page",
    description: "Page number for pagination",
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: "limit",
    description: "Number of items per page",
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: "Sales retrieved successfully",
    type: PaginatedSaleResponseDto,
  })
  public async listSalesByEmail(
    @Query() query: ListSalesByEmailDto,
  ): Promise<PaginatedSaleResponseDto> {
    const sales = await this.salesService.listSalesByEmail(query);

    return {
      message: "Sales loaded successfully",
      data: sales,
    };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get sale details" })
  @ApiResponse({ status: 200, type: SaleResponseDto })
  public async getSaleDetails(
    @Param("id") saleId: string,
  ): Promise<SaleResponseDto> {
    return this.salesService.getSaleDetails(saleId);
  }

  @Post(":id/invoice")
  @ApiOperation({ summary: "Generate invoice PDF for a sale" })
  @ApiResponse({
    status: 200,
    description: "Invoice PDF generated successfully",
  })
  public async generateInvoice(
    @Param("id") saleId: string,
    @Body() invoiceDto: GenerateInvoiceDto,
    @Res() res: Response,
  ): Promise<void> {
    const pdfBuffer = await this.salesService.generateInvoice(
      saleId,
      invoiceDto,
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${saleId}.pdf`,
    );
    res.send(pdfBuffer);
  }

  @Post(":id/receipt")
  @ApiOperation({ summary: "Generate receipt PDF for a sale" })
  @ApiResponse({
    status: 200,
    description: "Receipt PDF generated successfully",
  })
  public async generateReceipt(
    @Param("id") saleId: string,
    @Body() receiptDto: GenerateReceiptDto,
    @Res() res: Response,
  ): Promise<void> {
    const pdfBuffer = await this.salesService.generateReceipt(
      saleId,
      receiptDto,
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=receipt-${saleId}.pdf`,
    );
    res.send(pdfBuffer);
  }

  @Post(":id/waybill")
  @ApiOperation({ summary: "Generate waybill PDF for a sale" })
  @ApiResponse({
    status: 200,
    description: "Waybill PDF generated successfully",
  })
  public async generateWaybill(
    @Param("id") saleId: string,
    @Body() waybillDto: GenerateWaybillDto,
    @Res() res: Response,
  ): Promise<void> {
    const pdfBuffer = await this.salesService.generateWaybill(
      saleId,
      waybillDto,
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=waybill-${saleId}.pdf`,
    );
    res.send(pdfBuffer);
  }

  @Patch(":id/confirm-delivery")
  @ApiOperation({ summary: "Confirm delivery by customer" })
  @ApiResponse({
    status: 200,
    type: SaleResponseDto,
    description: "Delivery confirmation updated successfully",
  })
  public async confirmDelivery(
    @Param("id") saleId: string,
    @Body() confirmDto: ConfirmDeliveryDto,
  ): Promise<SaleResponseDto> {
    return this.salesService.confirmDelivery(saleId, confirmDto.confirmed);
  }

  @Post(":id/cancel")
  @ApiOperation({
    summary: "Cancel sale by customer",
    description:
      "Cancel an order with business rules: " +
      "Pending + Paid = Full refund. " +
      "Processing/Packaging + Paid = 10% penalty. " +
      "In Transit/Delivered = Cannot cancel, contact support.",
  })
  @ApiParam({ name: "id", description: "Sale ID" })
  @ApiResponse({
    status: 200,
    description: "Order cancelled successfully",
    type: CancelSaleResponseDto,
  })
  @ApiResponse({
    status: 201,
    description: "Order cancelled successfully",
    type: CancelSaleResponseDto,
  })
  @AuditLog({
    actionType: AuditActionType.SALE_CANCELLED,
    entityType: AuditEntityType.SALE,
    description: "Customer cancelled sale",
    getEntityId: result => result?.sale?.id,
  })
  public async cancelSaleByCustomer(
    @Param("id") saleId: string,
    @Body() cancelDto: CancelSaleByCustomerDto,
  ): Promise<{
    message: string;
    sale: SaleResponseDto;
    refundAmount?: number;
    penaltyAmount?: number;
    refundProcessed?: boolean;
  }> {
    return this.salesService.cancelSaleByCustomer(
      saleId,
      cancelDto.email,
      cancelDto.reason,
    );
  }

  @Post(":id/cancel-by-admin")
  @UseGuards(CookieAuthGuard, RolesGuard)
  @Roles([Role.Admin, Role.SuperAdmin])
  @ApiOperation({
    summary: "Cancel sale by admin",
    description:
      "Admin can cancel any order at any stage with option to waive the 10% penalty.",
  })
  @ApiParam({ name: "id", description: "Sale ID" })
  @ApiResponse({
    status: 200,
    description: "Order cancelled successfully by admin",
    type: CancelSaleResponseDto,
  })
  @ApiResponse({
    status: 200,
    description: "Order cancelled successfully by admin",
    type: CancelSaleResponseDto,
  })
  @AuditLog({
    actionType: AuditActionType.SALE_CANCELLED,
    entityType: AuditEntityType.SALE,
    description: "Admin cancelled sale",
    getEntityId: result => result?.sale?.id,
  })
  public async cancelSaleByAdmin(
    @Param("id") saleId: string,
    @Body() cancelDto: CancelSaleByAdminDto,
  ): Promise<{
    message: string;
    sale: SaleResponseDto;
    refundAmount?: number;
    penaltyAmount?: number;
    refundProcessed?: boolean;
  }> {
    return this.salesService.cancelSaleByAdmin(
      saleId,
      cancelDto.waivePenalty,
      cancelDto.reason,
    );
  }

  @Delete(":id")
  @UseGuards(CookieAuthGuard, RolesGuard)
  @Roles([Role.Admin, Role.SuperAdmin])
  @ApiOperation({
    summary: "Soft delete sale (legacy)",
    description:
      "Legacy endpoint for soft deleting a sale. Use cancel endpoints instead.",
  })
  @ApiResponse({ status: 200, type: SaleResponseDto })
  @AuditLog({
    actionType: AuditActionType.SALE_CANCELLED,
    entityType: AuditEntityType.SALE,
    description: "Soft deleted sale",
    getEntityId: result => result?.id,
  })
  public async deleteSale(
    @Param("id") saleId: string,
  ): Promise<SaleResponseDto> {
    return this.salesService.cancelSale(saleId);
  }

  @Patch(":id/delivery-cost")
  @UseGuards(CookieAuthGuard, RolesGuard)
  @Roles([Role.Admin, Role.SuperAdmin])
  @ApiOperation({
    summary: "Update delivery cost for a sale (e.g., for international orders)",
  })
  @ApiParam({ name: "id", description: "Sale ID" })
  @ApiResponse({
    status: 200,
    description:
      "Delivery cost updated successfully. Customer will be notified.",
    type: SaleResponseDto,
  })
  public async updateDeliveryCost(
    @Param("id") id: string,
    @Body() data: UpdateDeliveryCostDto,
  ): Promise<IResponse<SaleResponseDto>> {
    const response = await this.salesService.updateDeliveryCost(id, data);
    return {
      message: "Delivery cost updated successfully. Customer will be notified.",
      data: response,
    };
  }
}
