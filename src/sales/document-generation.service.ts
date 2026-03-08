import { Injectable } from "@nestjs/common";
import { GenerateInvoiceDto } from "../dto/generateInvoice.dto";
import { GenerateReceiptDto } from "../dto/generateReceipt.dto";
import { GenerateWaybillDto } from "../dto/generateWaybill.dto";
import { InvoiceService } from "./invoice.service";
import { ReceiptService } from "./receipt.service";
import { WaybillService } from "./waybill.service";
@Injectable()
export class DocumentGenerationService {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly receiptService: ReceiptService,
    private readonly waybillService: WaybillService,
  ) {}
  public async generateInvoice(
    saleId: string,
    invoiceDto: GenerateInvoiceDto,
  ): Promise<Buffer> {
    return this.invoiceService.generateInvoice(saleId, invoiceDto);
  }
  public async generateReceipt(
    saleId: string,
    receiptDto: GenerateReceiptDto,
  ): Promise<Buffer> {
    return this.receiptService.generateReceipt(saleId, receiptDto);
  }
  public async generateWaybill(
    saleId: string,
    waybillDto: GenerateWaybillDto,
  ): Promise<Buffer> {
    return this.waybillService.generateWaybill(saleId, waybillDto);
  }
}
