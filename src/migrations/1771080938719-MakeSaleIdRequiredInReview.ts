import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeSaleIdRequiredInReview1771080938719
  implements MigrationInterface
{
  public name = "MakeSaleIdRequiredInReview1771080938719";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "Reviews" ADD "deletedAt" TIMESTAMP`);
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '"2026-02-14T14:55:46.834Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '"2026-02-14T14:55:46.834Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Reviews" DROP CONSTRAINT "FK_f37dc346e78132bbe1b79076bf2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Reviews" ALTER COLUMN "saleId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "Reviews" ADD CONSTRAINT "FK_f37dc346e78132bbe1b79076bf2" FOREIGN KEY ("saleId") REFERENCES "Sales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Reviews" DROP CONSTRAINT "FK_f37dc346e78132bbe1b79076bf2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Reviews" ALTER COLUMN "saleId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "Reviews" ADD CONSTRAINT "FK_f37dc346e78132bbe1b79076bf2" FOREIGN KEY ("saleId") REFERENCES "Sales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '2026-02-14 14:42:04.909'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '2026-02-14 14:42:04.909'`,
    );
    await queryRunner.query(`ALTER TABLE "Reviews" DROP COLUMN "deletedAt"`);
  }
}
