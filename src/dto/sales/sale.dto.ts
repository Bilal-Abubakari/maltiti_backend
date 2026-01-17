import { ApiProperty } from "@nestjs/swagger";
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

  @ApiProperty({ type: () => [SaleLineItemDto] })
  public lineItems: SaleLineItemDto[]; // or define SaleLineItemDto

  @ApiProperty()
  public createdAt: Date;

  @ApiProperty()
  public updatedAt: Date;

  @ApiProperty()
  public deletedAt: Date;
}
