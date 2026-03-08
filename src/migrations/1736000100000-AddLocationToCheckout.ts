import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLocationToCheckout1736000100000 implements MigrationInterface {
  public name = "AddLocationToCheckout1736000100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add country, region, city, and phoneNumber columns to Checkouts table
    await queryRunner.query(`
      ALTER TABLE "Checkouts" 
      ADD COLUMN "country" varchar(100) NOT NULL DEFAULT 'Ghana',
      ADD COLUMN "region" varchar(100) NOT NULL DEFAULT '',
      ADD COLUMN "city" varchar(100) NOT NULL DEFAULT '',
      ADD COLUMN "phoneNumber" varchar(20) NOT NULL DEFAULT '';
    `);

    // For existing checkouts, populate fields from customer/user data
    await queryRunner.query(`
      UPDATE "Checkouts" c
      SET 
        "country" = 'Ghana',
        "region" = COALESCE(
          CASE 
            WHEN cust.address LIKE '%Northern%' THEN 'Northern Region'
            WHEN cust.address LIKE '%Ashanti%' THEN 'Ashanti Region'
            WHEN cust.address LIKE '%Greater Accra%' OR cust.address LIKE '%Accra%' THEN 'Greater Accra Region'
            ELSE 'Not specified'
          END,
          'Not specified'
        ),
        "city" = COALESCE(
          CASE 
            WHEN cust.address LIKE '%Tamale%' THEN 'Tamale'
            WHEN cust.address LIKE '%Kumasi%' THEN 'Kumasi'
            WHEN cust.address LIKE '%Accra%' THEN 'Accra'
            ELSE 'Not specified'
          END,
          'Not specified'
        ),
        "phoneNumber" = COALESCE(cust.phone, u."phoneNumber", 'Not specified')
      FROM "Sales" s
      INNER JOIN "Customers" cust ON s."customerId" = cust.id
      LEFT JOIN "users" u ON cust."userId" = u.id
      WHERE c."saleId" = s.id;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove country, region, city, and phoneNumber columns
    await queryRunner.query(`
      ALTER TABLE "Checkouts" 
      DROP COLUMN IF EXISTS "country",
      DROP COLUMN IF EXISTS "region",
      DROP COLUMN IF EXISTS "city",
      DROP COLUMN IF EXISTS "phoneNumber";
    `);
  }
}
