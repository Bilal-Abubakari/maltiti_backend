import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeConfirmedDeliveryToDate1774000000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Sales" ALTER COLUMN "confirmedDelivery" TYPE timestamp USING CASE WHEN "confirmedDelivery" THEN NOW() ELSE NULL END`,
    );
    await queryRunner.query(
      `ALTER TABLE "Sales" RENAME COLUMN "confirmedDelivery" TO "confirmedDeliveryDate"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Sales" RENAME COLUMN "confirmedDeliveryDate" TO "confirmedDelivery"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Sales" ALTER COLUMN "confirmedDelivery" TYPE boolean`,
    );
  }
}
