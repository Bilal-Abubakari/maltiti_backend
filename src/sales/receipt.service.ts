import { Injectable } from "@nestjs/common";
import { Sale } from "../entities/Sale.entity";
import { Product } from "../entities/Product.entity";
import { GenerateReceiptDto } from "../dto/generateReceipt.dto";
import { SaleLineItem } from "../interfaces/sale-line-item.interface";
import { PdfGeneratorService } from "./pdf-generator.service";
import { SaleQueryService } from "./sale-query.service";

interface LineItemWithProduct extends SaleLineItem {
  product?: Product;
}

interface ReceiptDocumentData {
  sale: Sale;
  lineItemsWithProducts: LineItemWithProduct[];
  receiptNo: string;
  receiptDate: Date;
  subtotal: number;
  discount: number;
  transportation: number;
  total: number;
  paymentMethod: string;
}

@Injectable()
export class ReceiptService {
  constructor(
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly saleQuery: SaleQueryService,
  ) {}

  public async generateReceipt(
    saleId: string,
    receiptDto: GenerateReceiptDto,
  ): Promise<Buffer> {
    const { sale, lineItemsWithProducts } =
      await this.saleQuery.getSaleWithEnrichedLineItems(saleId);

    const discount = receiptDto.discount || 0;
    const transportation = Number(sale.deliveryFee) || 0;
    const paymentMethod = receiptDto.paymentMethod || "Cash";

    // Calculate subtotal
    const subtotal = lineItemsWithProducts.reduce(
      (sum, item) => sum + item.finalPrice * item.requestedQuantity,
      0,
    );

    const total = subtotal - discount + transportation;

    // Generate a receipt number (using sale ID and date)
    const receiptDate = new Date();
    const receiptNo = `RCT-${receiptDate.getFullYear()}${String(
      receiptDate.getMonth() + 1,
    ).padStart(2, "0")}-${saleId.substring(0, 8).toUpperCase()}`;

    return this.generatePDF({
      sale,
      lineItemsWithProducts,
      receiptNo,
      receiptDate,
      subtotal,
      discount,
      transportation,
      total,
      paymentMethod,
    });
  }

  private generatePDF({
    sale,
    lineItemsWithProducts,
    receiptNo,
    receiptDate,
    subtotal,
    discount,
    transportation,
    total,
    paymentMethod,
  }: ReceiptDocumentData): Promise<Buffer> {
    return this.pdfGenerator.generatePdf((doc, primaryColor) => {
      // Add receipt details
      this.pdfGenerator.addDocumentDetails(
        doc,
        "RECEIPT",
        receiptNo,
        receiptDate,
        primaryColor,
        "Receipt",
      );

      // Add horizontal separator
      this.pdfGenerator.addSeparator(doc, primaryColor);

      // Add customer section
      this.pdfGenerator.addCustomerSection(
        doc,
        sale,
        primaryColor,
        "RECEIVED FROM",
      );

      // Add items table
      const yPositionAfterTable = this.pdfGenerator.addItemsTable(
        doc,
        lineItemsWithProducts,
        primaryColor,
        true,
      );

      // Add totals section
      this.pdfGenerator.addTotalsSection(
        doc,
        yPositionAfterTable,
        { subtotal, discount, transportation, total, paymentMethod },
        primaryColor,
      );

      // Add footer
      this.pdfGenerator.addFooter(
        doc,
        primaryColor,
        "Thank you for your purchase!",
      );
    });
  }
}
