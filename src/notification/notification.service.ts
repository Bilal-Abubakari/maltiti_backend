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
      console.log(error, "error");
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
}
