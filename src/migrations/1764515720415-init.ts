import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1764515720415 implements MigrationInterface {
  public name = "Init1764515720415";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "Customers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "phone" character varying, "email" character varying, "address" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_c3220bb99cfda194990bc2975be" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."Sales_status_enum" AS ENUM('invoice_requested', 'pending_payment', 'paid', 'packaging', 'in_transit', 'delivered')`,
    );
    await queryRunner.query(
      `CREATE TABLE "Sales" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."Sales_status_enum" NOT NULL DEFAULT 'invoice_requested', "line_items" json NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "customerId" uuid NOT NULL, CONSTRAINT "PK_42b06288cc6e50ea7f5bca1e212" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "createdAt" SET DEFAULT '"2025-11-30T15:15:22.857Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updatedAt" SET DEFAULT '"2025-11-30T15:15:22.857Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "verifications" ALTER COLUMN "createdAt" SET DEFAULT '"2025-11-30T15:15:22.858Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '"2025-11-30T15:15:23.119Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '"2025-11-30T15:15:23.119Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ALTER COLUMN "createdAt" SET DEFAULT '"2025-11-30T15:15:23.121Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ALTER COLUMN "updatedAt" SET DEFAULT '"2025-11-30T15:15:23.121Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Sales" ADD CONSTRAINT "FK_943905f112f5609938e9f8d3635" FOREIGN KEY ("customerId") REFERENCES "Customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Sales" DROP CONSTRAINT "FK_943905f112f5609938e9f8d3635"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ALTER COLUMN "updatedAt" SET DEFAULT '2025-11-30 08:51:56.955'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ALTER COLUMN "createdAt" SET DEFAULT '2025-11-30 08:51:56.955'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '2025-11-30 08:51:56.952'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '2025-11-30 08:51:56.952'`,
    );
    await queryRunner.query(
      `ALTER TABLE "verifications" ALTER COLUMN "createdAt" SET DEFAULT '2025-11-30 08:51:56.757'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updatedAt" SET DEFAULT '2025-11-30 08:51:56.757'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "createdAt" SET DEFAULT '2025-11-30 08:51:56.757'`,
    );
    await queryRunner.query(`DROP TABLE "Sales"`);
    await queryRunner.query(`DROP TYPE "public"."Sales_status_enum"`);
    await queryRunner.query(`DROP TABLE "Customers"`);
  }
}
