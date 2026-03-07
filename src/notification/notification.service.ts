import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Inject,
  forwardRef,
} from "@nestjs/common";
import axios from "axios";
import { ConfigService } from "@nestjs/config";
import { MailerService } from "@nestjs-modules/mailer";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  ADMIN_EMAILS,
  ADMIN_FROM_EMAIL,
} from "../constants/admin-emails.constant";
import { Notification } from "../entities/Notification.entity";
import { NotificationTopic } from "../enum/notification-topic.enum";
import { NotificationPayloadMap } from "./types/notification-payload.types";
import { NotificationLinkBuilder } from "./notification-link.builder";
import { NotificationGateway } from "./notification.gateway";
import { PaginatedNotificationsResponseDto } from "../dto/paginated-notifications-response.dto";
import { UsersService } from "../users/users.service";
import { userOrderId } from "../utils/product.utils";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly linkBuilder: NotificationLinkBuilder,
    private readonly notificationGateway: NotificationGateway,
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
    const subject = `Order Status Update - ${orderId.split("-")?.[0]}`;
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

    // Send email
    const emailResult = await this.mailerService.sendMail({
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

    // Send in-app notification to admins
    try {
      const adminUserIds = await this.getAdminUserIds();
      if (adminUserIds.length > 0) {
        await this.sendInAppNotificationToMultipleUsers(
          NotificationTopic.ADMIN_ORDER_CANCELLED,
          adminUserIds,
          {
            topic: NotificationTopic.ADMIN_ORDER_CANCELLED,
            title: "Order Cancelled by Customer",
            message: `${cancellationData.customerName} has cancelled the order ${userOrderId(cancellationData.orderId)}`,
            orderId: cancellationData.orderId,
            customerName: cancellationData.customerName,
            cancellationReason: cancellationData.cancellationReason,
            cancelledBy: cancellationData.cancelledBy,
          },
        );
      }
    } catch (error) {
      this.logger.error("Failed to send in-app notification to admins", error);
    }

    return emailResult;
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
      priceChanges.wholesale.new < priceChanges.wholesale.old
    ) {
      priceDecreased = true;
    }
    if (
      retailPriceChanged &&
      priceChanges.retail.new < priceChanges.retail.old
    ) {
      priceDecreased = true;
    }
    if (
      inBoxPriceChanged &&
      priceChanges.inBoxPrice.new < priceChanges.inBoxPrice.old
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
                priceChanges.wholesale.new - priceChanges.wholesale.old,
              ).toFixed(2)
            : undefined,
          wholesalePercentage: wholesalePriceChanged
            ? (
                ((priceChanges.wholesale.new - priceChanges.wholesale.old) /
                  priceChanges.wholesale.old) *
                100
              ).toFixed(1)
            : undefined,
          wholesalePriceIncreased:
            wholesalePriceChanged &&
            priceChanges.wholesale.new > priceChanges.wholesale.old,

          // Retail price
          retailPriceChanged,
          oldRetailPrice: priceChanges.retail?.old.toFixed(2),
          newRetailPrice: priceChanges.retail?.new.toFixed(2),
          retailDifference: retailPriceChanged
            ? Math.abs(
                priceChanges.retail.new - priceChanges.retail.old,
              ).toFixed(2)
            : undefined,
          retailPercentage: retailPriceChanged
            ? (
                ((priceChanges.retail.new - priceChanges.retail.old) /
                  priceChanges.retail.old) *
                100
              ).toFixed(1)
            : undefined,
          retailPriceIncreased:
            retailPriceChanged &&
            priceChanges.retail.new > priceChanges.retail.old,

          // Box price
          inBoxPriceChanged,
          oldInBoxPrice: priceChanges.inBoxPrice?.old.toFixed(2),
          newInBoxPrice: priceChanges.inBoxPrice?.new.toFixed(2),
          inBoxDifference: inBoxPriceChanged
            ? Math.abs(
                priceChanges.inBoxPrice.new - priceChanges.inBoxPrice.old,
              ).toFixed(2)
            : undefined,
          inBoxPercentage: inBoxPriceChanged
            ? (
                ((priceChanges.inBoxPrice.new - priceChanges.inBoxPrice.old) /
                  priceChanges.inBoxPrice.old) *
                100
              ).toFixed(1)
            : undefined,
          inBoxPriceIncreased:
            inBoxPriceChanged &&
            priceChanges.inBoxPrice.new > priceChanges.inBoxPrice.old,

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

  /**
   * ========================================
   * IN-APP NOTIFICATION METHODS
   * ========================================
   */

  /**
   * Send typed in-app notification to a specific user
   */
  public async sendInAppNotification<T extends NotificationTopic>(
    topic: T,
    payload: NotificationPayloadMap[T],
  ): Promise<Notification> {
    try {
      // Generate link using link builder
      const link = this.linkBuilder.buildLink(
        topic,
        payload as unknown as Record<string, unknown>,
      );

      // Create notification entity
      const notification = this.notificationRepository.create({
        userId: payload.userId,
        topic,
        title: payload.title,
        message: payload.message,
        link,
        payload: payload as unknown as Record<string, unknown>,
        isRead: false,
        readAt: null,
      });

      // Persist notification
      const savedNotification =
        await this.notificationRepository.save(notification);

      // Emit real-time via WebSocket
      this.notificationGateway.emitToUser(payload.userId, payload);

      this.logger.log(
        `In-app notification sent: ${topic} to user ${payload.userId}`,
      );

      return savedNotification;
    } catch (error) {
      this.logger.error(
        `Failed to send in-app notification: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send in-app notification to multiple users
   */
  public async sendInAppNotificationToMultipleUsers<
    T extends NotificationTopic,
  >(
    topic: T,
    userIds: string[],
    basePayload: Omit<NotificationPayloadMap[T], "userId">,
  ): Promise<Notification[]> {
    try {
      const notifications: Notification[] = [];

      for (const userId of userIds) {
        const payload = { ...basePayload, userId } as NotificationPayloadMap[T];
        const notification = await this.sendInAppNotification(topic, payload);
        notifications.push(notification);
      }

      this.logger.log(
        `Sent ${notifications.length} in-app notifications: ${topic}`,
      );

      return notifications;
    } catch (error) {
      this.logger.error(
        `Failed to send bulk in-app notifications: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get admin user IDs based on ADMIN_EMAILS constant
   */
  public async getAdminUserIds(): Promise<string[]> {
    try {
      const adminUsers =
        await this.usersService.findUsersByEmails(ADMIN_EMAILS);
      return adminUsers.map(u => u.id);
    } catch (error) {
      this.logger.error("Failed to fetch admin user IDs", error.stack);
      return [];
    }
  }

  /**
   * Broadcast in-app notification to all users (use sparingly)
   */
  public async broadcastInAppNotification<T extends NotificationTopic>(
    topic: T,
    basePayload: Omit<NotificationPayloadMap[T], "userId">,
    userIds: string[],
  ): Promise<void> {
    try {
      // Create notifications for all users
      await this.sendInAppNotificationToMultipleUsers(
        topic,
        userIds,
        basePayload,
      );

      this.logger.log(`Broadcasted in-app notifications: ${topic}`);
    } catch (error) {
      this.logger.error(
        `Failed to broadcast in-app notifications: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get paginated notifications for a user (for infinite scroll)
   */
  public async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedNotificationsResponseDto> {
    try {
      const skip = (page - 1) * limit;

      const [notifications, total] =
        await this.notificationRepository.findAndCount({
          where: { userId },
          order: { createdAt: "DESC" },
          take: limit,
          skip,
        });

      const unreadCount = await this.notificationRepository.count({
        where: { userId, isRead: false },
      });

      const totalPages = Math.ceil(total / limit);
      const hasMore = page < totalPages;

      return {
        notifications,
        total,
        page,
        limit,
        totalPages,
        hasMore,
        unreadCount,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch user notifications: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  public async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id: notificationId, userId },
      });

      if (!notification) {
        throw new HttpException(
          "Notification not found or access denied",
          HttpStatus.NOT_FOUND,
        );
      }

      if (notification.isRead) {
        return notification; // Already read
      }

      notification.isRead = true;
      notification.readAt = new Date();

      return await this.notificationRepository.save(notification);
    } catch (error) {
      this.logger.error(
        `Failed to mark notification as read: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  public async markAllAsRead(userId: string): Promise<void> {
    try {
      await this.notificationRepository.update(
        { userId, isRead: false },
        { isRead: true, readAt: new Date() },
      );

      this.logger.log(`Marked all notifications as read for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to mark all notifications as read: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   */
  public async getUnreadCount(userId: string): Promise<number> {
    try {
      return await this.notificationRepository.count({
        where: { userId, isRead: false },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get unread count: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete notification (soft delete via Audit entity)
   */
  public async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id: notificationId, userId },
      });

      if (!notification) {
        throw new HttpException(
          "Notification not found or access denied",
          HttpStatus.NOT_FOUND,
        );
      }

      await this.notificationRepository.softRemove(notification);

      this.logger.log(
        `Deleted notification ${notificationId} for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete notification: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
