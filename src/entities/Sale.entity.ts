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
import { SaleStatus } from "../enum/sale-status.enum";
import { Customer } from "./Customer.entity";
import { SaleLineItem } from "../interfaces/sale-line-item.interface";
import { Checkout } from "./Checkout.entity";

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
    enum: SaleStatus,
    default: SaleStatus.INVOICE_REQUESTED,
  })
  public status: SaleStatus;

  @Column({ type: "json" })
  public lineItems: SaleLineItem[];

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  @Column({ nullable: true, type: "timestamp" })
  public deletedAt: Date;
}
