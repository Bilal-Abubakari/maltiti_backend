import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { User } from "./User.entity";
import { Audit } from "./Audit.entity";

@Entity({ name: "verifications" })
export class Verification extends Audit {
  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  public user: User;

  @Column({
    enum: ["email", "phone"],
  })
  public type: string;

  @Column()
  public token: string;
}
