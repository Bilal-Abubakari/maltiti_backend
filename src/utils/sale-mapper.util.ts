import { Sale } from "../entities/Sale.entity";
import { SaleResponseDto } from "../dto/sales/saleResponse.dto";
import { Customer } from "../entities/Customer.entity";

export function transformSaleToResponseDto(sale: Sale): SaleResponseDto {
  const transformedLineItems = sale.lineItems.map(item => {
    // Find product information from checkout carts if available
    const cartItem = sale.checkout?.carts?.find(
      cart => cart.product.id === item.productId,
    );
    const product = cartItem?.product;
    return {
      productId: item.productId,
      productName: product?.name,
      category: product?.category,
      batchAllocations: item.batchAllocations.map(alloc => ({
        batchId: alloc.batchId,
        quantity: alloc.quantity,
      })),
      requestedQuantity: item.requestedQuantity,
      customPrice: item.customPrice,
      finalPrice: item.finalPrice,
      totalAmount: item.finalPrice * item.requestedQuantity,
    };
  });
  // Transform customer information
  const customer: Omit<Customer, "sales" | "user"> = {
    id: sale.customer.id,
    name: sale.customer.name,
    phone: sale.customer.phone,
    email: sale.customer.email,
    address: sale.customer.address,
    country: sale.customer.country,
    region: sale.customer.region,
    city: sale.customer.city,
    phoneNumber: sale.customer.phoneNumber,
    extraInfo: sale.customer.extraInfo,
    createdAt: sale.customer.createdAt,
    updatedAt: sale.customer.updatedAt,
    deletedAt: sale.customer.deletedAt,
  };
  // Transform checkout information (if exists)
  let checkout = undefined;
  if (sale.checkout) {
    checkout = {
      id: sale.checkout.id,
      amount: sale.checkout.amount,
      paystackReference: sale.checkout.paystackReference,
      guestEmail: sale.checkout.guestEmail,
      createdAt: sale.checkout.createdAt,
      updatedAt: sale.checkout.updatedAt,
      deletedAt: sale.checkout.deletedAt,
    };
  }
  return {
    id: sale.id,
    customer,
    checkout,
    orderStatus: sale.orderStatus,
    paymentStatus: sale.paymentStatus,
    lineItems: transformedLineItems,
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
    deletedAt: sale.deletedAt,
  };
}
