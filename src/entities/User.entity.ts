import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Exclude } from "class-transformer";
import { v4 as uuidv4 } from "uuid";
import { IsEmail } from "class-validator";
import { Role } from "../enum/role.enum";
import { Status } from "../enum/status.enum";

@Entity({ name: "users" })
export class User {
  constructor() {
    // Generate a UUID for the new user instance
    this.id = uuidv4();
  }

  @PrimaryGeneratedColumn("uuid")
  public id: string;

  @Column()
  @IsEmail()
  @Unique(["email"])
  public email: string;

  @Column()
  public name: string;

  @Column({ select: false })
  @Exclude()
  public password: string;

  @Column({ enum: Role })
  public userType: Role;

  @Column({ nullable: true })
  @Unique(["phoneNumber"])
  public phoneNumber: string;

  @Column({ nullable: true })
  public avatarUrl: string;

  @Column({ nullable: true })
  public permissions: string;

  @Column({ default: false })
  public mustChangePassword: boolean;

  @Column({ nullable: true })
  public rememberToken: string;

  @Column({ default: Status.Active })
  public status: Status;

  @Column({ nullable: true })
  public dob: Date;

  @Column({ default: new Date() })
  public createdAt: Date;

  @Column({ nullable: true })
  public emailVerifiedAt: Date;

  @Column({ default: new Date() })
  public updatedAt: Date;
}
