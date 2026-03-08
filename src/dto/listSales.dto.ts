import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { OrderStatus } from "../enum/order-status.enum";
import { PaymentStatus } from "../enum/payment-status.enum";

export class ListSalesDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  public orderStatus?: OrderStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  public paymentStatus?: PaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public customerName?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  public page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  public limit?: number = 10;
}
