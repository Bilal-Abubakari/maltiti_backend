import { Injectable, Logger } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { NotificationTopic } from "../enum/notification-topic.enum";
import {
  OrderCreatedPayload,
  OrderStatusUpdatedPayload,
  OrderCancelledPayload,
  PaymentReceivedPayload,
  ProductCreatedPayload,
  ProductPriceChangedPayload,
  UserAccountCreatedPayload,
  UserPasswordResetPayload,
  AdminNewOrderPayload,
  AdminOrderCancelledPayload,
  AdminContactFormSubmittedPayload,
  AdminPaymentReceivedPayload,
  AdminReviewSubmittedPayload,
  OrderDeliveredPayload,
  OrderDeliveryCostUpdatedPayload,
} from "./types/notification-payload.types";

/**
 * Integration service to trigger in-app notifications alongside emails
 * This ensures parity between email and in-app notifications
 */
@Injectable()
export class NotificationIntegrationService {
  private readonly logger = new Logger(NotificationIntegrationService.name);

  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Trigger when new order is created
   */
  public async notifyOrderCreated(
    userId: string,
    orderId: string,
    totalAmount: number,
    customerName: string,
    adminUserIds: string[],
  ): Promise<void> {
    try {
      // Customer notification
      if (userId) {
        const customerPayload: OrderCreatedPayload = {
          topic: NotificationTopic.ORDER_CREATED,
          userId,
          title: "🎉 Order Confirmed",
          message: `Your order ${orderId} has been successfully placed. Total: GHS ${totalAmount.toFixed(2)}`,
          orderId,
          totalAmount,
          orderDate: new Date().toISOString(),
        };

        await this.notificationService.sendInAppNotification(
          NotificationTopic.ORDER_CREATED,
          customerPayload,
        );
      }

      // Admin notification
      const adminPayload: AdminNewOrderPayload = {
        topic: NotificationTopic.ADMIN_NEW_ORDER,
        userId: "", // Will be set per admin
        title: "🔔 New Order Received",
        message: `New order ${orderId} from ${customerName}. Total: GHS ${totalAmount.toFixed(2)}`,
        orderId,
        customerName,
        totalAmount,
        orderDate: new Date().toISOString(),
      };

      await this.notificationService.sendInAppNotificationToMultipleUsers(
        NotificationTopic.ADMIN_NEW_ORDER,
        adminUserIds,
        adminPayload,
      );

      this.logger.log(`Order creation notifications sent for ${orderId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send order creation notifications: ${error.message}`,
      );
    }
  }

  /**
   * Trigger when order status is updated
   */
  public async notifyOrderStatusUpdated(
    userId: string,
    orderId: string,
    oldStatus: string,
    newStatus: string,
    paymentStatus?: string,
  ): Promise<void> {
    try {
      const payload: OrderStatusUpdatedPayload = {
        topic: NotificationTopic.ORDER_STATUS_UPDATED,
        userId,
        title: "📦 Order Status Updated",
        message: `Your order ${orderId} status changed from ${oldStatus} to ${newStatus}`,
        orderId,
        oldStatus,
        newStatus,
        paymentStatus,
      };

      await this.notificationService.sendInAppNotification(
        NotificationTopic.ORDER_STATUS_UPDATED,
        payload,
      );

      this.logger.log(`Order status update notification sent for ${orderId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send order status notification: ${error.message}`,
      );
    }
  }

  /**
   * Trigger when order is delivered
   */
  public async notifyOrderDelivered(
    userId: string,
    orderId: string,
  ): Promise<void> {
    try {
      const payload: OrderDeliveredPayload = {
        topic: NotificationTopic.ORDER_DELIVERED,
        userId,
        title: "✅ Order Delivered",
        message: `Your order ${orderId} has been successfully delivered!`,
        orderId,
        deliveryDate: new Date().toISOString(),
      };

      await this.notificationService.sendInAppNotification(
        NotificationTopic.ORDER_DELIVERED,
        payload,
      );

      this.logger.log(`Order delivery notification sent for ${orderId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send order delivery notification: ${error.message}`,
      );
    }
  }

