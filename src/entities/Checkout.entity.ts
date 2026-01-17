import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { Cart } from "./Cart.entity";
import { Sale } from "./Sale.entity";

@Entity({ name: "Checkouts" })
export class Checkout {
  constructor() {
    // Generate a UUID for the new checkout instance
    this.id = uuidv4();
  }

  @PrimaryGeneratedColumn("uuid")
  public id: string;

  @OneToOne(() => Sale, sale => sale.checkout, { nullable: false })
  @JoinColumn({ name: "saleId" })
  public sale: Sale;

  @OneToMany(() => Cart, cart => cart.checkout)
  public carts: Cart[];

  @Column({ type: "decimal", precision: 10, scale: 2 })
  public amount: number;

  @Column({ nullable: true })
  public paystackReference: string;

  @Column({ nullable: true })
  public guestEmail: string | null;

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  @Column({ nullable: true, type: "timestamp" })
  public deletedAt: Date;
}
