import {
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SaleStatus } from "../enum/sale-status.enum";

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
  @ApiProperty({
    description: "Sale status",
    enum: SaleStatus,
    enumName: "SaleStatus",
    example: SaleStatus.PAID,
  })
  @IsEnum(SaleStatus, { message: "Status must be a valid sale status" })
  public status: SaleStatus;
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