  /**
   * Trigger when order is cancelled
   */
  public async notifyOrderCancelled(
    userId: string,
    orderId: string,
    cancellationReason: string | undefined,
    refundAmount: number | undefined,
    cancelledBy: "customer" | "admin",
    adminUserIds: string[],
    customerName: string,
  ): Promise<void> {
    const refundStatement = refundAmount
      ? `Refund: GHS ${refundAmount.toFixed(2)}`
      : "";
    try {
      // Customer notification
      const customerPayload: OrderCancelledPayload = {
        topic: NotificationTopic.ORDER_CANCELLED,
        userId,
        title: "❌ Order Cancelled",
        message: `Your order ${orderId} has been cancelled. ${refundStatement}`,
        orderId,
        cancellationReason,
        refundAmount,
        cancelledBy,
      };

      await this.notificationService.sendInAppNotification(
        NotificationTopic.ORDER_CANCELLED,
        customerPayload,
      );

      // Admin notification
      const adminPayload: AdminOrderCancelledPayload = {
        topic: NotificationTopic.ADMIN_ORDER_CANCELLED,
        userId: "",
        title: "⚠️ Order Cancelled",
        message: `Order ${orderId} from ${customerName} was cancelled by ${cancelledBy}`,
        orderId,
        customerName,
        cancellationReason,
        cancelledBy,
      };

      await this.notificationService.sendInAppNotificationToMultipleUsers(
        NotificationTopic.ADMIN_ORDER_CANCELLED,
        adminUserIds,
        adminPayload,
      );

      this.logger.log(`Order cancellation notifications sent for ${orderId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send order cancellation notifications: ${error.message}`,
      );
    }
  }

  /**
   * Trigger when payment is received
   */
  public async notifyPaymentReceived(
    userId: string,
    orderId: string,
    amount: number,
    paymentMethod: string,
    customerName: string,
    adminUserIds: string[],
    transactionId?: string,
  ): Promise<void> {
    try {
      // Customer notification
      if (userId) {
        const payload: PaymentReceivedPayload = {
          topic: NotificationTopic.PAYMENT_RECEIVED,
          userId,
          title: "💰 Payment Received",
          message: `Your payment of GHS ${amount.toFixed(2)} for order ${orderId} has been received`,
          orderId,
          amount,
          paymentMethod,
          transactionId,
        };

        await this.notificationService.sendInAppNotification(
          NotificationTopic.PAYMENT_RECEIVED,
          payload,
        );
      }

      // Admin notification
      const adminPayload: AdminPaymentReceivedPayload = {
        topic: NotificationTopic.ADMIN_PAYMENT_RECEIVED,
        userId: "",
        title: "💰 Payment Confirmed",
        message: `Payment of GHS ${amount.toFixed(2)} received for order ${orderId} (Customer: ${customerName})`,
        orderId,
        amount,
        customerName,
        paymentMethod,
        transactionId,
      };

      await this.notificationService.sendInAppNotificationToMultipleUsers(
        NotificationTopic.ADMIN_PAYMENT_RECEIVED,
        adminUserIds,
        adminPayload,
      );

      this.logger.log(`Payment received notifications sent for ${orderId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send payment notification: ${error.message}`,
      );
    }
  }

  /**
   * Trigger when a new review is submitted
   */
  public async notifyReviewSubmitted(
    userId: string,
    reviewId: string,
    productId: string,
    productName: string,
    customerName: string,
    rating: number,
    adminUserIds: string[],
  ): Promise<void> {
    try {
      // Admin notification
      const adminPayload: AdminReviewSubmittedPayload = {
        topic: NotificationTopic.ADMIN_REVIEW_SUBMITTED,
        userId: "",
        title: "⭐ New Review Submitted",
        message: `${customerName} left a ${rating}-star review for ${productName}`,
        reviewId,
        productId,
        productName,
        customerName,
        rating,
      };

      await this.notificationService.sendInAppNotificationToMultipleUsers(
        NotificationTopic.ADMIN_REVIEW_SUBMITTED,
        adminUserIds,
        adminPayload,
      );

      this.logger.log(
        `Review submission notification sent for review ${reviewId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send review submission notification: ${error.message}`,
      );
    }
  }

  /**
   * Trigger when new product is created
   */
  public async notifyProductCreated(
    userIds: string[],
    productId: string,
    productName: string,
    productImage: string | undefined,
    category: string | undefined,
    price: number | undefined,
  ): Promise<void> {
    try {
      const payload: Omit<ProductCreatedPayload, "userId"> = {
        topic: NotificationTopic.PRODUCT_CREATED,
        title: "🎉 New Product Available",
        message: `Check out our new product: ${productName}!`,
        productId,
        productName,
        productImage,
        category,
        price,
      };

      await this.notificationService.sendInAppNotificationToMultipleUsers(
        NotificationTopic.PRODUCT_CREATED,
        userIds,
        payload,
      );

      this.logger.log(`Product creation notifications sent for ${productId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send product creation notifications: ${error.message}`,
      );
    }
  }

