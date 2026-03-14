/**
 * Enum representing the status of an individual payment record.
 */
export enum PaymentRecordStatus {
  /** Payment has been initiated but not yet confirmed */
  PENDING = "pending",
  /** Payment has been confirmed / verified */
  CONFIRMED = "confirmed",
  /** Payment was rejected or failed */
  FAILED = "failed",
  /** Payment was refunded */
  REFUNDED = "refunded",
}
