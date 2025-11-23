import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { Audit } from "./Audit.entity";
import { Product } from "./Product.entity";

@Entity({ name: "Ingredients" })
export class Ingredient extends Audit {
  @Column()
  public name: string;

  @ManyToOne(() => Product, product => product.ingredients, { nullable: false })
  @JoinColumn({ name: "productId" })
  public product: Product;
}
