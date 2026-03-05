import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotificationTopic } from "../enum/notification-topic.enum";

/**
 * Centralized notification link builder
 * All navigation logic lives here - frontend must NOT construct routes manually
 */
@Injectable()
export class NotificationLinkBuilder {
  private readonly frontendUrl: string;
  private readonly adminFrontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.frontendUrl = this.configService.get<string>("FRONTEND_URL") || "";
    this.adminFrontendUrl =
      this.configService.get<string>("FRONTEND_URL_ADMIN") || "";
  }

  /**
   * Generate navigation link based on topic and payload
   */
  public buildLink(
    topic: NotificationTopic,
    payload: Record<string, unknown>,
  ): string {
    switch (topic) {
      // Order-related links
      case NotificationTopic.ORDER_CREATED:
      case NotificationTopic.ORDER_STATUS_UPDATED:
      case NotificationTopic.ORDER_DELIVERED:
      case NotificationTopic.ORDER_CANCELLED:
      case NotificationTopic.PAYMENT_RECEIVED:
      case NotificationTopic.PAYMENT_FAILED:
      case NotificationTopic.REFUND_PROCESSED:
        return `${this.frontendUrl}/track-order/${payload.orderId as string}`;

      // Product-related links
      case NotificationTopic.PRODUCT_CREATED:
      case NotificationTopic.PRODUCT_PRICE_CHANGED:
      case NotificationTopic.PRODUCT_BACK_IN_STOCK:
        return `${this.frontendUrl}/shop/${payload.productId as string}`;

      case NotificationTopic.PRODUCT_OUT_OF_STOCK:
        return `${this.frontendUrl}/shop`;

      // User-related links
      case NotificationTopic.USER_ACCOUNT_CREATED:
        return `${this.frontendUrl}/profile`;

      case NotificationTopic.USER_EMAIL_VERIFIED:
        return `${this.frontendUrl}/profile`;

      case NotificationTopic.USER_PASSWORD_RESET:
        return `${this.frontendUrl}/auth/reset-password/${payload.resetToken as string}`;

      case NotificationTopic.USER_PROFILE_UPDATED:
        return `${this.frontendUrl}/profile`;

      // Admin-related links
      case NotificationTopic.ADMIN_NEW_ORDER:
      case NotificationTopic.ADMIN_ORDER_CANCELLED:
        return `${this.adminFrontendUrl}/sales/${payload.orderId as string}`;

      case NotificationTopic.ADMIN_CONTACT_FORM_SUBMITTED:
        return `${this.adminFrontendUrl}/contacts`;

      case NotificationTopic.ADMIN_LOW_STOCK_ALERT:
        return `${this.adminFrontendUrl}/products/${payload.productId as string}`;

      // Review-related links
      case NotificationTopic.REVIEW_SUBMITTED:
        return `${this.adminFrontendUrl}/reviews/${payload.reviewId as string}`;

      case NotificationTopic.REVIEW_APPROVED:
      case NotificationTopic.REVIEW_REJECTED:
        return `${this.frontendUrl}/shop/${payload.productId as string}`;

      // System-related links
      case NotificationTopic.SYSTEM_MAINTENANCE:
      case NotificationTopic.SYSTEM_ANNOUNCEMENT:
        return `${this.frontendUrl}/announcements`;

      default:
        return this.frontendUrl;
    }
  }

  /**
   * Check if link is for admin panel
   */
  public isAdminLink(topic: NotificationTopic): boolean {
    const adminTopics: NotificationTopic[] = [
      NotificationTopic.ADMIN_NEW_ORDER,
      NotificationTopic.ADMIN_ORDER_CANCELLED,
      NotificationTopic.ADMIN_CONTACT_FORM_SUBMITTED,
      NotificationTopic.ADMIN_LOW_STOCK_ALERT,
      NotificationTopic.REVIEW_SUBMITTED,
    ];

    return adminTopics.includes(topic);
  }
}
