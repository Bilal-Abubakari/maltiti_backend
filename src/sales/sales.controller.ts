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
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Response } from "express";
import { SalesService } from "./sales.service";
import { CreateSaleDto } from "../dto/createSale.dto";
import { UpdateSaleDto } from "../dto/updateSale.dto";
import { UpdateSaleStatusDto } from "../dto/updateSaleStatus.dto";
import { AddLineItemDto } from "../dto/addLineItem.dto";
import { AssignBatchesDto } from "../dto/assignBatches.dto";
import { ListSalesDto } from "../dto/listSales.dto";
import { GenerateInvoiceDto } from "../dto/generateInvoice.dto";
import { GenerateReceiptDto } from "../dto/generateReceipt.dto";
import { Sale } from "../entities/Sale.entity";
import { IPaginatedResponse } from "../interfaces/general";

@ApiTags("Sales")
@Controller("sales")
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @ApiOperation({ summary: "Create a new sale" })
  @ApiResponse({ status: 201, type: Sale })
  public async createSale(@Body() createSaleDto: CreateSaleDto): Promise<Sale> {
    return this.salesService.createSale(createSaleDto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Edit sale details" })
  @ApiResponse({ status: 200, type: Sale })
  public async updateSale(
    @Param("id") saleId: string,
    @Body() updateDto: UpdateSaleDto,
  ): Promise<Sale> {
    return this.salesService.updateSale(saleId, updateDto);
  }

  @Put(":id/status")
  @ApiOperation({ summary: "Update sale status" })
  @ApiResponse({ status: 200, type: Sale })
  public async updateSaleStatus(
    @Param("id") saleId: string,
    @Body() updateDto: UpdateSaleStatusDto,
  ): Promise<Sale> {
    return this.salesService.updateSaleStatus(saleId, updateDto);
  }

  @Post(":id/line-items")
  @ApiOperation({ summary: "Add line item to sale" })
  @ApiResponse({ status: 200, type: Sale })
  public async addLineItem(
    @Param("id") saleId: string,
    @Body() addDto: AddLineItemDto,
  ): Promise<Sale> {
    return this.salesService.addLineItem(saleId, addDto);
  }

  @Put(":id/batches")
  @ApiOperation({ summary: "Assign batches to line item" })
  @ApiResponse({ status: 200, type: Sale })
  public async assignBatches(
    @Param("id") saleId: string,
    @Body() assignDto: AssignBatchesDto,
  ): Promise<Sale> {
    return this.salesService.assignBatches(saleId, assignDto);
  }

  @Get()
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
  @ApiResponse({ status: 200, type: Sale })
  public async getSaleDetails(@Param("id") saleId: string): Promise<Sale> {
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

  @Delete(":id")
  @ApiOperation({ summary: "Cancel sale" })
  @ApiResponse({ status: 200, type: Sale })
  public async cancelSale(@Param("id") saleId: string): Promise<Sale> {
    return this.salesService.cancelSale(saleId);
  }
}
