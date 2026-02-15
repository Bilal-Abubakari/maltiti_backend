import { Column, Entity, JoinColumn, OneToMany, OneToOne } from "typeorm";
import { Sale } from "./Sale.entity";
import { Audit } from "./Audit.entity";
import { Cart } from "./Cart.entity";

@Entity({ name: "Checkouts" })
export class Checkout extends Audit {
  @OneToOne(() => Sale, sale => sale.checkout, { nullable: false })
  @JoinColumn({ name: "saleId" })
  public sale: Sale;

  @OneToMany(() => Cart, cart => cart.checkout)
  public carts: Cart[];

  @Column({ nullable: true })
  public guestEmail: string | null;
}
