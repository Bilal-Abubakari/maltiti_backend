import {
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  IsEmail,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { OrderStatus } from "../enum/order-status.enum";
import { PaymentStatus } from "../enum/payment-status.enum";

export class InitializeTransaction {
  @ApiProperty({
    description: "Delivery country",
    example: "Ghana",
    required: true,
  })
  @IsNotEmpty({ message: "Country is required" })
  @IsString({ message: "Country must be a string" })
  public country: string;

  @ApiProperty({
    description: "Delivery state/region",
    example: "Northern Region",
    required: true,
  })
  @IsNotEmpty({ message: "Region is required" })
  @IsString({ message: "Region must be a string" })
  public region: string;

  @ApiProperty({
    description: "Delivery city/town",
    example: "Tamale",
    required: true,
  })
  @IsNotEmpty({ message: "City is required" })
  @IsString({ message: "City must be a string" })
  public city: string;

  @ApiProperty({
    description: "Contact phone number for delivery (in case of issues)",
    example: "+233244123456",
    required: true,
  })
  @IsNotEmpty({ message: "Phone number is required" })
  @IsString({ message: "Phone number must be a string" })
  public phoneNumber: string;

  @ApiPropertyOptional({
    description:
      "Additional information about the order (e.g., house number, landmarks)",
    example: "House No. 123, near the market. Please call before delivery",
  })
  @IsOptional()
  public extraInfo?: string;
}

export class PlaceOrderDto {
  @ApiProperty({
    description: "Delivery country",
    example: "Ghana",
    required: true,
  })
  @IsNotEmpty({ message: "Country is required" })
  @IsString({ message: "Country must be a string" })
  public country: string;

  @ApiProperty({
    description: "Delivery state/region",
    example: "Northern Region",
    required: true,
  })
  @IsNotEmpty({ message: "Region is required" })
  @IsString({ message: "Region must be a string" })
  public region: string;

  @ApiProperty({
    description: "Delivery city/town",
    example: "Tamale",
    required: true,
  })
  @IsNotEmpty({ message: "City is required" })
  @IsString({ message: "City must be a string" })
  public city: string;

  @ApiProperty({
    description: "Contact phone number for delivery (in case of issues)",
    example: "+233244123456",
    required: true,
  })
  @IsNotEmpty({ message: "Phone number is required" })
  @IsString({ message: "Phone number must be a string" })
  public phoneNumber: string;

  @ApiPropertyOptional({
    description:
      "Additional information about the order (e.g., house number, landmarks)",
    example: "House No. 123, near the market. Please call before delivery",
  })
  @IsOptional()
  public extraInfo?: string;
}

export class UpdateSaleStatusDto {
  @ApiPropertyOptional({
    description: "Order status",
    enum: OrderStatus,
    enumName: "OrderStatus",
    example: OrderStatus.PACKAGING,
  })
  @IsOptional()
  @IsEnum(OrderStatus, { message: "Order status must be a valid order status" })
  public orderStatus?: OrderStatus;

  @ApiPropertyOptional({
    description: "Payment status",
    enum: PaymentStatus,
    enumName: "PaymentStatus",
    example: PaymentStatus.PAID,
  })
  @IsOptional()
  @IsEnum(PaymentStatus, {
    message: "Payment status must be a valid payment status",
  })
  public paymentStatus?: PaymentStatus;
}

export class UpdateDeliveryCostDto {
  @ApiProperty({
    description: "New delivery cost amount",
    example: 150.5,
    required: true,
  })
  @IsNotEmpty({ message: "Delivery cost is required" })
  @IsNumber({}, { message: "Delivery cost must be a number" })
  @Min(0, { message: "Delivery cost must be non-negative" })
  public deliveryCost: number;
}

export class GuestInitializeTransactionDto {
  @ApiProperty({
    description: "Guest email address for order updates",
    example: "guest@example.com",
    required: true,
  })
  @IsNotEmpty({ message: "Email is required" })
  @IsEmail({}, { message: "Invalid email address" })
  public email: string;

  @ApiProperty({
    description: "Session ID for guest cart",
    example: "guest-session-123",
    required: true,
  })
  @IsNotEmpty({ message: "Session ID is required" })
  @IsString({ message: "Session ID must be a string" })
  public sessionId: string;

  @ApiProperty({
    description: "Delivery country",
    example: "Ghana",
    required: true,
  })
  @IsNotEmpty({ message: "Country is required" })
  @IsString({ message: "Country must be a string" })
  public country: string;

  @ApiProperty({
    description: "Delivery state/region",
    example: "Northern Region",
    required: true,
  })
  @IsNotEmpty({ message: "Region is required" })
  @IsString({ message: "Region must be a string" })
  public region: string;

  @ApiProperty({
    description: "Delivery city/town",
    example: "Tamale",
    required: true,
  })
  @IsNotEmpty({ message: "City is required" })
  @IsString({ message: "City must be a string" })
  public city: string;

  @ApiProperty({
    description: "Contact phone number for delivery (in case of issues)",
    example: "+233244123456",
    required: true,
  })
  @IsNotEmpty({ message: "Phone number is required" })
  @IsString({ message: "Phone number must be a string" })
  public phoneNumber: string;

  @ApiPropertyOptional({
    description:
      "Additional information about the order (e.g., house number, landmarks)",
    example: "House No. 123, near the market. Please call before delivery",
  })
  @IsOptional()
  public extraInfo?: string;

  @ApiProperty({
    description: "Guest name",
    example: "John Doe",
    required: true,
  })
  @IsNotEmpty({ message: "Name is required" })
  @IsString({ message: "Name must be a string" })
  public name: string;
}

export class GuestPlaceOrderDto {
  @ApiProperty({
    description: "Guest email address for order updates",
    example: "guest@example.com",
    required: true,
  })
  @IsNotEmpty({ message: "Email is required" })
  @IsEmail({}, { message: "Invalid email address" })
  public email: string;

  @ApiProperty({
    description: "Session ID for guest cart",
    example: "guest-session-123",
    required: true,
  })
  @IsNotEmpty({ message: "Session ID is required" })
  @IsString({ message: "Session ID must be a string" })
  public sessionId: string;

  @ApiProperty({
    description: "Delivery country",
    example: "Ghana",
    required: true,
  })
  @IsNotEmpty({ message: "Country is required" })
  @IsString({ message: "Country must be a string" })
  public country: string;

  @ApiProperty({
    description: "Delivery state/region",
    example: "Northern Region",
    required: true,
  })
  @IsNotEmpty({ message: "Region is required" })
  @IsString({ message: "Region must be a string" })
  public region: string;

  @ApiProperty({
    description: "Delivery city/town",
    example: "Tamale",
    required: true,
  })
  @IsNotEmpty({ message: "City is required" })
  @IsString({ message: "City must be a string" })
  public city: string;

  @ApiProperty({
    description: "Contact phone number for delivery (in case of issues)",
    example: "+233244123456",
    required: true,
  })
  @IsNotEmpty({ message: "Phone number is required" })
  @IsString({ message: "Phone number must be a string" })
  public phoneNumber: string;

  @ApiPropertyOptional({
    description:
      "Additional information about the order (e.g., house number, landmarks)",
    example: "House No. 123, near the market. Please call before delivery",
  })
  @IsOptional()
  public extraInfo?: string;

  @ApiProperty({
    description: "Guest name",
    example: "John Doe",
    required: true,
  })
  @IsNotEmpty({ message: "Name is required" })
  @IsString({ message: "Name must be a string" })
  public name: string;
}

export class GetOrderStatusDto {
  @ApiProperty({
    description: "Email address used during checkout",
    example: "guest@example.com",
    required: true,
  })
  @IsNotEmpty({ message: "Email is required" })
  @IsEmail({}, { message: "Invalid email address" })
  public email: string;
}

export class GuestGetDeliveryCostDto {
  @ApiProperty({
    description: "Session ID for guest cart",
    example: "guest-session-123",
    required: true,
  })
  @IsNotEmpty({ message: "Session ID is required" })
  @IsString({ message: "Session ID must be a string" })
  public sessionId: string;

  @ApiProperty({
    description: "Delivery country",
    example: "Ghana",
    required: true,
  })
  @IsNotEmpty({ message: "Country is required" })
  @IsString({ message: "Country must be a string" })
  public country: string;

  @ApiProperty({
    description: "Delivery state/region",
    example: "Northern Region",
    required: true,
  })
  @IsNotEmpty({ message: "Region is required" })
  @IsString({ message: "Region must be a string" })
  public region: string;

  @ApiProperty({
    description: "Delivery city/town",
    example: "Tamale",
    required: true,
  })
  @IsNotEmpty({ message: "City is required" })
  @IsString({ message: "City must be a string" })
  public city: string;
}
