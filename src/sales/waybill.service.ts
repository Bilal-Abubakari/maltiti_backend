import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import * as PDFDocument from "pdfkit";
import * as path from "path";
import { Sale } from "../entities/Sale.entity";
import { Product } from "../entities/Product.entity";
import {
  DriverDetailsDto,
  GenerateWaybillDto,
  ReceiverDetailsDto,
} from "../dto/generateWaybill.dto";
import { SaleLineItem } from "../interfaces/sale-line-item.interface";

interface LineItemWithProduct extends SaleLineItem {
  product?: Product;
}

@Injectable()
export class WaybillService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  public async generateWaybill(
    saleId: string,
    waybillDto: GenerateWaybillDto,
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

      // Add waybill details
      this.addWaybillDetails(doc, waybillNo, waybillDate, primaryColor);

      // Add horizontal separator
      doc
        .strokeColor(primaryColor)
        .lineWidth(2)
        .moveTo(50, 170)
        .lineTo(550, 170)
        .stroke();

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

  private addWaybillDetails(
    doc: PDFKit.PDFDocument,
    waybillNo: string,
    waybillDate: Date,
    primaryColor: string,
  ): void {
    // Waybill title
    doc
      .fontSize(28)
      .fillColor(primaryColor)
      .text("WAYBILL", 400, 50, { align: "right" });

    // Waybill details (right side)
    doc
      .fontSize(10)
      .fillColor("#333333")
      .text(`Waybill No: ${waybillNo}`, 400, 85, { align: "right" })
      .text(
        `Date: ${waybillDate.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}`,
        400,
        100,
        { align: "right" },
      );
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

  private addFooter(doc: PDFKit.PDFDocument, primaryColor: string): void {
    const footerY = 750;
    doc
      .strokeColor(primaryColor)
      .lineWidth(1)
      .moveTo(50, footerY)
      .lineTo(550, footerY)
      .stroke();

    doc
      .fontSize(8)
      .fillColor("#666666")
      .text(
        "This waybill serves as proof of goods in transit. Please verify items upon receipt.",
        50,
        footerY + 10,
        {
          align: "center",
          width: 500,
        },
      );
  }
}
