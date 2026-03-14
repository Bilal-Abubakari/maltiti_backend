import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentMethod } from "../../enum/payment-method.enum";
import { PaymentRecordStatus } from "../../enum/payment-record-status.enum";

/**
 * DTO representing a single payment record in responses.
 */
export class SalePaymentResponseDto {
  @ApiProperty({
    description: "Payment record ID.",
    example: "payment-uuid-123",
  })
  public id: string;

  @ApiProperty({
    description: "The ID of the sale this payment belongs to.",
    example: "sale-uuid-456",
  })
  public saleId: string;

  @ApiProperty({
    description: "The amount paid in this transaction.",
    example: 250,
  })
  public amount: number;

  @ApiProperty({
    description: "The payment method used.",
    enum: PaymentMethod,
    example: PaymentMethod.BANK_TRANSFER,
  })
  public paymentMethod: PaymentMethod;

  @ApiProperty({
    description: "The status of this payment record.",
    enum: PaymentRecordStatus,
    example: PaymentRecordStatus.CONFIRMED,
  })
  public status: PaymentRecordStatus;

  @ApiPropertyOptional({
    description:
      "Optional payment reference (e.g., bank transfer reference, Paystack reference).",
    example: "TRF-202603130001",
  })
  public reference?: string;

  @ApiPropertyOptional({
    description: "Optional note or description for this payment.",
    example: "First instalment payment",
  })
  public note?: string;

  @ApiProperty({
    description:
      "Whether this payment was initiated by the customer (true) or recorded manually by admin (false).",
    example: false,
  })
  public isCustomerInitiated: boolean;

  @ApiProperty({
    description: "Date and time this payment record was created.",
    example: "2026-03-13T10:00:00Z",
  })
  public createdAt: Date;

  @ApiProperty({
    description: "Date and time this payment record was last updated.",
    example: "2026-03-13T10:30:00Z",
  })
  public updatedAt: Date;
}

/**
 * DTO for a paginated/listed set of payment records for a sale,
 * including a summary of totals.
 */
export class SalePaymentSummaryResponseDto {
  @ApiProperty({
    description: "The sale ID these payments belong to.",
    example: "sale-uuid-456",
  })
  public saleId: string;

  @ApiProperty({
    description:
      "The grand total amount of the sale (amount + delivery + service fee).",
    example: 1000,
  })
  public saleTotal: number;

  @ApiProperty({
    description:
      "Total amount that has been confirmed/paid across all payment records.",
    example: 750,
  })
  public totalPaid: number;

  @ApiProperty({
    description:
      "Outstanding balance remaining (saleTotal - totalPaid). Zero or negative means fully paid.",
    example: 250,
  })
  public balanceRemaining: number;

  @ApiProperty({
    description: "Whether the sale is fully paid (totalPaid >= saleTotal).",
    example: false,
  })
  public isFullyPaid: boolean;

  @ApiProperty({
    description: "All payment records for this sale.",
    type: () => [SalePaymentResponseDto],
  })
  public payments: SalePaymentResponseDto[];
}
