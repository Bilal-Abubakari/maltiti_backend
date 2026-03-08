/**
 * Enum for audit entity types
 */
export enum AuditEntityType {
  // User Management
  USER = "USER",

  // Products & Inventory
  PRODUCT = "PRODUCT",
  BATCH = "BATCH",
  INVENTORY = "INVENTORY",

  // Sales & Orders
  SALE = "SALE",
  CHECKOUT = "CHECKOUT",
  CART = "CART",

  // Cooperative Management
  COOPERATIVE = "COOPERATIVE",
  COOPERATIVE_MEMBER = "COOPERATIVE_MEMBER",

  // Customer Management
  CUSTOMER = "CUSTOMER",

  // Reports
  REPORT = "REPORT",

  // System
  SYSTEM = "SYSTEM",
  CONFIGURATION = "CONFIGURATION",

  // Authentication
  AUTHENTICATION = "AUTHENTICATION",
}
