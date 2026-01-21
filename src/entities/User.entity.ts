import { Column, Entity, Unique } from "typeorm";
import { Exclude } from "class-transformer";
import { IsEmail } from "class-validator";
import { Role } from "../enum/role.enum";
import { Status } from "../enum/status.enum";
import { Audit } from "./Audit.entity";

@Entity({ name: "users" })
export class User extends Audit {
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

  @Column({ nullable: true })
  public emailVerifiedAt: Date;
}
