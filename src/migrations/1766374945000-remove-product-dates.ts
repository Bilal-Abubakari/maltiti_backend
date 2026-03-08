import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveProductDates1766374945000 implements MigrationInterface {
  public name = "RemoveProductDates1766374945000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "producedAt"`);
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "expiryDate"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "Products" ADD "expiryDate" date`);
    await queryRunner.query(`ALTER TABLE "Products" ADD "producedAt" date`);
  }
}
