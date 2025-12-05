import { v4 as uuid } from "uuid";
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
import { Sale } from "./Sale.entity";
import { User } from "./User.entity";

@Entity({ name: "Customers" })
export class Customer {
  constructor() {
    this.id = uuid();
  }

  @PrimaryGeneratedColumn("uuid")
  public id: string;

  @Column()
  public name: string;

  @Column({ nullable: true })
  public phone: string;

  @Column({ nullable: true })
  public email: string;

  @Column({ type: "text", nullable: true })
  public address: string;

  @OneToMany(() => Sale, sale => sale.customer)
  public sales: Sale[];

  @OneToOne(() => User, { nullable: true })
  @JoinColumn()
  public user: User;

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  @Column({ nullable: true, type: "timestamp" })
  public deletedAt: Date;
}
