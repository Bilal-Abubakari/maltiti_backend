export interface SaleLineItem {
  productId: string;
  batchAllocations: { batchId: string; quantity: number }[];
  requestedQuantity: number;
  customPrice?: number;
  finalPrice: number;
}
