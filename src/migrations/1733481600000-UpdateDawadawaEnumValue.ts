import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateDawadawaEnumValue1733481600000
  implements MigrationInterface
{
  public name = "UpdateDawadawaEnumValue1733481600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if 'Dawadawa tea' exists in the enum and handle accordingly
    // Since the enum already has 'Dawadawa', we just need to ensure
    // the enum type is clean and doesn't have 'Dawadawa tea'

    // This migration recreates the enum to ensure it matches the TypeScript enum
    await queryRunner.query(`
            -- Create a temporary column with text type
            ALTER TABLE "Products" ADD COLUMN "category_temp" text;
            
            -- Copy data to temporary column
            UPDATE "Products" SET "category_temp" = category::text;
            
            -- Drop the old column
            ALTER TABLE "Products" DROP COLUMN category;
            
            -- Drop the old enum type
            DROP TYPE "Products_category_enum";
            
            -- Create the new enum type without 'Dawadawa tea'
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
            
            -- Add the column back with the new enum type
            ALTER TABLE "Products" ADD COLUMN category "Products_category_enum" DEFAULT 'other';
            
            -- Copy data back from temporary column
            UPDATE "Products" SET category = "category_temp"::"Products_category_enum";
            
            -- Drop the temporary column
            ALTER TABLE "Products" DROP COLUMN "category_temp";
            
            -- Set NOT NULL constraint if it was there before
            ALTER TABLE "Products" ALTER COLUMN category SET NOT NULL;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the enum with 'Dawadawa tea'
    await queryRunner.query(`
            -- Create a temporary column with text type
            ALTER TABLE "Products" ADD COLUMN "category_temp" text;
            
            -- Copy data to temporary column (convert Dawadawa back to 'Dawadawa tea')
            UPDATE "Products" SET "category_temp" = 
                CASE 
                    WHEN category::text = 'Dawadawa' THEN 'Dawadawa tea'
                    ELSE category::text
                END;
            
            -- Drop the old column
            ALTER TABLE "Products" DROP COLUMN category;
            
            -- Drop the old enum type
            DROP TYPE "Products_category_enum";
            
            -- Create the enum type with 'Dawadawa tea'
            CREATE TYPE "Products_category_enum" AS ENUM (
                'Shea Butter',
                'Black Soap',
                'Cosmetics',
                'Shea Soap',
                'Powdered Soap',
                'Dawadawa tea',
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
