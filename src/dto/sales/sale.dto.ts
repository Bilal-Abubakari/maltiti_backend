import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  CheckoutDto,
  CustomerDto,
  SaleLineItemDto,
} from "../checkoutResponse.dto";
import { OrderStatus } from "../../enum/order-status.enum";
import { PaymentStatus } from "../../enum/payment-status.enum";

export class SaleDto {
  @ApiProperty()
  public id: string;

  @ApiProperty({ type: () => CustomerDto })
  public customer: CustomerDto;

  @ApiProperty({ type: () => CheckoutDto })
  public checkout: CheckoutDto;

  @ApiProperty()
  public orderStatus: OrderStatus;

  @ApiProperty()
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
    description: "Total payable amount (amount + deliveryFee)",
    example: 500,
    minimum: 0,
  })
  public total?: number;

  @ApiProperty({ type: () => [SaleLineItemDto] })
  public lineItems: SaleLineItemDto[];

  @ApiProperty()
  public createdAt: Date;

  @ApiProperty()
  public updatedAt: Date;

  @ApiProperty()
  public deletedAt: Date;
}
