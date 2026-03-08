import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateProductCategoryEnum1732740000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Alter the column to text to allow updates
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN category TYPE text`,
    );

    // Update existing data to match new enum values
    await queryRunner.query(
      `UPDATE "Products" SET category = 'Shea Butter' WHERE category = 'shea_butter'`,
    );
    await queryRunner.query(
      `UPDATE "Products" SET category = 'Black Soap' WHERE category = 'black_soap'`,
    );
    await queryRunner.query(
      `UPDATE "Products" SET category = 'Cosmetics' WHERE category = 'cosmetics'`,
    );
    await queryRunner.query(
      `UPDATE "Products" SET category = 'Shea Soap' WHERE category = 'shea_soap'`,
    );
    await queryRunner.query(
      `UPDATE "Products" SET category = 'Powdered Soap' WHERE category = 'powdered_soap'`,
    );
    await queryRunner.query(
      `UPDATE "Products" SET category = 'Dawadawa Tea' WHERE category = 'dawadawa_tea'`,
    );
    await queryRunner.query(
      `UPDATE "Products" SET category = 'Essential Oils' WHERE category = 'essential_oils'`,
    );
    await queryRunner.query(
      `UPDATE "Products" SET category = 'Hair Oil' WHERE category = 'hair_oil'`,
    );
    await queryRunner.query(
      `UPDATE "Products" SET category = 'Grains' WHERE category = 'grains'`,
    );
    await queryRunner.query(
      `UPDATE "Products" SET category = 'Legumes' WHERE category = 'legumes'`,
    );

    // Rename the old enum type
    await queryRunner.query(
      `ALTER TYPE "Products_category_enum" RENAME TO "Products_category_enum_old"`,
    );

    // Create the new enum type with updated values
    await queryRunner.query(
      `CREATE TYPE "Products_category_enum" AS ENUM ('Shea Butter', 'Black Soap', 'Cosmetics', 'Shea Soap', 'Powdered Soap', 'Dawadawa Tea', 'Essential Oils', 'Hair Oil', 'Grains', 'Legumes', 'other')`,
    );

    // Drop the default value before altering the column type
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN category DROP DEFAULT`,
    );

    // Alter the column to use the new enum type
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN category TYPE "Products_category_enum" USING category::"Products_category_enum"`,
    );

    // Set the new default value
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN category SET DEFAULT 'other'`,
    );

    // Drop the old enum type
    await queryRunner.query(`DROP TYPE "Products_category_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Alter the column to text to allow updates
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN category TYPE text`,
    );

    // Update existing data back to old enum values
    await queryRunner.query(
      `UPDATE "Products" SET category = 'shea_butter' WHERE category = 'Shea Butter'`,
    );
    await queryRunner.query(
      `UPDATE "Products" SET category = 'black_soap' WHERE category = 'Black Soap'`,
    );
    await queryRunner.query(
      `UPDATE "Products" SET category = 'cosmetics' WHERE category = 'Cosmetics'`,
    );
    await queryRunner.query(
      `UPDATE "Products" SET category = 'shea_soap' WHERE category = 'Shea Soap'`,
    );
    await queryRunner.query(
      `UPDATE "Products" SET category = 'powdered_soap' WHERE category = 'Powdered Soap'`,
    );
    await queryRunner.query(
      `UPDATE "Products" SET category = 'dawadawa_tea' WHERE category = 'Dawadawa Tea'`,
    );
    await queryRunner.query(
      `UPDATE "Products" SET category = 'essential_oils' WHERE category = 'Essential Oils'`,
    );
    await queryRunner.query(
      `UPDATE "Products" SET category = 'hair_oil' WHERE category = 'Hair Oil'`,
    );
    await queryRunner.query(
      `UPDATE "Products" SET category = 'grains' WHERE category = 'Grains'`,
    );
    await queryRunner.query(
      `UPDATE "Products" SET category = 'legumes' WHERE category = 'Legumes'`,
    );

    // Rename the current enum type
    await queryRunner.query(
      `ALTER TYPE "Products_category_enum" RENAME TO "Products_category_enum_new"`,
    );

    // Create the old enum type with original values
    await queryRunner.query(
      `CREATE TYPE "Products_category_enum" AS ENUM ('shea_butter', 'black_soap', 'cosmetics', 'shea_soap', 'powdered_soap', 'dawadawa_tea', 'essential_oils', 'hair_oil', 'grains', 'legumes', 'other')`,
    );

    // Drop the default value before altering the column type
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN category DROP DEFAULT`,
    );

    // Alter the column to use the old enum type
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN category TYPE "Products_category_enum" USING category::"Products_category_enum"`,
    );

    // Set the old default value
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN category SET DEFAULT 'other'`,
    );

    // Drop the new enum type
    await queryRunner.query(`DROP TYPE "Products_category_enum_new"`);
  }
}
