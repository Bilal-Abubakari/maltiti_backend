import { v4 as uuid } from "uuid";
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Customer } from "./Customer.entity";
import { SaleLineItem } from "../interfaces/sale-line-item.interface";
import { Checkout } from "./Checkout.entity";
import { OrderStatus } from "../enum/order-status.enum";
import { PaymentStatus } from "../enum/payment-status.enum";

@Entity({ name: "Sales" })
export class Sale {
  constructor() {
    this.id = uuid();
  }

  @PrimaryGeneratedColumn("uuid")
  public id: string;

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

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  public amount: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  public deliveryFee: number;

  @Column({ type: "boolean", nullable: true, default: null })
  public confirmedDelivery: boolean;

  @Column({ type: "json" })
  public lineItems: SaleLineItem[];

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  @Column({ nullable: true, type: "timestamp" })
  public deletedAt: Date;
}
