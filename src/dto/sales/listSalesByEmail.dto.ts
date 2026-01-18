import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from "class-validator";
import { OrderStatus } from "../../enum/order-status.enum";
import { PaymentStatus } from "../../enum/payment-status.enum";

export class ListSalesByEmailDto {
  @ApiProperty({
    description: "Email address of the customer",
    example: "customer@example.com",
  })
  @IsEmail({}, { message: "Invalid email format" })
  @IsNotEmpty({ message: "Email is required" })
  public email: string;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  public orderStatus?: OrderStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  public paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  public page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  public limit?: number = 10;
}
