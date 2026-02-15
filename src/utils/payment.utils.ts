import { v4 as uuidv4 } from "uuid";

export function generatePaymentReference(saleId: string): string {
  return `SALE-${saleId}-${uuidv4()}`;
}
