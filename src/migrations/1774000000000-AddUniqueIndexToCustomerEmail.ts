import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueIndexToCustomerEmail1774000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_customer_email" ON "Customers" ("email") WHERE "email" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_customer_email"`);
  }
}
