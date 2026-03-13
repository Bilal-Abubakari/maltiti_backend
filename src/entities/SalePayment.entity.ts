import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { Audit } from "./Audit.entity";
import { Sale } from "./Sale.entity";
import { PaymentMethod } from "../enum/payment-method.enum";
import { PaymentRecordStatus } from "../enum/payment-record-status.enum";

/**
 * Represents a single payment record for a sale.
 * A sale can have multiple payment records (partial payments).
 */
@Entity({ name: "SalePayments" })
export class SalePayment extends Audit {
  /**
   * The sale this payment belongs to.
   */
  @ManyToOne(() => Sale, sale => sale.payments, { nullable: false })
  @JoinColumn({ name: "saleId" })
  public sale: Sale;

  /**
   * The amount paid in this transaction.
   */
  @Column({ type: "decimal", precision: 10, scale: 2 })
  public amount: number;

  /**
   * The payment method used.
   */
  @Column({
    type: "enum",
    enum: PaymentMethod,
    default: PaymentMethod.OTHER,
  })
  public paymentMethod: PaymentMethod;

  /**
   * The status of this payment record.
   */
  @Column({
    type: "enum",
    enum: PaymentRecordStatus,
    default: PaymentRecordStatus.PENDING,
  })
  public status: PaymentRecordStatus;

  /**
   * Optional payment reference (e.g., Paystack transaction reference, bank transfer reference).
   */
  @Column({ nullable: true })
  public reference: string;

  /**
   * Optional note or description for this payment (e.g., "First instalment", "Final payment").
   */
  @Column({ type: "text", nullable: true })
  public note: string;

  /**
   * Whether this payment was initiated from the customer side (e.g., Paystack redirect)
   * or recorded manually by an admin.
   */
  @Column({ default: false })
  public isCustomerInitiated: boolean;
}
