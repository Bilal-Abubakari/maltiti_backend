/**
 * Utility for calculating payment processing fees.
 *
 * These fees are passed on to the customer as a service processing fee,
 * allowing the platform to cover gateway charges transparently.
 */

/** Paystack charge rate: 1.95% */
const PAYSTACK_RATE = 0.0195;

/**
 * Represents a breakdown of the service processing fee.
 */
export interface ServiceFeeBreakdown {
  /** The Paystack gateway charge component */
  readonly paystackCharge: number;
  /** Total service processing fee (sum of all components) */
  readonly totalServiceFee: number;
}

/**
 * Calculates the service processing fee for a given subtotal.
 *
 * @param subtotal - The base amount before fees (product total + delivery fee), in GHS.
 * @returns A breakdown of the service fee components and the total fee, rounded to 2 decimal places.
 */
export function calculateServiceFee(subtotal: number): ServiceFeeBreakdown {
  const paystackCharge = Number.parseFloat(
    (subtotal * PAYSTACK_RATE).toFixed(2),
  );
  const totalServiceFee = paystackCharge;

  return {
    paystackCharge,
    totalServiceFee,
  };
}

/**
 * Calculates the grand total amount including the service processing fee.
 *
 * @param productTotal - Total product cost in GHS.
 * @param deliveryFee - Delivery fee in GHS (0 if not applicable).
 * @param serviceFee - Pre-calculated service processing fee in GHS.
 * @returns The grand total in GHS, rounded to 2 decimal places.
 */
export function calculateGrandTotal(
  productTotal: number,
  deliveryFee: number,
  serviceFee: number,
): number {
  return Number.parseFloat(
    (Number(productTotal) + Number(deliveryFee) + Number(serviceFee)).toFixed(
      2,
    ),
  );
}
