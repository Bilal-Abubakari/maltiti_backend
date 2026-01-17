import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { Response } from "express";
import { SalesService } from "./sales.service";
import { CreateSaleDto } from "../dto/sales/createSale.dto";
import { UpdateSaleDto } from "../dto/sales/updateSale.dto";
import { UpdateSaleStatusDto } from "../dto/sales/updateSaleStatus.dto";
import { AddLineItemDto } from "../dto/addLineItem.dto";
import { AssignBatchesDto } from "../dto/assignBatches.dto";
import { ListSalesDto } from "../dto/listSales.dto";
import { GenerateInvoiceDto } from "../dto/generateInvoice.dto";
import { GenerateReceiptDto } from "../dto/generateReceipt.dto";
import { GenerateWaybillDto } from "../dto/generateWaybill.dto";
import { TrackOrderDto } from "../dto/sales/trackOrder.dto";
import { TrackOrderResponseDto } from "../dto/sales/trackOrderResponse.dto";
import { SaleResponseDto } from "../dto/sales/saleResponse.dto";
import {
  IPaginatedResponse,
  IResponse,
  IInitializeTransactionResponse,
  IInitalizeTransactionData,
} from "../interfaces/general";
import { AuditLog } from "../interceptors/audit.interceptor";
import { AuditActionType } from "../enum/audit-action-type.enum";
import { AuditEntityType } from "../enum/audit-entity-type.enum";
import { Sale } from "../entities/Sale.entity";
import { CookieAuthGuard } from "../authentication/guards/cookie-auth.guard";
import { RolesGuard } from "../authentication/guards/roles/roles.guard";
import { Roles } from "../authentication/guards/roles/roles.decorator";
import { Role } from "../enum/role.enum";

@ApiTags("Sales")
@Controller("sales")
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @ApiOperation({ summary: "Create a new sale" })
  @ApiResponse({ status: 201, type: SaleResponseDto })
  public async createSale(
    @Body() createSaleDto: CreateSaleDto,
  ): Promise<SaleResponseDto> {
    return this.salesService.createSale(createSaleDto);
  }

  @Patch(":id")
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
  })
  public async payForOrder(
    @Param("saleId") saleId: string,
    @Query() query: TrackOrderDto,
  ): Promise<IInitializeTransactionResponse<IInitalizeTransactionData>> {
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
  @Roles([Role.Admin])
  @ApiOperation({ summary: "List sales" })
  @ApiResponse({ status: 200, type: Object })
  public async listSales(
    @Query() query: ListSalesDto,
  ): Promise<IPaginatedResponse<Sale>> {
    const sales = await this.salesService.listSales(query);

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

  @Delete(":id")
  @ApiOperation({ summary: "Cancel sale" })
  @ApiResponse({ status: 200, type: SaleResponseDto })
  @AuditLog({
    actionType: AuditActionType.SALE_CANCELLED,
    entityType: AuditEntityType.SALE,
    description: "Cancelled sale",
    getEntityId: result => result?.id,
  })
  public async cancelSale(
    @Param("id") saleId: string,
  ): Promise<SaleResponseDto> {
    return this.salesService.cancelSale(saleId);
  }
}
