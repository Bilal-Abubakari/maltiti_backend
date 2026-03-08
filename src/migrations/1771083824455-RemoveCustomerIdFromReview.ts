import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveCustomerIdFromReview1771083824455
  implements MigrationInterface
{
  public name = "RemoveCustomerIdFromReview1771083824455";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Reviews" DROP CONSTRAINT "FK_92c625f36e4e5d23f6ab06cae43"`,
    );
    await queryRunner.query(`ALTER TABLE "Reviews" DROP COLUMN "customerId"`);
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '"2026-02-14T15:44:32.139Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '"2026-02-14T15:44:32.139Z"'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '2026-02-14 14:55:46.834'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '2026-02-14 14:55:46.834'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Reviews" ADD "customerId" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "Reviews" ADD CONSTRAINT "FK_92c625f36e4e5d23f6ab06cae43" FOREIGN KEY ("customerId") REFERENCES "Customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
