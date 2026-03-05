import { Column, Entity, Index } from "typeorm";
import { Audit } from "./Audit.entity";
import { NotificationTopic } from "../enum/notification-topic.enum";

@Entity({ name: "notifications" })
export class Notification extends Audit {
  @Column()
  @Index("IDX_notification_user_id")
  public userId: string;

  @Column({ type: "enum", enum: NotificationTopic })
  @Index("IDX_notification_topic")
  public topic: NotificationTopic;

  @Column()
  public title: string;

  @Column({ type: "text" })
  public message: string;

  @Column()
  public link: string;

  @Column({ type: "jsonb" })
  public payload: Record<string, unknown>;

  @Column({ default: false })
  @Index("IDX_notification_read")
  public isRead: boolean;

  @Column({ type: "timestamp", nullable: true })
  public readAt: Date | null;
}
