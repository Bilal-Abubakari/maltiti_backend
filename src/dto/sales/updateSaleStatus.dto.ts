import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { OrderStatus } from "../../enum/order-status.enum";
import { PaymentStatus } from "../../enum/payment-status.enum";

export class UpdateSaleStatusDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  public orderStatus?: OrderStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  public paymentStatus?: PaymentStatus;
}
