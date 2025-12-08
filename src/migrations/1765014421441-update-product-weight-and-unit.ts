import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateProductWeightAndUnit1765014421441
  implements MigrationInterface
{
  public name = "UpdateProductWeightAndUnit1765014421441";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "createdAt" SET DEFAULT '"2025-12-06T09:47:05.167Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updatedAt" SET DEFAULT '"2025-12-06T09:47:05.167Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "verifications" ALTER COLUMN "createdAt" SET DEFAULT '"2025-12-06T09:47:05.168Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '"2025-12-06T09:47:05.452Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '"2025-12-06T09:47:05.452Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ALTER COLUMN "createdAt" SET DEFAULT '"2025-12-06T09:47:05.454Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ALTER COLUMN "updatedAt" SET DEFAULT '"2025-12-06T09:47:05.454Z"'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ALTER COLUMN "updatedAt" SET DEFAULT '2025-12-06 09:36:59.986'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ALTER COLUMN "createdAt" SET DEFAULT '2025-12-06 09:36:59.986'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '2025-12-06 09:36:59.983'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '2025-12-06 09:36:59.983'`,
    );
    await queryRunner.query(
      `ALTER TABLE "verifications" ALTER COLUMN "createdAt" SET DEFAULT '2025-12-06 09:36:59.686'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updatedAt" SET DEFAULT '2025-12-06 09:36:59.686'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "createdAt" SET DEFAULT '2025-12-06 09:36:59.686'`,
    );
  }
}
