import { Injectable } from "@nestjs/common";
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
import { SaleResponseDto } from "../dto/sales/saleResponse.dto";
import { UpdateDeliveryCostDto } from "../dto/checkout.dto";
import { IPagination } from "../interfaces/general";
import { SaleCreationService } from "./sale-creation.service";
import { SaleUpdateService } from "./sale-update.service";
import { SaleCancellationService } from "./sale-cancellation.service";
import { DocumentGenerationService } from "./document-generation.service";
import { OrderTrackingService } from "./order-tracking.service";
import { SaleQueryService } from "./sale-query.service";
import {
  IInitializeTransactionData,
  IInitializeTransactionResponse,
} from "../interfaces/payment.interface";
import { CancelSaleResponseDto } from "../dto/sales/cancelSale.dto";

@Injectable()
export class SalesService {
  constructor(
    private readonly saleCreationService: SaleCreationService,
    private readonly saleUpdateService: SaleUpdateService,
    private readonly saleCancellationService: SaleCancellationService,
    private readonly documentGenerationService: DocumentGenerationService,
    private readonly orderTrackingService: OrderTrackingService,
    private readonly saleQueryService: SaleQueryService,
  ) {}

  public async createSale(
    createSaleDto: CreateSaleDto,
  ): Promise<SaleResponseDto> {
    return this.saleCreationService.createSale(createSaleDto);
  }

  public async updateSale(
    saleId: string,
    updateDto: UpdateSaleDto,
  ): Promise<SaleResponseDto> {
    return this.saleUpdateService.updateSale(saleId, updateDto);
  }

  public async updateSaleStatus(
    saleId: string,
    updateDto: UpdateSaleStatusDto,
  ): Promise<SaleResponseDto> {
    return this.saleUpdateService.updateSaleStatus(saleId, updateDto);
  }

  public async addLineItem(
    saleId: string,
    addDto: AddLineItemDto,
  ): Promise<SaleResponseDto> {
    return this.saleUpdateService.addLineItem(saleId, addDto);
  }

  public async assignBatches(
    saleId: string,
    assignDto: AssignBatchesDto,
  ): Promise<SaleResponseDto> {
    return this.saleUpdateService.assignBatches(saleId, assignDto);
  }

  public async listSales(
    query: ListSalesDto,
  ): Promise<IPagination<SaleResponseDto>> {
    return this.saleQueryService.listSales(query);
  }

  public async listSalesByEmail(
    query: ListSalesByEmailDto,
  ): Promise<IPagination<SaleResponseDto>> {
    return this.saleQueryService.listSalesByEmail(query);
  }

  public async getSaleDetails(saleId: string): Promise<SaleResponseDto> {
    return this.saleQueryService.getSaleDetails(saleId);
  }

  public async cancelSaleByCustomer(
    saleId: string,
    email: string,
    reason?: string,
  ): Promise<CancelSaleResponseDto> {
    return this.saleCancellationService.cancelSaleByCustomer(
      saleId,
      email,
      reason,
    );
  }

  public async cancelSaleByAdmin(
    saleId: string,
    waivePenalty: boolean,
    reason?: string,
  ): Promise<CancelSaleResponseDto> {
    return this.saleCancellationService.cancelSaleByAdmin(
      saleId,
      waivePenalty,
      reason,
    );
  }

  public async cancelSale(saleId: string): Promise<SaleResponseDto> {
    return this.saleCancellationService.cancelSale(saleId);
  }

  public async generateInvoice(
    saleId: string,
    invoiceDto: GenerateInvoiceDto,
  ): Promise<Buffer> {
    return this.documentGenerationService.generateInvoice(saleId, invoiceDto);
  }

  public async generateReceipt(
    saleId: string,
    receiptDto: GenerateReceiptDto,
  ): Promise<Buffer> {
    return this.documentGenerationService.generateReceipt(saleId, receiptDto);
  }

  public async generateWaybill(
    saleId: string,
    waybillDto: GenerateWaybillDto,
  ): Promise<Buffer> {
    return this.documentGenerationService.generateWaybill(saleId, waybillDto);
  }

  public async trackOrder(
    saleId: string,
    email: string,
  ): Promise<SaleResponseDto> {
    return this.orderTrackingService.trackOrder(saleId, email);
  }

  public async payForOrder(
    saleId: string,
    email: string,
  ): Promise<IInitializeTransactionResponse<IInitializeTransactionData>> {
    return this.orderTrackingService.payForOrder(saleId, email);
  }

  public async confirmDelivery(
    saleId: string,
    confirmed: boolean,
  ): Promise<SaleResponseDto> {
    return this.saleUpdateService.confirmDelivery(saleId, confirmed);
  }

  public async updateDeliveryCost(
    saleId: string,
    dto: UpdateDeliveryCostDto,
  ): Promise<SaleResponseDto> {
    return this.saleUpdateService.updateDeliveryCost(saleId, dto);
  }
}
