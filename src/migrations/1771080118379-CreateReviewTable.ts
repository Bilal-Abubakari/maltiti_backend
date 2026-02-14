import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateReviewTable1771080118379 implements MigrationInterface {
  public name = "CreateReviewTable1771080118379";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "Reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customerId" uuid NOT NULL, "saleId" uuid, "rating" integer NOT NULL, "title" character varying, "comment" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5ae106da7bc18dc3731e48a8a94" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '"2026-02-14T14:42:04.909Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '"2026-02-14T14:42:04.909Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Reviews" ADD CONSTRAINT "FK_92c625f36e4e5d23f6ab06cae43" FOREIGN KEY ("customerId") REFERENCES "Customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
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
      `ALTER TABLE "Reviews" DROP CONSTRAINT "FK_92c625f36e4e5d23f6ab06cae43"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '2026-02-14 11:39:17.356'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '2026-02-14 11:39:17.356'`,
    );
    await queryRunner.query(`DROP TABLE "Reviews"`);
  }
}
