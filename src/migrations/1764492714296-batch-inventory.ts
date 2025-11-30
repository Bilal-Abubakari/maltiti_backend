import { MigrationInterface, QueryRunner } from "typeorm";

export class BatchInventory1764492714296 implements MigrationInterface {
  public name = "BatchInventory1764492714296";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Products" DROP COLUMN "stockQuantity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Batches" ADD "quantity" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "createdAt" SET DEFAULT '"2025-11-30T08:51:56.757Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updatedAt" SET DEFAULT '"2025-11-30T08:51:56.757Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "verifications" ALTER COLUMN "createdAt" SET DEFAULT '"2025-11-30T08:51:56.757Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '"2025-11-30T08:51:56.952Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '"2025-11-30T08:51:56.952Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ALTER COLUMN "createdAt" SET DEFAULT '"2025-11-30T08:51:56.955Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ALTER COLUMN "updatedAt" SET DEFAULT '"2025-11-30T08:51:56.955Z"'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ALTER COLUMN "updatedAt" SET DEFAULT '2025-11-23 08:40:09.288'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ALTER COLUMN "createdAt" SET DEFAULT '2025-11-23 08:40:09.288'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '2025-11-23 08:40:09.288'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '2025-11-23 08:40:09.288'`,
    );
    await queryRunner.query(
      `ALTER TABLE "verifications" ALTER COLUMN "createdAt" SET DEFAULT '2025-11-23 08:40:08.782'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updatedAt" SET DEFAULT '2025-11-23 08:40:08.415'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "createdAt" SET DEFAULT '2025-11-23 08:40:08.415'`,
    );
    await queryRunner.query(`ALTER TABLE "Batches" DROP COLUMN "quantity"`);
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "stockQuantity" integer NOT NULL DEFAULT '0'`,
    );
  }
}
