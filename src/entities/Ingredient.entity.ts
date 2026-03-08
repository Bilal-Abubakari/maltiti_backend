import { Column, Entity, ManyToMany } from "typeorm";
import { Audit } from "./Audit.entity";
import { Product } from "./Product.entity";

@Entity({ name: "Ingredients" })
export class Ingredient extends Audit {
  @Column({ unique: true })
  public name: string;

  @ManyToMany(() => Product, product => product.ingredients)
  public products: Product[];
}
