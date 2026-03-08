import { Column, Entity, PrimaryGeneratedColumn, Index } from "typeorm";
import { AuditActionType } from "../enum/audit-action-type.enum";
import { AuditEntityType } from "../enum/audit-entity-type.enum";
import { Role } from "../enum/role.enum";

/**
 * AuditLog entity for tracking all admin-side actions
 * Records are immutable - never to be edited or deleted
 */
@Entity({ name: "audit_logs" })
@Index(["timestamp"])
@Index(["performedByUserId"])
@Index(["actionType"])
@Index(["entityType"])
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  public id: string;

  @Column({
    type: "enum",
    enum: AuditActionType,
  })
  @Index()
  public actionType: AuditActionType;

  @Column({
    type: "enum",
    enum: AuditEntityType,
  })
  @Index()
  public entityType: AuditEntityType;

  @Column({ nullable: true })
  public entityId: string;

  @Column({ type: "text" })
  public description: string;

  @Column()
  @Index()
  public performedByUserId: string;

  @Column({ nullable: true })
  public performedByUserName: string;

  @Column({
    type: "enum",
    enum: Role,
  })
  public performedByRole: Role;

  @Column({ nullable: true })
  public ipAddress: string;

  @Column({ type: "text", nullable: true })
  public userAgent: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  @Index()
  public timestamp: Date;

  @Column({ type: "json", nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public metadata: Record<string, any>;
}
