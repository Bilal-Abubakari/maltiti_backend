import { MigrationInterface, QueryRunner } from "typeorm";

export class DeduplicateIngredients1764230792324 implements MigrationInterface {
  public name = "DeduplicateIngredients1764230792324";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create mapping of name to min id
    await queryRunner.query(`
            CREATE TEMP TABLE ingredient_mapping AS
            SELECT name, id as min_id
            FROM (
                SELECT name, id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY id) as rn
                FROM "Ingredients"
            ) t
            WHERE rn = 1
        `);
    // Update junction table to use min_id
    await queryRunner.query(`
            UPDATE "products_ingredients_ingredients" 
            SET "ingredientsId" = im.min_id
            FROM ingredient_mapping im
            INNER JOIN "Ingredients" i ON i.name = im.name
            WHERE "products_ingredients_ingredients"."ingredientsId" = i.id
        `);
    // Delete duplicate ingredients
    await queryRunner.query(`
            DELETE FROM "Ingredients" 
            WHERE id NOT IN (SELECT min_id FROM ingredient_mapping)
        `);
    // Drop temp table
    await queryRunner.query(`DROP TABLE ingredient_mapping`);
    // Add unique constraint
    await queryRunner.query(
      `ALTER TABLE "Ingredients" ADD CONSTRAINT "UQ_04a37f31b1b58c6181f03c4b567" UNIQUE ("name")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Ingredients" DROP CONSTRAINT "UQ_04a37f31b1b58c6181f03c4b567"`,
    );
  }
}
