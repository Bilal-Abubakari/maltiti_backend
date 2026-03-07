import { Injectable } from "@nestjs/common";
import * as PDFDocument from "pdfkit";
import * as path from "node:path";
import { Sale } from "../entities/Sale.entity";
import { Product } from "../entities/Product.entity";
import { unitSymbols } from "../utils/constants";
import { SaleLineItem } from "../interfaces/sale-line-item.interface";

interface LineItemWithProduct extends SaleLineItem {
  product?: Product;
}

interface TotalsData {
  subtotal: number;
  discount: number;
  transportation: number;
  total: number;
  paymentMethod?: string;
}

@Injectable()
export class PdfGeneratorService {
  public addLogo(doc: PDFKit.PDFDocument): void {
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

  public addHeader(doc: PDFKit.PDFDocument, primaryColor: string): void {
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

  public addDocumentDetails(
    doc: PDFKit.PDFDocument,
    title: string,
    number: string,
    date: Date,
    primaryColor: string,
    label: string,
  ): void {
    // Document title
    doc
      .fontSize(28)
      .fillColor(primaryColor)
      .text(title, 400, 50, { align: "right" });

    // Document details (right side)
    doc
      .fontSize(10)
      .fillColor("#333333")
      .text(`${label} No: ${number}`, 400, 85, {
        align: "right",
        width: -100,
      })
      .text(
        `Date: ${date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}`,
        400,
        100,
        { align: "right" },
      );
  }

  public addSeparator(doc: PDFKit.PDFDocument, primaryColor: string): void {
    doc
      .strokeColor(primaryColor)
      .lineWidth(2)
      .moveTo(50, 170)
      .lineTo(550, 170)
      .stroke();
  }

  public addCustomerSection(
    doc: PDFKit.PDFDocument,
    sale: Sale,
    primaryColor: string,
    label: string,
  ): void {
    doc.fontSize(12).fillColor(primaryColor).text(`${label}:`, 50, 190);

    doc
      .fontSize(10)
      .fillColor("#333333")
      .text(sale.customer.name || "N/A", 50, 210)
      .text(sale.customer.phone || "", 50, 225)
      .text(sale.customer.email || "", 50, 240)
      .text(sale.customer.address || "", 50, 255, { width: 250 });
  }

  public addItemsTable(
    doc: PDFKit.PDFDocument,
    lineItemsWithProducts: LineItemWithProduct[],
    primaryColor: string,
    useUnitSymbols: boolean,
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
      const unitOfMeasurement = item.product?.unitOfMeasurement || "";
      const weightText = useUnitSymbols
        ? `${weight}${unitSymbols[unitOfMeasurement]}`
        : `${weight}`;
      const description = `${productName} (${weightText})`;
      const itemTotal = Number(item.finalPrice) * item.requestedQuantity;

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
        .text(`GHS ${Number(item.finalPrice).toFixed(2)}`, 345, yPosition, {
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

  public addFooter(
    doc: PDFKit.PDFDocument,
    primaryColor: string,
    message: string,
    fontSize: number = 9,
  ): void {
    const footerY = 750;
    doc
      .strokeColor(primaryColor)
      .lineWidth(1)
      .moveTo(50, footerY)
      .lineTo(550, footerY)
      .stroke();

    doc
      .fontSize(fontSize)
      .fillColor("#666666")
      .text(message, 50, footerY + 10, {
        align: "center",
        width: 500,
      });
  }

  public addTotalsSection(
    doc: PDFKit.PDFDocument,
    yPosition: number,
    totalsData: TotalsData,
    primaryColor: string,
  ): void {
    let currentY = yPosition + 20;
    const totalsX = 380;

    doc
      .fontSize(10)
      .fillColor("#333333")
      .text("Subtotal:", totalsX, currentY, { width: 80, align: "right" })
      .text(`GHS ${totalsData.subtotal.toFixed(2)}`, 470, currentY, {
        width: 75,
        align: "right",
      });

    currentY += 20;
    doc
      .text("Discount:", totalsX, currentY, { width: 80, align: "right" })
      .text(`GHS ${totalsData.discount.toFixed(2)}`, 470, currentY, {
        width: 75,
        align: "right",
      });

    currentY += 20;
    doc
      .text("Transportation:", totalsX, currentY, {
        width: 80,
        align: "right",
      })
      .text(`GHS ${totalsData.transportation.toFixed(2)}`, 470, currentY, {
        width: 75,
        align: "right",
      });

    currentY += 20;
    // Total line
    doc
      .strokeColor(primaryColor)
      .lineWidth(1)
      .moveTo(380, currentY - 5)
      .lineTo(545, currentY - 5)
      .stroke();

    currentY += 5;
    doc
      .fontSize(12)
      .fillColor(primaryColor)
      .text("TOTAL:", totalsX, currentY, { width: 80, align: "right" })
      .text(`GHS ${totalsData.total.toFixed(2)}`, 470, currentY, {
        width: 75,
        align: "right",
      });

    if (totalsData.paymentMethod) {
      // Payment method
      currentY += 35;
      doc
        .fontSize(10)
        .fillColor("#333333")
        .text("Payment Method:", 50, currentY)
        .font("Helvetica-Bold")
        .text(totalsData.paymentMethod, 165, currentY)
        .font("Helvetica");
    }
  }

  public generatePdf(
    contentAdder: (doc: PDFKit.PDFDocument, primaryColor: string) => void,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const primaryColor = "#0F6938";

      // Add company logo
      this.addLogo(doc);

      // Add header
      this.addHeader(doc, primaryColor);

      // Call the specific content adder
      contentAdder(doc, primaryColor);

      doc.end();
    });
  }
}
