import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsOptional, IsString } from "class-validator";
import { SaleResponseDto } from "./saleResponse.dto";

/**
 * DTO for cancelling a sale by customer
 * Customer must provide email for verification
 */
export class CancelSaleByCustomerDto {
  @ApiProperty({
    description: "Email address associated with the order",
    example: "customer@example.com",
  })
  @IsEmail()
  public email: string;

  @ApiPropertyOptional({
    description: "Optional reason for cancellation",
    example: "Changed my mind",
  })
  @IsOptional()
  @IsString()
  public reason?: string;
}

/**
 * DTO for cancelling a sale by admin
 * Admin can choose to waive cancellation penalty
 */
export class CancelSaleByAdminDto {
  @ApiProperty({
    description: "Whether to waive the cancellation penalty (10% fee)",
    example: false,
    default: false,
  })
  @IsBoolean()
  public waivePenalty: boolean;

  @ApiPropertyOptional({
    description: "Optional reason for cancellation",
    example: "Customer requested refund",
  })
  @IsOptional()
  @IsString()
  public reason?: string;
}

/**
 * Response DTO for sale cancellation operations
 */
export class CancelSaleResponseDto {
  @ApiProperty({
    description: "Response message describing the cancellation result",
    example:
      "Order cancelled successfully. Full refund will be processed within 7-12 business days.",
  })
  public message: string;

  @ApiProperty({
    description: "The updated sale object after cancellation",
    type: SaleResponseDto,
  })
  public sale: SaleResponseDto;

  @ApiPropertyOptional({
    description: "Amount refunded to the customer (if applicable)",
    example: 150,
  })
  public refundAmount?: number;

  @ApiPropertyOptional({
    description: "Cancellation penalty amount charged (if applicable)",
    example: 15,
  })
  public penaltyAmount?: number;

  @ApiPropertyOptional({
    description: "Whether the refund was processed immediately",
    example: true,
  })
  public refundProcessed?: boolean;
}
