import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDailyReportLog1771218495024 implements MigrationInterface {
  public name = "AddDailyReportLog1771218495024";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "DailyReportLogs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "reportDate" date NOT NULL, "sent" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_45f2c252e57c065330723697254" UNIQUE ("reportDate"), CONSTRAINT "PK_5c4603936072a13b8362c7bd5a7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '"2026-02-16T05:08:44.733Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '"2026-02-16T05:08:44.733Z"'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '2026-02-14 15:44:32.139'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '2026-02-14 15:44:32.139'`,
    );
    await queryRunner.query(`DROP TABLE "DailyReportLogs"`);
  }
}
