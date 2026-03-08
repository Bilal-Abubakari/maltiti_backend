import { MigrationInterface, QueryRunner } from "typeorm";

export class ReplacePackagingSizeWithUnitOfMeasurement1765013815775
  implements MigrationInterface
{
  public name = "ReplacePackagingSizeWithUnitOfMeasurement1765013815775";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Customers" DROP CONSTRAINT "FK_Customer_User"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" RENAME COLUMN "size" TO "unitOfMeasurement"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."Products_size_enum" RENAME TO "Products_unitofmeasurement_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "createdAt" SET DEFAULT '"2025-12-06T09:36:59.686Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updatedAt" SET DEFAULT '"2025-12-06T09:36:59.686Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "verifications" ALTER COLUMN "createdAt" SET DEFAULT '"2025-12-06T09:36:59.686Z"'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."Products_unitofmeasurement_enum" RENAME TO "Products_unitofmeasurement_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."Products_unitofmeasurement_enum" AS ENUM('kilogram', 'gram', 'litre', 'millilitre')`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN "unitOfMeasurement" TYPE "public"."Products_unitofmeasurement_enum" USING "unitOfMeasurement"::"text"::"public"."Products_unitofmeasurement_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."Products_unitofmeasurement_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Customers" ADD CONSTRAINT "UQ_8f2671e378010b12df958146b98" UNIQUE ("userId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '"2025-12-06T09:36:59.983Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '"2025-12-06T09:36:59.983Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ALTER COLUMN "createdAt" SET DEFAULT '"2025-12-06T09:36:59.986Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ALTER COLUMN "updatedAt" SET DEFAULT '"2025-12-06T09:36:59.986Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Customers" ADD CONSTRAINT "FK_8f2671e378010b12df958146b98" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Customers" DROP CONSTRAINT "FK_8f2671e378010b12df958146b98"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ALTER COLUMN "updatedAt" SET DEFAULT '2025-11-30 15:15:23.121'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ALTER COLUMN "createdAt" SET DEFAULT '2025-11-30 15:15:23.121'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '2025-11-30 15:15:23.119'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '2025-11-30 15:15:23.119'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Customers" DROP CONSTRAINT "UQ_8f2671e378010b12df958146b98"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."Products_unitofmeasurement_enum_old" AS ENUM('100g', '250g', '500g', '1kg', '5kg', '12kg', '25kg', '50kg', '100ml', '250ml', '500ml', '1L', 'custom')`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN "unitOfMeasurement" TYPE "public"."Products_unitofmeasurement_enum_old" USING "unitOfMeasurement"::"text"::"public"."Products_unitofmeasurement_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."Products_unitofmeasurement_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."Products_unitofmeasurement_enum_old" RENAME TO "Products_unitofmeasurement_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "verifications" ALTER COLUMN "createdAt" SET DEFAULT '2025-11-30 15:15:22.858'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updatedAt" SET DEFAULT '2025-11-30 15:15:22.857'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "createdAt" SET DEFAULT '2025-11-30 15:15:22.857'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."Products_unitofmeasurement_enum" RENAME TO "Products_size_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" RENAME COLUMN "unitOfMeasurement" TO "size"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Customers" ADD CONSTRAINT "FK_Customer_User" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
  }
}
