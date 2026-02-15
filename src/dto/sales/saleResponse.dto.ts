import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { OrderStatus } from "../../enum/order-status.enum";
import { PaymentStatus } from "../../enum/payment-status.enum";

/**
 * DTO for batch allocation in sale line items
 */
export class BatchAllocationDto {
  @ApiProperty({
    description: "Batch ID",
    example: "batch-uuid-123",
  })
  public batchId: string;

  @ApiProperty({
    description: "Quantity allocated from this batch",
    example: 5,
    minimum: 1,
  })
  public quantity: number;
}

/**
 * DTO for sale line items with full product information
 */
export class SaleLineItemResponseDto {
  @ApiProperty({
    description: "Product ID",
    example: "product-uuid-123",
  })
  public productId: string;

  @ApiProperty({
    description: "Product name",
    example: "Premium Rice 50kg",
  })
  public productName?: string;

  @ApiProperty({
    description: "Product category",
    example: "Grains",
  })
  public category?: string;

  @ApiProperty({
    description: "Batch allocations for this line item",
    type: () => [BatchAllocationDto],
  })
  public batchAllocations: BatchAllocationDto[];

  @ApiProperty({
    description: "Requested quantity",
    example: 10,
    minimum: 1,
  })
  public requestedQuantity: number;

  @ApiPropertyOptional({
    description: "Custom price per unit (if different from retail price)",
    example: 45.5,
  })
  public customPrice?: number;

  @ApiProperty({
    description: "Final price per unit used for calculation",
    example: 50,
  })
  public finalPrice: number;

  @ApiProperty({
    description: "Total amount for this line item",
    example: 500,
  })
  public totalAmount?: number;
}

/**
 * DTO for customer information in sale responses
 */
export class SaleCustomerDto {
  @ApiProperty({
    description: "Customer ID",
    example: "customer-uuid-123",
  })
  public id: string;

  @ApiProperty({
    description: "Customer name",
    example: "John Doe",
  })
  public name: string;

  @ApiPropertyOptional({
    description: "Customer phone number",
    example: "+233123456789",
  })
  public phone?: string;

  @ApiPropertyOptional({
    description: "Customer email address",
    example: "john.doe@example.com",
  })
  public email?: string;

  @ApiPropertyOptional({
    description: "Customer address",
    example: "123 Main Street, Tamale",
  })
  public address?: string;

  @ApiPropertyOptional({
    description: "Customer country",
    example: "Ghana",
  })
  public country?: string;

  @ApiPropertyOptional({
    description: "Customer region",
    example: "Northern",
  })
  public region?: string;

  @ApiPropertyOptional({
    description: "Customer city",
    example: "Tamale",
  })
  public city?: string;

  @ApiPropertyOptional({
    description: "Additional phone number",
    example: "+233987654321",
  })
  public phoneNumber?: string;

  @ApiPropertyOptional({
    description: "Extra customer information",
    example: "VIP customer",
  })
  public extraInfo?: string;

  @ApiProperty({
    description: "Customer creation date",
    example: "2026-01-14T10:00:00Z",
  })
  public createdAt: Date;

  @ApiProperty({
    description: "Customer last update date",
    example: "2026-01-14T10:30:00Z",
  })
  public updatedAt: Date;

  @ApiPropertyOptional({
    description: "Customer deletion date (soft delete)",
    example: null,
  })
  public deletedAt?: Date;
}

/**
 * DTO for checkout information in sale responses
 */
export class SaleCheckoutDto {
  @ApiProperty({
    description: "Checkout ID",
    example: "checkout-uuid-123",
  })
  public id: string;

  @ApiPropertyOptional({
    description: "Payment reference",
    example: "ref_xyz123",
  })
  public paymentReference?: string;

  @ApiPropertyOptional({
    description: "Guest email (for guest checkouts)",
    example: "guest@example.com",
  })
  public guestEmail?: string;

  @ApiProperty({
    description: "Checkout creation date",
    example: "2026-01-14T10:00:00Z",
  })
  public createdAt: Date;

  @ApiProperty({
    description: "Checkout last update date",
    example: "2026-01-14T10:30:00Z",
  })
  public updatedAt: Date;

  @ApiPropertyOptional({
    description: "Checkout deletion date (soft delete)",
    example: null,
  })
  public deletedAt?: Date;
}

/**
 * Comprehensive DTO for Sale entity responses
 * Used for tracking orders and displaying sale information
 */
export class SaleResponseDto {
  @ApiProperty({
    description: "Sale/Order ID",
    example: "sale-uuid-123",
  })
  public id: string;

  @ApiProperty({
    description: "Customer information",
    type: () => SaleCustomerDto,
  })
  public customer: SaleCustomerDto;

  @ApiPropertyOptional({
    description: "Checkout information (null for admin-created orders)",
    type: () => SaleCheckoutDto,
  })
  public checkout?: SaleCheckoutDto;

  @ApiProperty({
    description: "Order status",
    enum: OrderStatus,
    example: OrderStatus.PENDING,
  })
  public orderStatus: OrderStatus;

  @ApiProperty({
    description: "Payment status",
    enum: PaymentStatus,
    example: PaymentStatus.PAID,
  })
  public paymentStatus: PaymentStatus;

  @ApiPropertyOptional({
    description: "Product total (excluding delivery)",
    example: 450,
    minimum: 0,
  })
  public amount?: number;

  @ApiPropertyOptional({
    description: "Delivery/shipping fee",
    example: 50,
    minimum: 0,
  })
  public deliveryFee?: number;

  @ApiPropertyOptional({
    description:
      "Customer confirmation of delivery (null for walk-in customers)",
    example: true,
  })
  public confirmedDelivery?: boolean;

  @ApiPropertyOptional({
    description: "Total payable amount (amount + deliveryFee)",
    example: 500,
    minimum: 0,
  })
  public total?: number;

  @ApiProperty({
    description: "Line items in the sale",
    type: () => [SaleLineItemResponseDto],
  })
  public lineItems: SaleLineItemResponseDto[];

  @ApiProperty({
    description: "Sale creation date",
    example: "2026-01-14T10:00:00Z",
  })
  public createdAt: Date;

  @ApiProperty({
    description: "Sale last update date",
    example: "2026-01-14T10:30:00Z",
  })
  public updatedAt: Date;

  @ApiPropertyOptional({
    description: "Sale deletion date (soft delete)",
    example: null,
  })
  public deletedAt?: Date;
}
