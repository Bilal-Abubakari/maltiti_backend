import { MigrationInterface, QueryRunner } from "typeorm";

export class AddServiceFeeToSale1772958831457 implements MigrationInterface {
  public name = "AddServiceFeeToSale1772958831457";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Sales" ADD "serviceFee" numeric(10,2) DEFAULT NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Sales"."serviceFee" IS 'Service processing fee charged to the customer to cover payment gateway costs (e.g. Paystack 1.95%)'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "Sales" DROP COLUMN "serviceFee"`);
  }
}
