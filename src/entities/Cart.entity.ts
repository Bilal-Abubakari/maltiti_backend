import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { User } from "./User.entity";
import { Product } from "./Product.entity";
import { IsPositive } from "class-validator";
import { Checkout } from "./Checkout.entity";

@Entity({ name: "Carts" })
export class Cart {
  constructor() {
    // Generate a UUID for the new user instance
    this.id = uuidv4();
  }

  @PrimaryGeneratedColumn("uuid")
  public id: string;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "userId" })
  public user: User | null;

  @Column({ nullable: true })
  public sessionId: string | null;

  @ManyToOne(() => Product, { eager: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "productId" })
  public product: Product;

  @Column()
  @IsPositive()
  public quantity: number;

  @ManyToOne(() => Checkout, {
    lazy: true,
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "checkoutId" })
  public checkout?: Checkout | null;

  @Column({ default: new Date() })
  public createdAt: Date;

  @Column({ default: new Date() })
  public updatedAt: Date;
}
