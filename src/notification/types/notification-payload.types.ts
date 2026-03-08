import { NotificationTopic } from "../../enum/notification-topic.enum";

/**
 * Base notification payload interface
 */
interface BaseNotificationPayload {
  readonly topic: NotificationTopic;
  readonly userId: string;
  readonly title: string;
  readonly message: string;
}

/**
 * Order-related notification payloads
 */
export interface OrderCreatedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.ORDER_CREATED;
  readonly orderId: string;
  readonly totalAmount: number;
  readonly orderDate: string;
}

export interface OrderStatusUpdatedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.ORDER_STATUS_UPDATED;
  readonly orderId: string;
  readonly oldStatus: string;
  readonly newStatus: string;
  readonly paymentStatus?: string;
}

export interface OrderCancelledPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.ORDER_CANCELLED;
  readonly orderId: string;
  readonly cancellationReason?: string;
  readonly refundAmount?: number;
  readonly cancelledBy: "customer" | "admin";
}

export interface OrderDeliveredPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.ORDER_DELIVERED;
  readonly orderId: string;
  readonly deliveryDate: string;
}

export interface OrderDeliveryCostUpdatedPayload
  extends BaseNotificationPayload {
  readonly topic: NotificationTopic.ORDER_DELIVERY_COST_UPDATED;
  readonly orderId: string;
  readonly deliveryCost: number;
  readonly totalAmount: number;
  readonly isReadyForPayment: boolean;
}

/**
 * Payment-related notification payloads
 */
export interface PaymentReceivedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.PAYMENT_RECEIVED;
  readonly orderId: string;
  readonly amount: number;
  readonly paymentMethod: string;
  readonly transactionId?: string;
}

export interface PaymentFailedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.PAYMENT_FAILED;
  readonly orderId: string;
  readonly amount: number;
  readonly reason: string;
}

export interface RefundProcessedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.REFUND_PROCESSED;
  readonly orderId: string;
  readonly refundAmount: number;
  readonly refundMethod: string;
}

/**
 * Product-related notification payloads
 */
export interface ProductCreatedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.PRODUCT_CREATED;
  readonly productId: string;
  readonly productName: string;
  readonly productImage?: string;
  readonly category?: string;
  readonly price?: number;
}

export interface ProductPriceChangedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.PRODUCT_PRICE_CHANGED;
  readonly productId: string;
  readonly productName: string;
  readonly oldPrice: number;
  readonly newPrice: number;
  readonly priceDecreased: boolean;
}

export interface ProductOutOfStockPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.PRODUCT_OUT_OF_STOCK;
  readonly productId: string;
  readonly productName: string;
}

export interface ProductBackInStockPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.PRODUCT_BACK_IN_STOCK;
  readonly productId: string;
  readonly productName: string;
  readonly currentStock: number;
}

/**
 * User-related notification payloads
 */
export interface UserAccountCreatedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.USER_ACCOUNT_CREATED;
  readonly userName: string;
  readonly userType: string;
}

export interface UserEmailVerifiedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.USER_EMAIL_VERIFIED;
  readonly verificationDate: string;
}

export interface UserPasswordResetPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.USER_PASSWORD_RESET;
  readonly resetToken: string;
  readonly expiresAt: string;
}

export interface UserProfileUpdatedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.USER_PROFILE_UPDATED;
  readonly updatedFields: string[];
}

/**
 * Admin-related notification payloads
 */
export interface AdminNewOrderPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.ADMIN_NEW_ORDER;
  readonly orderId: string;
  readonly customerName: string;
  readonly totalAmount: number;
  readonly orderDate: string;
}

export interface AdminOrderCancelledPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.ADMIN_ORDER_CANCELLED;
  readonly orderId: string;
  readonly customerName: string;
  readonly cancellationReason?: string;
  readonly cancelledBy: "customer" | "admin";
}

export interface AdminContactFormSubmittedPayload
  extends BaseNotificationPayload {
  readonly topic: NotificationTopic.ADMIN_CONTACT_FORM_SUBMITTED;
  readonly senderName: string;
  readonly senderEmail: string;
  readonly subject: string;
}

export interface AdminLowStockAlertPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.ADMIN_LOW_STOCK_ALERT;
  readonly productId: string;
  readonly productName: string;
  readonly currentStock: number;
  readonly minimumStock: number;
}

export interface AdminPaymentReceivedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.ADMIN_PAYMENT_RECEIVED;
  readonly orderId: string;
  readonly amount: number;
  readonly customerName: string;
  readonly paymentMethod: string;
  readonly transactionId?: string;
}

export interface AdminReviewSubmittedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.ADMIN_REVIEW_SUBMITTED;
  readonly reviewId: string;
  readonly productId: string;
  readonly productName: string;
  readonly customerName: string;
  readonly rating: number;
}

/**
 * Review-related notification payloads
 */
