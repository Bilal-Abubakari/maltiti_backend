import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import axios from "axios";
import { ConfigService } from "@nestjs/config";
import { MailerService } from "@nestjs-modules/mailer";
import {
  ADMIN_EMAILS,
  ADMIN_FROM_EMAIL,
} from "../constants/admin-emails.constant";

@Injectable()
export class NotificationService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  public async sendSms(to: string, message: string): Promise<unknown> {
    try {
      return await axios.post(
        `${this.configService.get<string>("ARKESEL_BASE_URL")}/api/v2/sms/send`,
        {
          recipients: [to],
          sender: "Maltiti",
          message,
        },
        {
          headers: {
            "api-key": this.configService.get<string>("ARKESEL_SMS_API_KEY"),
          },
        },
      );
    } catch (error) {
      console.error(error, "error");
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: error.response?.data?.message || "Internal Server Error",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async sendEmail(
    body: string,
    to: string | string[],
    subject: string,
    name: string,
    url: string,
    link: string,
    action: string,
  ): Promise<unknown> {
    return await this.mailerService.sendMail({
      to,
      from: ADMIN_FROM_EMAIL,
      subject,
      template: "./welcome",
      context: {
        name,
        url,
        subject,
        body,
        link,
        action,
      },
    });
  }

  public async sendAdminOrderNotification(
    orderData: {
      orderId: string;
      orderDate: string;
      orderStatus: string;
      paymentStatus: string;
      totalAmount: string;
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      deliveryAddress?: string;
      customerType: string;
      orderItems: Array<{
        name: string;
        quantity: number;
        unitPrice: string;
        total: string;
      }>;
    },
    subject: string,
  ): Promise<unknown> {
    return await this.mailerService.sendMail({
      to: ADMIN_EMAILS,
      from: ADMIN_FROM_EMAIL,
      subject,
      template: "./admin-order-notification",
      context: {
        ...orderData,
        subject,
        url: process.env.FRONTEND_URL_ADMIN,
        action: "View Order",
      },
    });
  }

  public async sendOrderStatusUpdateEmail(
    customerEmail: string,
    customerName: string,
    orderId: string,
    orderStatus: string,
    paymentStatus?: string,
  ): Promise<unknown> {
    const subject = `Order Status Update - ${orderId}`;
    const body = `Your order status has been updated. Please find the details below.`;

    return await this.mailerService.sendMail({
      to: customerEmail,
      from: ADMIN_FROM_EMAIL,
      subject,
      template: "./order-status-update",
      context: {
        name: customerName,
        subject,
        body,
        orderStatus,
        paymentStatus,
        url: `${process.env.FRONTEND_URL}/track-order/${orderId}`,
        action: "Track Your Order",
      },
    });
  }

  public async sendAdminOrderCancellationNotification(cancellationData: {
    orderId: string;
    customerName: string;
    customerEmail: string;
    cancellationReason?: string;
    refundAmount?: number;
    penaltyAmount?: number;
    refundProcessed?: boolean;
    cancelledBy: "customer" | "admin";
  }): Promise<unknown> {
    const subject = `Order Cancelled - ${cancellationData.orderId}`;

    return await this.mailerService.sendMail({
      to: ADMIN_EMAILS,
      from: ADMIN_FROM_EMAIL,
      subject,
      template: "./admin-order-cancellation",
      context: {
        ...cancellationData,
        subject,
        url: process.env.FRONTEND_URL_ADMIN,
        action: "View Order Details",
      },
    });
  }

  /**
   * Send new product notification to customers
   */
  public async sendNewProductNotification(
    customerEmails: string[],
    productData: {
      customerName: string;
      productName: string;
      productImage?: string;
      productCategory?: string;
      productDescription?: string;
      wholesalePrice?: number;
      retailPrice?: number;
      inBoxPrice?: number;
      quantityInBox?: number;
      productFeatures?: string[];
      productId: string;
    },
  ): Promise<void> {
    const subject = `🎉 New Product Available: ${productData.productName}`;
    const frontendUrl = this.configService.get<string>("FRONTEND_URL");
    const productUrl = `${frontendUrl}/shop/${productData.productId}`;

    const emailPromises = customerEmails.map(email =>
      this.mailerService.sendMail({
        to: email,
        from: ADMIN_FROM_EMAIL,
        subject,
        template: "./new-product",
        context: {
          customerName: productData.customerName,
          productName: productData.productName,
          productImage: productData.productImage,
          productCategory: productData.productCategory,
          productDescription: productData.productDescription,
          wholesalePrice: productData.wholesalePrice?.toFixed(2),
          retailPrice: productData.retailPrice?.toFixed(2),
          inBoxPrice: productData.inBoxPrice?.toFixed(2),
          quantityInBox: productData.quantityInBox,
          productFeatures: productData.productFeatures,
          productUrl,
          currentYear: new Date().getFullYear(),
          unsubscribeUrl: `${frontendUrl}/unsubscribe`,
        },
      }),
    );

    await Promise.allSettled(emailPromises);
  }

  /**
   * Send price change notification to customers
   */
  public async sendPriceChangeNotification(
    customerEmails: string[],
    productData: {
      customerName: string;
      productName: string;
      productImage?: string;
      productCategory?: string;
      productId: string;
      quantityInBox?: number;
    },
    priceChanges: {
      wholesale?: { old: number; new: number };
      retail?: { old: number; new: number };
      inBoxPrice?: { old: number; new: number };
    },
  ): Promise<void> {
    const subject = `📢 Price Update: ${productData.productName}`;
    const frontendUrl = this.configService.get<string>("FRONTEND_URL");
    const productUrl = `${frontendUrl}/shop/${productData.productId}`;

    // Calculate price changes
    const wholesalePriceChanged = !!priceChanges.wholesale;
    const retailPriceChanged = !!priceChanges.retail;
    const inBoxPriceChanged = !!priceChanges.inBoxPrice;

    let priceDecreased = false;

    // Check if any price decreased
    if (
      wholesalePriceChanged &&
      priceChanges.wholesale!.new < priceChanges.wholesale!.old
    ) {
      priceDecreased = true;
    }
    if (
      retailPriceChanged &&
      priceChanges.retail!.new < priceChanges.retail!.old
    ) {
      priceDecreased = true;
    }
    if (
      inBoxPriceChanged &&
      priceChanges.inBoxPrice!.new < priceChanges.inBoxPrice!.old
    ) {
      priceDecreased = true;
    }

    const emailPromises = customerEmails.map(email =>
      this.mailerService.sendMail({
        to: email,
        from: ADMIN_FROM_EMAIL,
        subject,
        template: "./price-change",
        context: {
          customerName: productData.customerName,
          productName: productData.productName,
          productImage: productData.productImage,
          productCategory: productData.productCategory,
          quantityInBox: productData.quantityInBox,

          // Wholesale price
          wholesalePriceChanged,
          oldWholesalePrice: priceChanges.wholesale?.old.toFixed(2),
          newWholesalePrice: priceChanges.wholesale?.new.toFixed(2),
          wholesaleDifference: wholesalePriceChanged
            ? Math.abs(
                priceChanges.wholesale!.new - priceChanges.wholesale!.old,
              ).toFixed(2)
            : undefined,
          wholesalePercentage: wholesalePriceChanged
            ? (
                ((priceChanges.wholesale!.new - priceChanges.wholesale!.old) /
                  priceChanges.wholesale!.old) *
                100
              ).toFixed(1)
            : undefined,
          wholesalePriceIncreased:
            wholesalePriceChanged &&
            priceChanges.wholesale!.new > priceChanges.wholesale!.old,

          // Retail price
          retailPriceChanged,
          oldRetailPrice: priceChanges.retail?.old.toFixed(2),
          newRetailPrice: priceChanges.retail?.new.toFixed(2),
          retailDifference: retailPriceChanged
            ? Math.abs(
                priceChanges.retail!.new - priceChanges.retail!.old,
              ).toFixed(2)
            : undefined,
          retailPercentage: retailPriceChanged
            ? (
                ((priceChanges.retail!.new - priceChanges.retail!.old) /
                  priceChanges.retail!.old) *
                100
              ).toFixed(1)
            : undefined,
          retailPriceIncreased:
            retailPriceChanged &&
            priceChanges.retail!.new > priceChanges.retail!.old,

          // Box price
          inBoxPriceChanged,
          oldInBoxPrice: priceChanges.inBoxPrice?.old.toFixed(2),
          newInBoxPrice: priceChanges.inBoxPrice?.new.toFixed(2),
          inBoxDifference: inBoxPriceChanged
            ? Math.abs(
                priceChanges.inBoxPrice!.new - priceChanges.inBoxPrice!.old,
              ).toFixed(2)
            : undefined,
          inBoxPercentage: inBoxPriceChanged
            ? (
                ((priceChanges.inBoxPrice!.new - priceChanges.inBoxPrice!.old) /
                  priceChanges.inBoxPrice!.old) *
                100
              ).toFixed(1)
            : undefined,
          inBoxPriceIncreased:
            inBoxPriceChanged &&
            priceChanges.inBoxPrice!.new > priceChanges.inBoxPrice!.old,

          priceDecreased,
          effectiveDate: new Date().toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          productUrl,
          currentYear: new Date().getFullYear(),
          unsubscribeUrl: `${frontendUrl}/unsubscribe`,
        },
      }),
    );

    await Promise.allSettled(emailPromises);
  }
}
