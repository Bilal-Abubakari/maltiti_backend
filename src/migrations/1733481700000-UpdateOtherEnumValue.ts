import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateOtherEnumValue1733481700000 implements MigrationInterface {
  public name = "UpdateOtherEnumValue1733481700000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // This migration recreates the enum to update 'other' to 'Other'
    await queryRunner.query(`
            -- Create a temporary column with text type
            ALTER TABLE "Products" ADD COLUMN "category_temp" text;
            
            -- Copy data to temporary column, converting 'other' to 'Other'
            UPDATE "Products" SET "category_temp" = 
                CASE 
                    WHEN category::text = 'other' THEN 'Other'
                    ELSE category::text
                END;
            
            -- Drop the old column
            ALTER TABLE "Products" DROP COLUMN category;
            
            -- Drop the old enum type
            DROP TYPE "Products_category_enum";
            
            -- Create the new enum type with 'Other' instead of 'other'
            CREATE TYPE "Products_category_enum" AS ENUM (
                'Shea Butter',
                'Black Soap',
                'Cosmetics',
                'Shea Soap',
                'Powdered Soap',
                'Dawadawa',
                'Essential Oils',
                'Hair Oil',
                'Grains',
                'Legumes',
                'Other'
            );
            
            -- Add the column back with the new enum type
            ALTER TABLE "Products" ADD COLUMN category "Products_category_enum" DEFAULT 'Other';
            
            -- Copy data back from temporary column
            UPDATE "Products" SET category = "category_temp"::"Products_category_enum";
            
            -- Drop the temporary column
            ALTER TABLE "Products" DROP COLUMN "category_temp";
            
            -- Set NOT NULL constraint
            ALTER TABLE "Products" ALTER COLUMN category SET NOT NULL;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the enum with 'other' (lowercase)
    await queryRunner.query(`
            -- Create a temporary column with text type
            ALTER TABLE "Products" ADD COLUMN "category_temp" text;
            
            -- Copy data to temporary column, converting 'Other' to 'other'
            UPDATE "Products" SET "category_temp" = 
                CASE 
                    WHEN category::text = 'Other' THEN 'other'
                    ELSE category::text
                END;
            
            -- Drop the old column
            ALTER TABLE "Products" DROP COLUMN category;
            
            -- Drop the old enum type
            DROP TYPE "Products_category_enum";
            
            -- Create the enum type with 'other' (lowercase)
            CREATE TYPE "Products_category_enum" AS ENUM (
                'Shea Butter',
                'Black Soap',
                'Cosmetics',
                'Shea Soap',
                'Powdered Soap',
                'Dawadawa',
                'Essential Oils',
                'Hair Oil',
                'Grains',
                'Legumes',
                'other'
            );
            
            -- Add the column back with the enum type
            ALTER TABLE "Products" ADD COLUMN category "Products_category_enum" DEFAULT 'other';
            
            -- Copy data back from temporary column
            UPDATE "Products" SET category = "category_temp"::"Products_category_enum";
            
            -- Drop the temporary column
            ALTER TABLE "Products" DROP COLUMN "category_temp";
            
            -- Set NOT NULL constraint
            ALTER TABLE "Products" ALTER COLUMN category SET NOT NULL;
        `);
  }
}
