import { Column, Entity, ManyToOne, JoinColumn, OneToOne } from "typeorm";
import { Customer } from "./Customer.entity";
import { SaleLineItem } from "../interfaces/sale-line-item.interface";
import { Checkout } from "./Checkout.entity";
import { OrderStatus } from "../enum/order-status.enum";
import { PaymentStatus } from "../enum/payment-status.enum";
import { Audit } from "./Audit.entity";

@Entity({ name: "Sales" })
export class Sale extends Audit {
  @ManyToOne(() => Customer, customer => customer.sales, { nullable: false })
  @JoinColumn({ name: "customerId" })
  public customer: Customer;

  @OneToOne(() => Checkout, checkout => checkout.sale, { nullable: true })
  public checkout: Checkout;

  @Column({
    type: "enum",
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  public orderStatus: OrderStatus;

  @Column({
    type: "enum",
    enum: PaymentStatus,
    default: PaymentStatus.INVOICE_REQUESTED,
  })
  public paymentStatus: PaymentStatus;

  @Column({ nullable: true })
  public paymentReference: string;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  public amount: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  public deliveryFee: number;

  @Column({ type: "timestamp", nullable: true, default: null })
  public confirmedDeliveryDate: Date;

  @Column({ type: "json" })
  public lineItems: SaleLineItem[];
}
