import { v4 as uuid } from "uuid";
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Product } from "./Product.entity";

/**
 * Batch entity for product batch tracking
 * A batch belongs to a single product
 */
@Entity({ name: "Batches" })
export class Batch {
  constructor() {
    this.id = uuid();
  }

  @PrimaryGeneratedColumn("uuid")
  public id: string;

  @Column({ unique: true })
  public batchNumber: string;

  @Column({ type: "date", nullable: true })
  public productionDate: Date;

  @Column({ type: "date", nullable: true })
  public expiryDate: Date;

  @Column({ nullable: true })
  public manufacturingLocation: string;

  @Column({ nullable: true })
  public qualityCheckStatus: string;

  @Column({ nullable: true })
  public notes: string;

  @Column({ default: true })
  public isActive: boolean;

  @ManyToOne(() => Product, product => product.batches, { nullable: false })
  @JoinColumn({ name: "productId" })
  public product: Product;

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  @Column({ nullable: true, type: "timestamp" })
  public deletedAt: Date;
}
