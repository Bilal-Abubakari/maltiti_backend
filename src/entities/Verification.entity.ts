import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { User } from "./User.entity";

@Entity({ name: "verifications" })
export class Verification {
  constructor() {
    // Generate a UUID for the new user instance
    this.id = uuidv4();
  }

  @PrimaryGeneratedColumn("uuid")
  public id: string;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  public user: User;

  @Column({
    enum: ["email", "phone"],
  })
  public type: string;

  @Column()
  public token: string;

  @Column({ default: new Date() })
  public createdAt: Date;
}
