import { MigrationInterface, QueryRunner } from "typeorm";

export class MovePaymentReferenceToSale1774000000001
  implements MigrationInterface
{
  public name = "MovePaymentReferenceToSale1774000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add paymentReference to Sales
    await queryRunner.query(
      `ALTER TABLE "Sales" ADD "paymentReference" character varying`,
    );

    // Drop paystackReference from Checkouts
    await queryRunner.query(
      `ALTER TABLE "Checkouts" DROP COLUMN "paystackReference"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back paystackReference to Checkouts
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ADD "paystackReference" character varying`,
    );

    // Drop paymentReference from Sales
    await queryRunner.query(
      `ALTER TABLE "Sales" DROP COLUMN "paymentReference"`,
    );
  }
}
