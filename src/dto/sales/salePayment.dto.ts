import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsBoolean,
} from "class-validator";
import { PaymentMethod } from "../../enum/payment-method.enum";
import { PaymentRecordStatus } from "../../enum/payment-record-status.enum";

/**
 * DTO for recording a new payment against a sale.
 * Used by admins to record manual payments (bank transfer, cash, etc.)
 * or by the system to record customer-initiated Paystack payments.
 */
export class RecordSalePaymentDto {
  @ApiProperty({
    description: "The amount paid in this payment transaction.",
    example: 250,
    minimum: 0.01,
  })
  @IsNumber()
  @IsPositive()
  public amount: number;

  @ApiProperty({
    description: "The payment method used for this payment.",
    enum: PaymentMethod,
    example: PaymentMethod.BANK_TRANSFER,
  })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  public paymentMethod: PaymentMethod;

  @ApiProperty({
    description: "The initial status of this payment record.",
    enum: PaymentRecordStatus,
    example: PaymentRecordStatus.CONFIRMED,
    default: PaymentRecordStatus.CONFIRMED,
  })
  @IsEnum(PaymentRecordStatus)
  @IsNotEmpty()
  public status: PaymentRecordStatus;

  @ApiPropertyOptional({
    description:
      "Optional payment reference (e.g., bank transfer reference, Paystack reference).",
    example: "TRF-202603130001",
  })
  @IsOptional()
  @IsString()
  public reference?: string;

  @ApiPropertyOptional({
    description:
      "Optional note or description for this payment (e.g., 'First instalment', 'Final payment').",
    example: "First instalment payment",
  })
  @IsOptional()
  @IsString()
  public note?: string;

  @ApiPropertyOptional({
    description:
      "Whether this payment was initiated by the customer (true) or recorded manually by admin (false).",
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  public isCustomerInitiated?: boolean;
}

/**
 * DTO for updating the status of a payment record.
 */
export class UpdatePaymentRecordStatusDto {
  @ApiProperty({
    description: "The new status for this payment record.",
    enum: PaymentRecordStatus,
    example: PaymentRecordStatus.CONFIRMED,
  })
  @IsEnum(PaymentRecordStatus)
  @IsNotEmpty()
  public status: PaymentRecordStatus;

  @ApiPropertyOptional({
    description: "Optional reason or note for the status change.",
    example: "Payment confirmed via bank statement.",
  })
  @IsOptional()
  @IsString()
  public note?: string;
}