  /**
   * Trigger when product price changes
   */
  public async notifyProductPriceChanged(
    userIds: string[],
    productId: string,
    productName: string,
    oldPrice: number,
    newPrice: number,
  ): Promise<void> {
    try {
      const priceDecreased = newPrice < oldPrice;
      const payload: Omit<ProductPriceChangedPayload, "userId"> = {
        topic: NotificationTopic.PRODUCT_PRICE_CHANGED,
        title: priceDecreased ? "📢 Price Drop Alert!" : "📢 Price Update",
        message: `${productName}: Price changed from GHS ${oldPrice.toFixed(2)} to GHS ${newPrice.toFixed(2)}`,
        productId,
        productName,
        oldPrice,
        newPrice,
        priceDecreased,
      };

      await this.notificationService.sendInAppNotificationToMultipleUsers(
        NotificationTopic.PRODUCT_PRICE_CHANGED,
        userIds,
        payload,
      );

      this.logger.log(`Price change notifications sent for ${productId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send price change notifications: ${error.message}`,
      );
    }
  }

  /**
   * Trigger when user account is created
   */
  public async notifyUserAccountCreated(
    userId: string,
    userName: string,
    userType: string,
  ): Promise<void> {
    try {
      const payload: UserAccountCreatedPayload = {
        topic: NotificationTopic.USER_ACCOUNT_CREATED,
        userId,
        title: "👋 Welcome to Maltiti A. Enterprise",
        message: `Welcome ${userName}! Your account has been successfully created.`,
        userName,
        userType,
      };

      await this.notificationService.sendInAppNotification(
        NotificationTopic.USER_ACCOUNT_CREATED,
        payload,
      );

      this.logger.log(`Account creation notification sent for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send account creation notification: ${error.message}`,
      );
    }
  }

  /**
   * Trigger when order delivery cost is updated
   */
  public async notifyOrderDeliveryCostUpdated(
    userId: string,
    orderId: string,
    deliveryCost: number,
    totalAmount: number,
    isReadyForPayment: boolean,
  ): Promise<void> {
    try {
      const payload: OrderDeliveryCostUpdatedPayload = {
        topic: NotificationTopic.ORDER_DELIVERY_COST_UPDATED,
        userId,
        title: isReadyForPayment
          ? "🚚 Delivery Cost Calculated"
          : "🚚 Delivery Cost Updated",
        message: isReadyForPayment
          ? `Delivery cost for ${orderId} is GHS ${deliveryCost.toFixed(2)}. Total: GHS ${totalAmount.toFixed(2)}. You can now proceed to payment.`
          : `Delivery cost for ${orderId} has been updated to GHS ${deliveryCost.toFixed(2)}.`,
        orderId,
        deliveryCost,
        totalAmount,
        isReadyForPayment,
      };

      await this.notificationService.sendInAppNotification(
        NotificationTopic.ORDER_DELIVERY_COST_UPDATED,
        payload,
      );

      this.logger.log(`Order delivery cost notification sent for ${orderId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send delivery cost notification: ${error.message}`,
      );
    }
  }

  /**
   * Trigger when password reset is requested
   */
  public async notifyPasswordResetRequested(
    userId: string,
    resetToken: string,
    expiresAt: string,
  ): Promise<void> {
    try {
      const payload: UserPasswordResetPayload = {
        topic: NotificationTopic.USER_PASSWORD_RESET,
        userId,
        title: "🔐 Password Reset Requested",
        message:
          "You requested a password reset. Click to reset your password.",
        resetToken,
        expiresAt,
      };

      await this.notificationService.sendInAppNotification(
        NotificationTopic.USER_PASSWORD_RESET,
        payload,
      );

      this.logger.log(`Password reset notification sent for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset notification: ${error.message}`,
      );
    }
  }

  /**
   * Trigger when contact form is submitted
   */
  public async notifyContactFormSubmitted(
    adminUserIds: string[],
    senderName: string,
    senderEmail: string,
    subject: string,
  ): Promise<void> {
    try {
      const payload: Omit<AdminContactFormSubmittedPayload, "userId"> = {
        topic: NotificationTopic.ADMIN_CONTACT_FORM_SUBMITTED,
        title: "📧 New Contact Form Submission",
        message: `${senderName} (${senderEmail}) submitted a contact form`,
        senderName,
        senderEmail,
        subject,
      };

      await this.notificationService.sendInAppNotificationToMultipleUsers(
        NotificationTopic.ADMIN_CONTACT_FORM_SUBMITTED,
        adminUserIds,
        payload,
      );

      this.logger.log(`Contact form submission notifications sent to admins`);
    } catch (error) {
      this.logger.error(
        `Failed to send contact form notifications: ${error.message}`,
      );
    }
  }
}
