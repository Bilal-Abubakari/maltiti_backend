import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import * as PDFDocument from "pdfkit";
import * as path from "path";
import { Sale } from "../entities/Sale.entity";
import { Product } from "../entities/Product.entity";
import { GenerateReceiptDto } from "../dto/generateReceipt.dto";
import { SaleLineItem } from "../interfaces/sale-line-item.interface";

interface LineItemWithProduct extends SaleLineItem {
  product?: Product;
}

@Injectable()
export class ReceiptService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  public async generateReceipt(
    saleId: string,
    receiptDto: GenerateReceiptDto,
  ): Promise<Buffer> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
      relations: ["customer"],
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found`);
    }

    // Fetch product details for each line item
    const lineItemsWithProducts = await Promise.all(
      sale.lineItems.map(async item => {
        const product = await this.productRepository.findOne({
          where: { id: item.productId, deletedAt: IsNull() },
        });
        return { ...item, product };
      }),
    );

    const discount = receiptDto.discount || 0;
    const transportation = receiptDto.transportation || 0;
    const paymentMethod = receiptDto.paymentMethod || "Cash";

    // Calculate subtotal
    const subtotal = lineItemsWithProducts.reduce(
      (sum, item) => sum + item.finalPrice * item.requestedQuantity,
      0,
    );

    const total = subtotal - discount + transportation;

    // Generate receipt number (using sale ID and date)
    const receiptDate = new Date();
    const receiptNo = `RCT-${receiptDate.getFullYear()}${String(
      receiptDate.getMonth() + 1,
    ).padStart(2, "0")}-${saleId.substring(0, 8).toUpperCase()}`;

    return this.generatePDF(
      sale,
      lineItemsWithProducts,
      receiptNo,
      receiptDate,
      subtotal,
      discount,
      transportation,
      total,
      paymentMethod,
    );
  }

  private generatePDF(
    sale: Sale,
    lineItemsWithProducts: LineItemWithProduct[],
    receiptNo: string,
    receiptDate: Date,
    subtotal: number,
    discount: number,
    transportation: number,
    total: number,
    paymentMethod: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Company primary color
      const primaryColor = "#0F6938";

      // Add company logo
      this.addLogo(doc);

      // Add header
      this.addHeader(doc, primaryColor);

      // Add receipt details
      this.addReceiptDetails(doc, receiptNo, receiptDate, primaryColor);

      // Add horizontal separator
      doc
        .strokeColor(primaryColor)
        .lineWidth(2)
        .moveTo(50, 170)
        .lineTo(550, 170)
        .stroke();

      // Add customer section
      this.addCustomerSection(doc, sale, primaryColor);

      // Add items table
      const yPositionAfterTable = this.addItemsTable(
        doc,
        lineItemsWithProducts,
        primaryColor,
      );

      // Add totals section
      this.addTotalsSection(
        doc,
        yPositionAfterTable,
        subtotal,
        discount,
        transportation,
        total,
        paymentMethod,
        primaryColor,
      );

      // Add footer
      this.addFooter(doc, primaryColor);

      doc.end();
    });
  }

  private addLogo(doc: PDFKit.PDFDocument): void {
    const logoPath = path.join(
      process.cwd(),
      "src",
      "assets",
      "images",
      "maltiti-logo.png",
    );
    try {
      doc.image(logoPath, 50, 45, { width: 80, height: 80 });
    } catch (error) {
      console.error("Logo not found:", error);
      console.error("Attempted path:", logoPath);
    }
  }

  private addHeader(doc: PDFKit.PDFDocument, primaryColor: string): void {
    doc
      .fontSize(16)
      .fillColor(primaryColor)
      .text("MALTITI A. ENTERPRISE LTD.", 140, 50);

    doc
      .fontSize(9)
      .fillColor("#333333")
      .text("Training, Organic Products and General Goods", 140, 72)
      .text("P. O BOX TL 2501, Tamale", 140, 85)
      .text("Tel: 0242381560 / 0557309018", 140, 98)
      .text("Digital Address: NS-94-7460", 140, 111)
      .text("www.maltitiaenterprise.com", 140, 124)
      .text("Email: info@maltitiaenterprise.com", 140, 137);
  }

  private addReceiptDetails(
    doc: PDFKit.PDFDocument,
    receiptNo: string,
    receiptDate: Date,
    primaryColor: string,
  ): void {
    // Receipt title
    doc
      .fontSize(28)
      .fillColor(primaryColor)
      .text("RECEIPT", 400, 50, { align: "right" });

    // Receipt details (right side)
    doc
      .fontSize(10)
      .fillColor("#333333")
      .text(`Receipt No: ${receiptNo}`, 400, 85, {
        align: "right",
        width: -100,
      })
      .text(
        `Date: ${receiptDate.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}`,
        400,
        100,
        { align: "right" },
      );
  }

  private addCustomerSection(
    doc: PDFKit.PDFDocument,
    sale: Sale,
    primaryColor: string,
  ): void {
    doc.fontSize(12).fillColor(primaryColor).text("RECEIVED FROM:", 50, 190);

    doc
      .fontSize(10)
      .fillColor("#333333")
      .text(sale.customer.name || "N/A", 50, 210)
      .text(sale.customer.phone || "", 50, 225)
      .text(sale.customer.email || "", 50, 240)
      .text(sale.customer.address || "", 50, 255, { width: 250 });
  }

  private addItemsTable(
    doc: PDFKit.PDFDocument,
    lineItemsWithProducts: LineItemWithProduct[],
    primaryColor: string,
  ): number {
    const tableTop = 295;

    // Table header background
    doc.rect(50, tableTop, 495, 25).fillColor(primaryColor).fill();

    // Table headers text
    doc
      .fillColor("#FFFFFF")
      .fontSize(10)
      .text("DESCRIPTION", 55, tableTop + 10, { width: 180 })
      .text("QUANTITY", 270, tableTop + 10, { width: 60, align: "center" })
      .text("UNIT PRICE (GHS)", 345, tableTop + 10, {
        width: 100,
        align: "right",
      })
      .text("TOTAL (GHS)", 440, tableTop + 8, { width: 100, align: "right" });

    // Table rows
    let yPosition = tableTop + 35;
    doc.fillColor("#333333");

    lineItemsWithProducts.forEach((item, index) => {
      const productName = item.product?.name || "Unknown Product";
      const weight = item.product?.weight || "";
      const description = weight ? `${productName} (${weight})` : productName;
      const itemTotal = item.finalPrice * item.requestedQuantity;

      // Alternate row background
      if (index % 2 === 0) {
        doc
          .rect(50, yPosition - 8, 495, 25)
          .fillColor("#F5F5F5")
          .fill();
      }

      doc
        .fillColor("#333333")
        .fontSize(9)
        .text(description, 55, yPosition, { width: 200 })
        .text(item.requestedQuantity.toString(), 270, yPosition, {
          width: 60,
          align: "center",
        })
        .text(`GHS ${item.finalPrice.toFixed(2)}`, 345, yPosition, {
          width: 80,
          align: "right",
        })
        .text(`GHS ${itemTotal.toFixed(2)}`, 440, yPosition, {
          width: 100,
          align: "right",
        });

      yPosition += 30;
    });

    return yPosition;
  }

  private addTotalsSection(
    doc: PDFKit.PDFDocument,
    yPosition: number,
    subtotal: number,
    discount: number,
    transportation: number,
    total: number,
    paymentMethod: string,
    primaryColor: string,
  ): void {
    yPosition += 20;
    const totalsX = 380;

    doc
      .fontSize(10)
      .fillColor("#333333")
      .text("Subtotal:", totalsX, yPosition, { width: 80, align: "right" })
      .text(`GHS ${subtotal.toFixed(2)}`, 470, yPosition, {
        width: 75,
        align: "right",
      });

    yPosition += 20;
    doc
      .text("Discount:", totalsX, yPosition, { width: 80, align: "right" })
      .text(`GHS ${discount.toFixed(2)}`, 470, yPosition, {
        width: 75,
        align: "right",
      });

    yPosition += 20;
    doc
      .text("Transportation:", totalsX, yPosition, {
        width: 80,
        align: "right",
      })
      .text(`GHS ${transportation.toFixed(2)}`, 470, yPosition, {
        width: 75,
        align: "right",
      });

    yPosition += 20;
    // Total line
    doc
      .strokeColor(primaryColor)
      .lineWidth(1)
      .moveTo(380, yPosition - 5)
      .lineTo(545, yPosition - 5)
      .stroke();

    yPosition += 5;
    doc
      .fontSize(12)
      .fillColor(primaryColor)
      .text("TOTAL:", totalsX, yPosition, { width: 80, align: "right" })
      .text(`GHS ${total.toFixed(2)}`, 470, yPosition, {
        width: 75,
        align: "right",
      });

    // Payment method
    yPosition += 35;
    doc
      .fontSize(10)
      .fillColor("#333333")
      .text("Payment Method:", 50, yPosition)
      .font("Helvetica-Bold")
      .text(paymentMethod, 165, yPosition)
      .font("Helvetica");
  }

  private addFooter(doc: PDFKit.PDFDocument, primaryColor: string): void {
    const footerY = 750;
    doc
      .strokeColor(primaryColor)
      .lineWidth(1)
      .moveTo(50, footerY)
      .lineTo(550, footerY)
      .stroke();

    doc
      .fontSize(9)
      .fillColor("#666666")
      .text("Thank you for your purchase!", 50, footerY + 10, {
        align: "center",
        width: 500,
      });
  }
}
