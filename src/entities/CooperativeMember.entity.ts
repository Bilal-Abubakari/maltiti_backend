import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { Cooperative } from "./Cooperative.entity";

@Entity({ name: "cooperativeMembers" })
export class CooperativeMember {
  constructor() {
    // Generate a UUID for the new user instance
    this.id = uuidv4();
  }

  @PrimaryGeneratedColumn("uuid")
  public id: string;

  @Column()
  public name: string;

  @ManyToOne(() => Cooperative, cooperative => cooperative.id)
  public cooperative: string;

  @Column()
  @Unique(["phoneNumber"])
  public phoneNumber: string;

  @Column()
  public houseNumber: string;

  @Column()
  public gpsAddress: string;

  @Column()
  public image: string;

  @Column()
  public idType: string;

  @Unique(["email"])
  @Column()
  public idNumber: string;

  @Column()
  public community: string;

  @Column()
  public district: string;

  @Column()
  public region: string;

  @Column()
  public dob: Date;

  @Column()
  public education: string;

  @Column()
  public occupation: string;

  @Column()
  public secondaryOccupation: string;

  @Column()
  public crops: string;

  @Column()
  public farmSize: number;
}
