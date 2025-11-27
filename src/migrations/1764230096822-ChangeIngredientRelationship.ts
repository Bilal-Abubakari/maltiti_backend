import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeIngredientRelationship1764230096822
  implements MigrationInterface
{
  public name = "ChangeIngredientRelationship1764230096822";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Ingredients" DROP CONSTRAINT "FK_5c99efacd9722714945c8bd7bb9"`,
    );
    await queryRunner.query(
      `CREATE TABLE "products_ingredients_ingredients" ("productsId" uuid NOT NULL, "ingredientsId" uuid NOT NULL, CONSTRAINT "PK_b012538e8e5420d26db4dbfc869" PRIMARY KEY ("productsId", "ingredientsId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d0eae7587be198241a7e8f3b9d" ON "products_ingredients_ingredients" ("productsId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8f604f0bafbc2f2cc419129da7" ON "products_ingredients_ingredients" ("ingredientsId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "Ingredients" DROP COLUMN "productId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products_ingredients_ingredients" ADD CONSTRAINT "FK_d0eae7587be198241a7e8f3b9dc" FOREIGN KEY ("productsId") REFERENCES "Products"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "products_ingredients_ingredients" ADD CONSTRAINT "FK_8f604f0bafbc2f2cc419129da74" FOREIGN KEY ("ingredientsId") REFERENCES "Ingredients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products_ingredients_ingredients" DROP CONSTRAINT "FK_8f604f0bafbc2f2cc419129da74"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products_ingredients_ingredients" DROP CONSTRAINT "FK_d0eae7587be198241a7e8f3b9dc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8f604f0bafbc2f2cc419129da7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d0eae7587be198241a7e8f3b9d"`,
    );
    await queryRunner.query(`DROP TABLE "products_ingredients_ingredients"`);
    await queryRunner.query(
      `ALTER TABLE "Ingredients" ADD "productId" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "Ingredients" ADD CONSTRAINT "FK_5c99efacd9722714945c8bd7bb9" FOREIGN KEY ("productId") REFERENCES "Products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
