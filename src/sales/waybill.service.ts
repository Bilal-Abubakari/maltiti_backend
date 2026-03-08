import { Injectable } from "@nestjs/common";
import { Product } from "../entities/Product.entity";
import {
  DriverDetailsDto,
  GenerateWaybillDto,
  ReceiverDetailsDto,
} from "../dto/generateWaybill.dto";
import { SaleLineItem } from "../interfaces/sale-line-item.interface";
import { PdfGeneratorService } from "./pdf-generator.service";
import { SaleQueryService } from "./sale-query.service";

interface LineItemWithProduct extends SaleLineItem {
  product?: Product;
}

@Injectable()
export class WaybillService {
  constructor(
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly saleQuery: SaleQueryService,
  ) {}

  public async generateWaybill(
    saleId: string,
    waybillDto: GenerateWaybillDto,
  ): Promise<Buffer> {
    const { sale, lineItemsWithProducts } =
      await this.saleQuery.getSaleWithEnrichedLineItems(saleId);

    // Use receiver details if provided, otherwise fall back to customer
    const receiver: ReceiverDetailsDto = waybillDto.receiver || {
      name: sale.customer.name,
      phone: sale.customer.phone,
      email: sale.customer.email,
      address: sale.customer.address,
    };

    const remarks = waybillDto.remarks || "All In Good Condition";

    // Generate waybill number (using sale ID and date)
    const waybillDate = new Date();
    const waybillNo = `WB-${waybillDate.getFullYear()}${String(
      waybillDate.getMonth() + 1,
    ).padStart(2, "0")}-${saleId.substring(0, 8).toUpperCase()}`;

    return this.generatePDF(
      lineItemsWithProducts,
      waybillNo,
      waybillDate,
      waybillDto.driver,
      receiver,
      remarks,
    );
  }

  private generatePDF(
    lineItemsWithProducts: LineItemWithProduct[],
    waybillNo: string,
    waybillDate: Date,
    driver: DriverDetailsDto,
    receiver: ReceiverDetailsDto,
    remarks: string,
  ): Promise<Buffer> {
    return this.pdfGenerator.generatePdf((doc, primaryColor) => {
      // Add waybill details
      this.pdfGenerator.addDocumentDetails(
        doc,
        "WAYBILL",
        waybillNo,
        waybillDate,
        primaryColor,
        "Waybill",
      );

      // Add horizontal separator
      this.pdfGenerator.addSeparator(doc, primaryColor);

      // Add driver and receiver sections side by side
      this.addDriverAndReceiverSections(doc, driver, receiver, primaryColor);

      // Add items table
      const yPositionAfterTable = this.addItemsTable(
        doc,
        lineItemsWithProducts,
        primaryColor,
      );

      // Add remarks section
      this.addRemarksSection(doc, yPositionAfterTable, remarks, primaryColor);

      // Add signature section
      this.addSignatureSection(doc);

      // Add footer
      this.pdfGenerator.addFooter(
        doc,
        primaryColor,
        "This waybill serves as proof of goods in transit. Please verify items upon receipt.",
        8,
      );
    });
  }

  private addDriverAndReceiverSections(
    doc: PDFKit.PDFDocument,
    driver: DriverDetailsDto,
    receiver: ReceiverDetailsDto,
    primaryColor: string,
  ): void {
    const leftColumnX = 50;
    const rightColumnX = 310;
    const startY = 190;

    // Driver section (left)
    doc
      .fontSize(12)
      .fillColor(primaryColor)
      .text("DRIVER DETAILS:", leftColumnX, startY);

    doc
      .fontSize(10)
      .fillColor("#333333")
      .text(`Name: ${driver.name}`, leftColumnX, startY + 20)
      .text(`Vehicle No: ${driver.vehicleNumber}`, leftColumnX, startY + 35)
      .text(`Phone: ${driver.phoneNumber}`, leftColumnX, startY + 50);

    if (driver.email) {
      doc.text(`Email: ${driver.email}`, leftColumnX, startY + 65);
    }

    // Receiver section (right)
    doc
      .fontSize(12)
      .fillColor(primaryColor)
      .text("RECEIVER DETAILS:", rightColumnX, startY);

    doc
      .fontSize(10)
      .fillColor("#333333")
      .text(`Name: ${receiver.name}`, rightColumnX, startY + 20)
      .text(`Phone: ${receiver.phone}`, rightColumnX, startY + 35);

    let yOffset = startY + 50;
    if (receiver.email) {
      doc.text(`Email: ${receiver.email}`, rightColumnX, yOffset);
      yOffset += 15;
    }
    if (receiver.address) {
      doc.text(`Address: ${receiver.address}`, rightColumnX, yOffset, {
        width: 240,
      });
    }
  }

  private addItemsTable(
    doc: PDFKit.PDFDocument,
    lineItemsWithProducts: LineItemWithProduct[],
    primaryColor: string,
  ): number {
    const tableTop = 305;

    // Table header background
    doc.rect(50, tableTop, 495, 25).fillColor(primaryColor).fill();

    // Table headers text
    doc
      .fillColor("#FFFFFF")
      .fontSize(10)
      .text("ITEM NO.", 55, tableTop + 10, { width: 50 })
      .text("DESCRIPTION", 120, tableTop + 10, { width: 200 })
      .text("QUANTITY", 350, tableTop + 10, { width: 80, align: "center" })
      .text("UNIT", 445, tableTop + 10, { width: 90, align: "center" });

    // Table rows
    let yPosition = tableTop + 35;
    doc.fillColor("#333333");

    lineItemsWithProducts.forEach((item, index) => {
      const productName = item.product?.name || "Unknown Product";
      const weight = item.product?.weight || "";
      const description = weight ? `${productName} (${weight})` : productName;
      const unit = item.product?.weight || "pcs";

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
        .text((index + 1).toString(), 55, yPosition, { width: 50 })
        .text(description, 120, yPosition, { width: 220 })
        .text(item.requestedQuantity.toString(), 350, yPosition, {
          width: 80,
          align: "center",
        })
        .text(unit, 445, yPosition, { width: 90, align: "center" });

      yPosition += 30;
    });

    return yPosition;
  }

  private addRemarksSection(
    doc: PDFKit.PDFDocument,
    yPosition: number,
    remarks: string,
    primaryColor: string,
  ): void {
    yPosition += 30;

    doc.fontSize(11).fillColor(primaryColor).text("REMARKS:", 50, yPosition);

    doc
      .fontSize(10)
      .fillColor("#333333")
      .text(remarks, 50, yPosition + 20, { width: 495 });
  }

  private addSignatureSection(doc: PDFKit.PDFDocument): void {
    const signatureY = 680;
    const leftColumnX = 80;
    const rightColumnX = 350;

    // Driver signature
    doc
      .strokeColor("#333333")
      .lineWidth(1)
      .moveTo(leftColumnX, signatureY)
      .lineTo(leftColumnX + 150, signatureY)
      .stroke();

    doc
      .fontSize(10)
      .fillColor("#333333")
      .text("Driver's Signature", leftColumnX, signatureY + 10, {
        width: 150,
        align: "center",
      });

    // Receiver signature
    doc
      .strokeColor("#333333")
      .lineWidth(1)
      .moveTo(rightColumnX, signatureY)
      .lineTo(rightColumnX + 150, signatureY)
      .stroke();

    doc.text("Receiver's Signature", rightColumnX, signatureY + 10, {
      width: 150,
      align: "center",
    });
  }
}
