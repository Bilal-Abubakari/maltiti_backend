import { Column, Entity } from "typeorm";
import { Audit } from "./Audit.entity";

@Entity({ name: "DailyReportLogs" })
export class DailyReportLog extends Audit {
  @Column({ type: "date", unique: true })
  public reportDate: Date;

  @Column({ type: "boolean", default: false })
  public sent: boolean;
}
