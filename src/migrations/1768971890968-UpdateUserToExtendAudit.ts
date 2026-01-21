import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateUserToExtendAudit1768971890968
  implements MigrationInterface
{
  public name = "UpdateUserToExtendAudit1768971890968";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Checkouts" DROP CONSTRAINT "FK_Checkouts_Sale"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_AUDIT_TIMESTAMP"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_AUDIT_USER"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_AUDIT_ACTION_TYPE"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_AUDIT_ENTITY_TYPE"`);
    await queryRunner.query(`ALTER TABLE "Checkouts" DROP COLUMN "location"`);
    await queryRunner.query(`ALTER TABLE "users" ADD "deletedAt" TIMESTAMP`);
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "createdAt" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updatedAt" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '"2026-01-21T05:04:54.557Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '"2026-01-21T05:04:54.557Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "performedByRole" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "timestamp" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f780eacad4a3c31f7a38f0b0b4" ON "Products" ("category") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3140410e6247ccc3a8f24e8d0d" ON "Products" ("category", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9d63f7dd74d7df762563b41bd0" ON "audit_logs" ("actionType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_01993ae76b293d3b866cc3a125" ON "audit_logs" ("entityType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1a3e39f67189527c39099fe322" ON "audit_logs" ("performedByUserId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_88dcc148d532384790ab874c3d" ON "audit_logs" ("timestamp") `,
    );
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ADD CONSTRAINT "FK_a7e38427baabe6104e8a837cf85" FOREIGN KEY ("saleId") REFERENCES "Sales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Checkouts" DROP CONSTRAINT "FK_a7e38427baabe6104e8a837cf85"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_88dcc148d532384790ab874c3d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1a3e39f67189527c39099fe322"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9d63f7dd74d7df762563b41bd0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_01993ae76b293d3b866cc3a125"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_88dcc148d532384790ab874c3d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1a3e39f67189527c39099fe322"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_01993ae76b293d3b866cc3a125"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9d63f7dd74d7df762563b41bd0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3140410e6247ccc3a8f24e8d0d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f780eacad4a3c31f7a38f0b0b4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "timestamp" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "performedByRole" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '2025-12-06 09:47:05.452'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '2025-12-06 09:47:05.452'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updatedAt" SET DEFAULT '2025-12-06 09:47:05.167'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "createdAt" SET DEFAULT '2025-12-06 09:47:05.167'`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deletedAt"`);
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ADD "location" text NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_AUDIT_ENTITY_TYPE" ON "audit_logs" ("entityType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_AUDIT_ACTION_TYPE" ON "audit_logs" ("actionType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_AUDIT_USER" ON "audit_logs" ("performedByUserId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_AUDIT_TIMESTAMP" ON "audit_logs" ("timestamp") `,
    );
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ADD CONSTRAINT "FK_Checkouts_Sale" FOREIGN KEY ("saleId") REFERENCES "Sales"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
