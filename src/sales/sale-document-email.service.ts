import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MailerService } from "@nestjs-modules/mailer";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Sale } from "../entities/Sale.entity";
import { Customer } from "../entities/Customer.entity";
import { Product } from "../entities/Product.entity";
import { InvoiceService } from "./invoice.service";
import { ReceiptService } from "./receipt.service";
import { ADMIN_FROM_EMAIL } from "../constants/admin-emails.constant";
import { userOrderId } from "../utils/product.utils";
import { formatStatus } from "../utils/status-formatter.util";
import { PaymentStatus } from "../enum/payment-status.enum";
import { ProductDisplayService } from "./product-display.service";

interface OrderItemEmailData {
  readonly productName: string;
  readonly quantity: number;
  readonly unitPrice: string;
  readonly lineTotal: string;
}

interface SaleDocumentEmailContext {
  readonly sale: Sale;
  readonly customer: Customer;
}

@Injectable()
export class SaleDocumentEmailService {
  private readonly logger = new Logger(SaleDocumentEmailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly invoiceService: InvoiceService,
    private readonly receiptService: ReceiptService,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly productDisplayService: ProductDisplayService,
  ) {}

  public async sendInvoiceEmail(
    context: SaleDocumentEmailContext,
  ): Promise<void> {
    const { sale, customer } = context;
    const email = customer.email;

    if (!email) {
      this.logger.warn(
        `Skipping invoice email for sale ${sale.id} — customer has no email address`,
      );
      return;
    }

    try {
      const pdfBuffer = await this.invoiceService.generateInvoice(sale.id, {});

      const invoiceNo = this.buildInvoiceNumber(sale.id);
      const orderReference = userOrderId(sale.id);
      const invoiceDate = new Date();
      const dueDate = this.buildDueDate(invoiceDate, 7);
      const frontendUrl = this.configService.get<string>("FRONTEND_URL") ?? "";
      const trackOrderUrl = `${frontendUrl}/track-order/${sale.id}`;

      const { orderItems, subtotal, deliveryFee, serviceFee, grandTotal } =
        await this.buildOrderEmailItems(sale);

      const deliveryAddress = this.buildDeliveryAddress(customer);

      await this.mailerService.sendMail({
        to: email,
        from: ADMIN_FROM_EMAIL,
        subject: `Invoice ${invoiceNo} for Order #${orderReference} | Maltiti A. Enterprise Ltd`,
        template: "./invoice-email",
        context: {
          customerName: customer.name,
          orderReference,
          invoiceNo,
          invoiceDate: invoiceDate.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          dueDate,
          orderStatus: formatStatus(sale.orderStatus),
          orderStatusClass: sale.orderStatus,
          paymentStatus: formatStatus(sale.paymentStatus),
          paymentStatusClass: sale.paymentStatus,
          deliveryAddress,
          orderItems,
          subtotal,
          deliveryFee,
          serviceFee,
          grandTotal,
          trackOrderUrl,
          currentYear: new Date().getFullYear(),
        },
        attachments: [
          {
            filename: `invoice-${invoiceNo}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      });

      this.logger.log(
        `Invoice email sent to ${email} for sale ${sale.id} (invoice: ${invoiceNo})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send invoice email for sale ${sale.id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  public async sendReceiptEmail(
    context: SaleDocumentEmailContext,
  ): Promise<void> {
    const { sale, customer } = context;
    const email = customer.email;

    if (!email) {
      this.logger.warn(
        `Skipping receipt email for sale ${sale.id} — customer has no email address`,
      );
      return;
    }

    try {
      const pdfBuffer = await this.receiptService.generateReceipt(sale.id, {});

      const receiptNo = this.buildReceiptNumber(sale.id);
      const orderReference = userOrderId(sale.id);
      const paymentDate = new Date();
      const frontendUrl = this.configService.get<string>("FRONTEND_URL") ?? "";
      const trackOrderUrl = `${frontendUrl}/track-order/${sale.id}`;

      const { orderItems, subtotal, deliveryFee, serviceFee, grandTotal } =
        await this.buildOrderEmailItems(sale);

      const deliveryAddress = this.buildDeliveryAddress(customer);

      await this.mailerService.sendMail({
        to: email,
        from: ADMIN_FROM_EMAIL,
        subject: `Payment Receipt ${receiptNo} — Thank You! | Maltiti A. Enterprise Ltd`,
        template: "./receipt-email",
        context: {
          customerName: customer.name,
          orderReference,
          receiptNo,
          paymentDate: paymentDate.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          paymentMethod: "Online Payment",
          orderStatus: formatStatus(sale.orderStatus),
          orderStatusClass: sale.orderStatus,
          deliveryAddress,
          orderItems,
          subtotal,
          deliveryFee,
          serviceFee,
          grandTotal,
          trackOrderUrl,
          currentYear: new Date().getFullYear(),
        },
        attachments: [
          {
            filename: `receipt-${receiptNo}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      });

      this.logger.log(
        `Receipt email sent to ${email} for sale ${sale.id} (receipt: ${receiptNo})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send receipt email for sale ${sale.id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  /**
   * Convenience method: given a sale ID, load it with enriched line items and send
   * the correct document email based on the current payment status.
   */
  public async sendDocumentEmailForSale(
    sale: Sale,
    customer: Customer,
  ): Promise<void> {
    if (sale.paymentStatus === PaymentStatus.INVOICE_REQUESTED) {
      await this.sendInvoiceEmail({ sale, customer });
      return;
    }

    if (sale.paymentStatus === PaymentStatus.PAID) {
      await this.sendReceiptEmail({ sale, customer });
    }
  }

  private async buildOrderEmailItems(sale: Sale): Promise<{
    orderItems: OrderItemEmailData[];
    subtotal: string | undefined;
    deliveryFee: string | undefined;
    serviceFee: string | undefined;
    grandTotal: string | undefined;
  }> {
    const orderItems: OrderItemEmailData[] = await Promise.all(
      sale.lineItems.map(async item => ({
        productName: await this.productDisplayService.resolveProductDisplayName(
          item.productId,
        ),
        quantity: item.requestedQuantity,
        unitPrice: Number(item.finalPrice).toFixed(2),
        lineTotal: (item.requestedQuantity * Number(item.finalPrice)).toFixed(
          2,
        ),
      })),
    );

    const productTotal = sale.lineItems.reduce(
      (sum, item) => sum + item.requestedQuantity * Number(item.finalPrice),
      0,
    );

    const subtotal = productTotal > 0 ? productTotal.toFixed(2) : undefined;
    const deliveryFeeNum = Number(sale.deliveryFee ?? 0);
    const serviceFeeNum = Number(sale.serviceFee ?? 0);

    const deliveryFee =
      deliveryFeeNum > 0 ? deliveryFeeNum.toFixed(2) : undefined;
    const serviceFee = serviceFeeNum > 0 ? serviceFeeNum.toFixed(2) : undefined;

    const total = productTotal + deliveryFeeNum + serviceFeeNum;
    const grandTotal = total > 0 ? total.toFixed(2) : undefined;

    return { orderItems, subtotal, deliveryFee, serviceFee, grandTotal };
  }

  private buildDeliveryAddress(customer: Customer): string | undefined {
    const parts = [
      customer.address,
      customer.city,
      customer.region,
      customer.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : undefined;
  }

  private buildInvoiceNumber(saleId: string): string {
    const now = new Date();
    return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${saleId.substring(0, 8).toUpperCase()}`;
  }

  private buildReceiptNumber(saleId: string): string {
    const now = new Date();
    return `RCT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${saleId.substring(0, 8).toUpperCase()}`;
  }

  private buildDueDate(from: Date, daysAhead: number): string {
    const due = new Date(from);
    due.setDate(due.getDate() + daysAhead);
    return due.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
}
