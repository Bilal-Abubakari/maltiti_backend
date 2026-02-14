import { v4 as uuid } from "uuid";
import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { Audit } from "./Audit.entity";
import { Sale } from "./Sale.entity";

@Entity({ name: "Reviews" })
export class Review extends Audit {
  constructor() {
    super();
    this.id = uuid();
  }

  @ManyToOne(() => Sale, { nullable: false })
  @JoinColumn({ name: "saleId" })
  public sale?: Sale;

  @Column()
  public saleId: string;

  @Column({ type: "int", nullable: false })
  public rating: number;

  @Column({ nullable: true })
  public title?: string;

  @Column({ type: "text", nullable: false })
  public comment: string;
}
