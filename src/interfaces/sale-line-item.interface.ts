export interface SaleLineItem {
  product_id: string;
  batch_allocations: { batch_id: string; quantity: number }[];
  requested_quantity: number;
  custom_price?: number;
  final_price: number;
}
