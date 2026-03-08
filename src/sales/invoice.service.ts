import { Injectable } from "@nestjs/common";
import { Sale } from "../entities/Sale.entity";
import { Product } from "../entities/Product.entity";
import { GenerateInvoiceDto } from "../dto/generateInvoice.dto";
import { SaleLineItem } from "../interfaces/sale-line-item.interface";
import { PdfGeneratorService } from "./pdf-generator.service";
import { SaleQueryService } from "./sale-query.service";

interface LineItemWithProduct extends SaleLineItem {
  product?: Product;
}

interface InvoiceDocumentData {
  sale: Sale;
  lineItemsWithProducts: LineItemWithProduct[];
  invoiceNo: string;
  invoiceDate: Date;
  subtotal: number;
  discount: number;
  transportation: number;
  total: number;
}

@Injectable()
export class InvoiceService {
  constructor(
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly saleQuery: SaleQueryService,
  ) {}

  public async generateInvoice(
    saleId: string,
    invoiceDto: GenerateInvoiceDto,
  ): Promise<Buffer> {
    const { sale, lineItemsWithProducts } =
      await this.saleQuery.getSaleWithEnrichedLineItems(saleId);

    const discount = invoiceDto.discount || 0;
    const transportation = Number(sale.deliveryFee) || 0;

    // Calculate subtotal
    const subtotal = lineItemsWithProducts.reduce(
      (sum, item) => sum + item.finalPrice * item.requestedQuantity,
      0,
    );

    const total = subtotal - discount + transportation;

    // Generate invoice number (using sale ID and date)
    const invoiceDate = new Date();
    const invoiceNo = `INV-${invoiceDate.getFullYear()}${String(
      invoiceDate.getMonth() + 1,
    ).padStart(2, "0")}-${saleId.substring(0, 8).toUpperCase()}`;

    return this.generatePDF({
      sale,
      lineItemsWithProducts,
      invoiceNo,
      invoiceDate,
      subtotal,
      discount,
      transportation,
      total,
    });
  }

  private generatePDF({
    sale,
    lineItemsWithProducts,
    invoiceNo,
    invoiceDate,
    subtotal,
    discount,
    transportation,
    total,
  }: InvoiceDocumentData): Promise<Buffer> {
    return this.pdfGenerator.generatePdf((doc, primaryColor) => {
      // Add invoice details
      this.pdfGenerator.addDocumentDetails(
        doc,
        "INVOICE",
        invoiceNo,
        invoiceDate,
        primaryColor,
        "Invoice",
      );

      // Add horizontal separator
      this.pdfGenerator.addSeparator(doc, primaryColor);

      // Add bill to section
      this.pdfGenerator.addCustomerSection(doc, sale, primaryColor, "BILL TO");

      // Add items table
      const yPositionAfterTable = this.pdfGenerator.addItemsTable(
        doc,
        lineItemsWithProducts,
        primaryColor,
        false,
      );

      // Add totals section
      this.pdfGenerator.addTotalsSection(
        doc,
        yPositionAfterTable,
        { subtotal, discount, transportation, total },
        primaryColor,
      );

      // Add footer
      this.pdfGenerator.addFooter(
        doc,
        primaryColor,
        "Thank you for your business!",
      );
    });
  }
}
