import { MigrationInterface, QueryRunner } from "typeorm";

export class MoveCheckoutFieldsToCustomer1736500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new fields to Customer table
    await queryRunner.query(`
      ALTER TABLE "Customers" 
      ADD COLUMN IF NOT EXISTS "country" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "region" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "city" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "phoneNumber" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "extraInfo" TEXT
    `);

    // Check if the columns exist in Checkout table before migrating data
    const checkoutColumns = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Checkouts' 
      AND column_name IN ('country', 'region', 'city', 'phoneNumber', 'extraInfo', 'paymentStatus')
    `);

    // Only migrate data if the columns exist in Checkout
    if (checkoutColumns.length > 0) {
      // Migrate data from Checkout to Customer (only for columns that exist)
      const columnsList = checkoutColumns.map(
        (col: { column_name: string }) => col.column_name,
      );

      if (
        columnsList.includes("country") &&
        columnsList.includes("region") &&
        columnsList.includes("city") &&
        columnsList.includes("phoneNumber")
      ) {
        await queryRunner.query(`
          UPDATE "Customers" c
          SET 
            "country" = ch."country",
            "region" = ch."region",
            "city" = ch."city",
            "phoneNumber" = ch."phoneNumber",
            "extraInfo" = ch."extraInfo"
          FROM "Checkouts" ch
          INNER JOIN "Sales" s ON ch."saleId" = s."id"
          WHERE c."id" = s."customerId"
          AND ch."country" IS NOT NULL
          AND c."country" IS NULL
        `);
      }

      // Remove fields from Checkout table
      for (const column of columnsList) {
        await queryRunner.query(`
          ALTER TABLE "Checkouts" DROP COLUMN IF EXISTS "${column}"
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back fields to Checkout table
    await queryRunner.query(`
      ALTER TABLE "Checkouts" 
      ADD COLUMN IF NOT EXISTS "country" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "region" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "city" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "phoneNumber" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "extraInfo" TEXT,
      ADD COLUMN IF NOT EXISTS "paymentStatus" VARCHAR DEFAULT 'unpaid'
    `);

    // Migrate data back from Customer to Checkout
    await queryRunner.query(`
      UPDATE "Checkouts" ch
      SET 
        "country" = c."country",
        "region" = c."region",
        "city" = c."city",
        "phoneNumber" = c."phoneNumber",
        "extraInfo" = c."extraInfo"
      FROM "Customers" c
      INNER JOIN "Sales" s ON s."customerId" = c."id"
      WHERE ch."saleId" = s."id"
    `);

    // Remove fields from Customer table
    await queryRunner.query(`
      ALTER TABLE "Customers" 
      DROP COLUMN IF EXISTS "country",
      DROP COLUMN IF EXISTS "region",
      DROP COLUMN IF EXISTS "city",
      DROP COLUMN IF EXISTS "phoneNumber",
      DROP COLUMN IF EXISTS "extraInfo"
    `);
  }
}
