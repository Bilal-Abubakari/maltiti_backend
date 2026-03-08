/**
 * Type definitions for frontend notification integration
 * Copy this to your frontend TypeScript project
 */

/**
 * Notification topics matching backend enum
 */
export enum NotificationTopic {
  // Order-related
  ORDER_CREATED = "ORDER_CREATED",
  ORDER_STATUS_UPDATED = "ORDER_STATUS_UPDATED",
  ORDER_CANCELLED = "ORDER_CANCELLED",
  ORDER_DELIVERED = "ORDER_DELIVERED",

  // Payment-related
  PAYMENT_RECEIVED = "PAYMENT_RECEIVED",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  REFUND_PROCESSED = "REFUND_PROCESSED",

  // Product-related
  PRODUCT_CREATED = "PRODUCT_CREATED",
  PRODUCT_PRICE_CHANGED = "PRODUCT_PRICE_CHANGED",
  PRODUCT_OUT_OF_STOCK = "PRODUCT_OUT_OF_STOCK",
  PRODUCT_BACK_IN_STOCK = "PRODUCT_BACK_IN_STOCK",

  // User-related
  USER_ACCOUNT_CREATED = "USER_ACCOUNT_CREATED",
  USER_EMAIL_VERIFIED = "USER_EMAIL_VERIFIED",
  USER_PASSWORD_RESET = "USER_PASSWORD_RESET",
  USER_PROFILE_UPDATED = "USER_PROFILE_UPDATED",

  // Admin-related
  ADMIN_NEW_ORDER = "ADMIN_NEW_ORDER",
  ADMIN_ORDER_CANCELLED = "ADMIN_ORDER_CANCELLED",
  ADMIN_CONTACT_FORM_SUBMITTED = "ADMIN_CONTACT_FORM_SUBMITTED",
  ADMIN_LOW_STOCK_ALERT = "ADMIN_LOW_STOCK_ALERT",

  // Review-related
  REVIEW_SUBMITTED = "REVIEW_SUBMITTED",
  REVIEW_APPROVED = "REVIEW_APPROVED",
  REVIEW_REJECTED = "REVIEW_REJECTED",

  // System-related
  SYSTEM_MAINTENANCE = "SYSTEM_MAINTENANCE",
  SYSTEM_ANNOUNCEMENT = "SYSTEM_ANNOUNCEMENT",
}

/**
 * Base notification structure from database
 */
export interface Notification {
  id: string;
  userId: string;
  topic: NotificationTopic;
  title: string;
  message: string;
  link: string;
  payload: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated response from GET /notifications
 */
export interface PaginatedNotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  unreadCount: number;
}

/**
 * Unread count response from GET /notifications/unread-count
 */
export interface UnreadCountResponse {
  count: number;
}

/**
 * WebSocket notification payload (real-time)
 */
export interface NotificationPayload {
  topic: NotificationTopic;
  userId: string;
  title: string;
  message: string;
  [key: string]: unknown;
}

/**
 * API response for mark as read
 */
export interface MarkAsReadResponse {
  success: boolean;
  message: string;
}
