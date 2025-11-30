import { v4 as uuid } from "uuid";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ProductCategory } from "../enum/product-category.enum";
import { ProductGrade } from "../enum/product-grade.enum";
import { PackagingSize } from "../enum/packaging-size.enum";
import { ProductStatus } from "../enum/product-status.enum";
import { Batch } from "./Batch.entity";
import { Ingredient } from "./Ingredient.entity";

@Entity({ name: "Products" })
@Index(["category", "status"])
@Index(["sku"], { unique: true })
export class Product {
  constructor() {
    this.id = uuid();
  }

  @PrimaryGeneratedColumn("uuid")
  public id: string;

  @Column({ unique: true, nullable: true })
  public sku: string;

  @Column()
  @Index()
  public name: string;

  @ManyToMany(() => Ingredient, ingredient => ingredient.products, {
    cascade: true,
  })
  @JoinTable()
  public ingredients: Ingredient[];

  @Column({ nullable: true })
  public weight: string;

  @Column({
    type: "enum",
    enum: ProductCategory,
    default: ProductCategory.OTHER,
  })
  @Index()
  public category: ProductCategory;

  @Column({ type: "text", nullable: true })
  public description: string;

  @Column({
    type: "enum",
    enum: ProductStatus,
    default: ProductStatus.ACTIVE,
  })
  @Index()
  public status: ProductStatus;

  @Column({
    type: "enum",
    enum: PackagingSize,
    nullable: true,
  })
  public size: PackagingSize;

  @Column({ type: "simple-array", nullable: true })
  public images: string[];

  @Column({ nullable: true })
  public image: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  public wholesale: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  public retail: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  public inBoxPrice: number;

  @Column({ type: "int", nullable: true })
  public quantityInBox: number;

  @Column({ default: false })
  @Index()
  public favorite: boolean;

  @Column({ type: "decimal", precision: 2, scale: 1, default: 0 })
  public rating: number;

  @Column({ type: "int", default: 0 })
  public reviews: number;

  @Column({
    type: "enum",
    enum: ProductGrade,
    nullable: true,
  })
  public grade: ProductGrade;

  @Column({ default: false })
  @Index()
  public isFeatured: boolean;

  @Column({ default: false })
  public isOrganic: boolean;

  @Column({ type: "simple-array", nullable: true })
  public certifications: string[];

  @Column({ nullable: true })
  public supplierReference: string;

  @Column({ type: "date", nullable: true })
  public producedAt: Date;

  @Column({ type: "date", nullable: true })
  public expiryDate: Date;

  @Column({ type: "int", default: 0 })
  public minOrderQuantity: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  public costPrice: number;

  @OneToMany(() => Batch, batch => batch.product)
  public batches: Batch[];

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  @Column({ nullable: true, type: "timestamp" })
  public deletedAt: Date;
}