export interface ReviewSubmittedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.REVIEW_SUBMITTED;
  readonly reviewId: string;
  readonly productId: string;
  readonly productName: string;
  readonly rating: number;
}

export interface ReviewApprovedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.REVIEW_APPROVED;
  readonly reviewId: string;
  readonly productId: string;
  readonly productName: string;
}

export interface ReviewRejectedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.REVIEW_REJECTED;
  readonly reviewId: string;
  readonly productId: string;
  readonly productName: string;
  readonly reason?: string;
}

/**
 * System-related notification payloads
 */
export interface SystemMaintenancePayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.SYSTEM_MAINTENANCE;
  readonly scheduledDate: string;
  readonly estimatedDuration: string;
}

export interface SystemAnnouncementPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.SYSTEM_ANNOUNCEMENT;
  readonly announcementType: "info" | "warning" | "success";
  readonly expiresAt?: string;
}

/**
 * Union type of all notification payloads
 */
export type NotificationPayload =
  | OrderCreatedPayload
  | OrderStatusUpdatedPayload
  | OrderCancelledPayload
  | OrderDeliveredPayload
  | OrderDeliveryCostUpdatedPayload
  | PaymentReceivedPayload
  | PaymentFailedPayload
  | RefundProcessedPayload
  | ProductCreatedPayload
  | ProductPriceChangedPayload
  | ProductOutOfStockPayload
  | ProductBackInStockPayload
  | UserAccountCreatedPayload
  | UserEmailVerifiedPayload
  | UserPasswordResetPayload
  | UserProfileUpdatedPayload
  | AdminNewOrderPayload
  | AdminOrderCancelledPayload
  | AdminContactFormSubmittedPayload
  | AdminLowStockAlertPayload
  | AdminPaymentReceivedPayload
  | AdminReviewSubmittedPayload
  | ReviewSubmittedPayload
  | ReviewApprovedPayload
  | ReviewRejectedPayload
  | SystemMaintenancePayload
  | SystemAnnouncementPayload;

/**
 * Type-safe payload mapping
 */
export type NotificationPayloadMap = {
  [NotificationTopic.ORDER_CREATED]: OrderCreatedPayload;
  [NotificationTopic.ORDER_STATUS_UPDATED]: OrderStatusUpdatedPayload;
  [NotificationTopic.ORDER_CANCELLED]: OrderCancelledPayload;
  [NotificationTopic.ORDER_DELIVERED]: OrderDeliveredPayload;
  [NotificationTopic.ORDER_DELIVERY_COST_UPDATED]: OrderDeliveryCostUpdatedPayload;
  [NotificationTopic.PAYMENT_RECEIVED]: PaymentReceivedPayload;
  [NotificationTopic.PAYMENT_FAILED]: PaymentFailedPayload;
  [NotificationTopic.REFUND_PROCESSED]: RefundProcessedPayload;
  [NotificationTopic.PRODUCT_CREATED]: ProductCreatedPayload;
  [NotificationTopic.PRODUCT_PRICE_CHANGED]: ProductPriceChangedPayload;
  [NotificationTopic.PRODUCT_OUT_OF_STOCK]: ProductOutOfStockPayload;
  [NotificationTopic.PRODUCT_BACK_IN_STOCK]: ProductBackInStockPayload;
  [NotificationTopic.USER_ACCOUNT_CREATED]: UserAccountCreatedPayload;
  [NotificationTopic.USER_EMAIL_VERIFIED]: UserEmailVerifiedPayload;
  [NotificationTopic.USER_PASSWORD_RESET]: UserPasswordResetPayload;
  [NotificationTopic.USER_PROFILE_UPDATED]: UserProfileUpdatedPayload;
  [NotificationTopic.ADMIN_NEW_ORDER]: AdminNewOrderPayload;
  [NotificationTopic.ADMIN_ORDER_CANCELLED]: AdminOrderCancelledPayload;
  [NotificationTopic.ADMIN_CONTACT_FORM_SUBMITTED]: AdminContactFormSubmittedPayload;
  [NotificationTopic.ADMIN_LOW_STOCK_ALERT]: AdminLowStockAlertPayload;
  [NotificationTopic.ADMIN_PAYMENT_RECEIVED]: AdminPaymentReceivedPayload;
  [NotificationTopic.ADMIN_REVIEW_SUBMITTED]: AdminReviewSubmittedPayload;
  [NotificationTopic.REVIEW_SUBMITTED]: ReviewSubmittedPayload;
  [NotificationTopic.REVIEW_APPROVED]: ReviewApprovedPayload;
  [NotificationTopic.REVIEW_REJECTED]: ReviewRejectedPayload;
  [NotificationTopic.SYSTEM_MAINTENANCE]: SystemMaintenancePayload;
  [NotificationTopic.SYSTEM_ANNOUNCEMENT]: SystemAnnouncementPayload;
};
