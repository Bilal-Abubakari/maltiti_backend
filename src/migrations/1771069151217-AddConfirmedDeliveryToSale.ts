import { MigrationInterface, QueryRunner } from "typeorm";

export class AddConfirmedDeliveryToSale1771069151217
  implements MigrationInterface
{
  public name = "AddConfirmedDeliveryToSale1771069151217";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Sales" ADD "confirmedDelivery" boolean`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '"2026-02-14T11:39:17.356Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '"2026-02-14T11:39:17.356Z"'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '2026-01-21 05:04:54.557'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '2026-01-21 05:04:54.557'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Sales" DROP COLUMN "confirmedDelivery"`,
    );
  }
}
