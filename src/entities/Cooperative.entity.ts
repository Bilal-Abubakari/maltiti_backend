import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { v4 as uuid } from "uuid";

@Entity({ name: "Cooperatives" })
export class Cooperative {
  constructor() {
    // Generate a UUID for the new user instance
    this.id = uuid();
  }

  @PrimaryGeneratedColumn("uuid")
  public id: string;

  @Column()
  public name: string;

  @Column()
  public community: string;

  @Column()
  public registrationFee: string;

  @Column()
  public monthlyFee: string;

  @Column()
  public minimalShare: string;
}
