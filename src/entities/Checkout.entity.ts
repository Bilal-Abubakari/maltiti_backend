import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { User } from "./User.entity";
import { Cart } from "./Cart.entity";
import { orderStatuses } from "../interfaces/checkout.interface";

@Entity({ name: "Checkouts" })
export class Checkout {
  constructor() {
    // Generate a UUID for the new user instance
    this.id = uuidv4();
  }

  @PrimaryGeneratedColumn("uuid")
  public id: string;

  @ManyToOne(() => User, { lazy: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  public user: User;

  @OneToMany(() => Cart, cart => cart.checkout, { lazy: true })
  @JoinColumn()
  public carts: Cart[];

  @Column({
    enum: orderStatuses,
  })
  public orderStatus: string;

  @Column()
  public amount: string;

  @Column({ enum: ["paid", "unpaid", "refunded"] })
  public paymentStatus: string;

  @Column({ default: new Date() })
  public createdAt: Date;

  @Column({ default: new Date() })
  public updatedAt: Date;

  @Column()
  public location: string;

  @Column()
  public name: string;

  @Column()
  public extraInfo: string;
}
