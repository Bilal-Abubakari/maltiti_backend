import { MigrationInterface, QueryRunner } from "typeorm";

export class LinkCustomerToUser1764515720416 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Customers" ADD COLUMN "userId" uuid NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "Customers" ADD CONSTRAINT "FK_Customer_User" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Customers" DROP CONSTRAINT "FK_Customer_User"`,
    );
    await queryRunner.query(`ALTER TABLE "Customers" DROP COLUMN "userId"`);
  }
}
