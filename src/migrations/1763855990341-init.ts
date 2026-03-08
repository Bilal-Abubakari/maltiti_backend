import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1763855990341 implements MigrationInterface {
  public name = "Init1763855990341";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "Batches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "batchNumber" character varying NOT NULL, "productionDate" date, "expiryDate" date, "manufacturingLocation" character varying, "qualityCheckStatus" character varying, "notes" character varying, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "productId" uuid NOT NULL, CONSTRAINT "UQ_5945529c315d27db53cc627f5d5" UNIQUE ("batchNumber"), CONSTRAINT "PK_43f4a62b811487494b15bd1f8ba" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "Ingredients" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "name" character varying NOT NULL, "productId" uuid NOT NULL, CONSTRAINT "PK_016662ef75437df7892238aaca9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`
        INSERT INTO "Ingredients" ("id", "name", "productId", "createdAt", "updatedAt")
        SELECT
            uuid_generate_v4(),
            TRIM(ingredient),
            p.id,
            now(),
            now()
        FROM "Products" p,
             regexp_split_to_table(p.ingredients, ',') AS ingredient
        WHERE p.ingredients IS NOT NULL AND p.ingredients <> '';
    `);

    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "ingredients"`);
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "sku" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ADD CONSTRAINT "UQ_eb2e6c7c03ea341ff8fcbcdb6f7" UNIQUE ("sku")`,
    );
    await queryRunner.query(`ALTER TABLE "Products" ADD "images" text`);
    await queryRunner.query(
      `CREATE TYPE "public"."Products_grade_enum" AS ENUM('A', 'B', 'premium', 'standard', 'organic')`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "grade" "public"."Products_grade_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "isFeatured" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "isOrganic" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "Products" ADD "certifications" text`);
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "supplierReference" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "Products" ADD "producedAt" date`);
    await queryRunner.query(`ALTER TABLE "Products" ADD "expiryDate" date`);
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "minOrderQuantity" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "costPrice" numeric(10,2)`,
    );
    await queryRunner.query(`ALTER TABLE "Products" ADD "deletedAt" TIMESTAMP`);
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "createdAt" SET DEFAULT '"2025-11-22T23:59:53.809Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updatedAt" SET DEFAULT '"2025-11-22T23:59:53.809Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "verifications" ALTER COLUMN "createdAt" SET DEFAULT '"2025-11-22T23:59:53.809Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN "weight" DROP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "category"`);
    await queryRunner.query(
      `CREATE TYPE "public"."Products_category_enum" AS ENUM('shea_butter', 'black_soap', 'cosmetics', 'shea_soap', 'powdered_soap', 'dawadawa_tea', 'essential_oils', 'hair_oil', 'grains', 'legumes', 'other')`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "category" "public"."Products_category_enum" NOT NULL DEFAULT 'other'`,
    );
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "description"`);
    await queryRunner.query(`ALTER TABLE "Products" ADD "description" text`);
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "status"`);
    await queryRunner.query(
      `CREATE TYPE "public"."Products_status_enum" AS ENUM('active', 'inactive', 'out_of_stock', 'discontinued')`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "status" "public"."Products_status_enum" NOT NULL DEFAULT 'active'`,
    );
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "size"`);
    await queryRunner.query(
      `CREATE TYPE "public"."Products_size_enum" AS ENUM('100g', '250g', '500g', '1kg', '5kg', '12kg', '25kg', '50kg', '100ml', '250ml', '500ml', '1L', 'custom')`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "size" "public"."Products_size_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN "image" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN "wholesale" TYPE numeric(10,2) USING wholesale::numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN "retail" TYPE numeric(10,2) USING retail::numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN "stockQuantity" TYPE integer USING "stockQuantity"::integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN "inBoxPrice" TYPE numeric(10,2) USING "inBoxPrice"::numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN "quantityInBox" TYPE integer USING "quantityInBox"::integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN "rating" TYPE numeric(2,1) USING rating::numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN "reviews" TYPE integer USING reviews::integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN "createdAt" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN "updatedAt" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '"2025-11-22T23:59:54.072Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '"2025-11-22T23:59:54.072Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ALTER COLUMN "createdAt" SET DEFAULT '"2025-11-22T23:59:54.074Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ALTER COLUMN "updatedAt" SET DEFAULT '"2025-11-22T23:59:54.074Z"'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_26c9336d231c4e90419a5954bd" ON "Products" ("name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f780eacad4a3c31f7a38f0b0b4" ON "Products" ("category") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c8f73692c10be01b0418d8b4b3" ON "Products" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6ccb2db7bb498d57db85819e45" ON "Products" ("favorite") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_212a48f8a766824f7657dbbe4b" ON "Products" ("isFeatured") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_eb2e6c7c03ea341ff8fcbcdb6f" ON "Products" ("sku") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3140410e6247ccc3a8f24e8d0d" ON "Products" ("category", "status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "Batches" ADD CONSTRAINT "FK_6b066bac134b8d11dc0e9c82bfa" FOREIGN KEY ("productId") REFERENCES "Products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Ingredients" ADD CONSTRAINT "FK_5c99efacd9722714945c8bd7bb9" FOREIGN KEY ("productId") REFERENCES "Products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Ingredients" DROP CONSTRAINT "FK_5c99efacd9722714945c8bd7bb9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Batches" DROP CONSTRAINT "FK_6b066bac134b8d11dc0e9c82bfa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3140410e6247ccc3a8f24e8d0d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_eb2e6c7c03ea341ff8fcbcdb6f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_212a48f8a766824f7657dbbe4b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6ccb2db7bb498d57db85819e45"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c8f73692c10be01b0418d8b4b3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f780eacad4a3c31f7a38f0b0b4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_26c9336d231c4e90419a5954bd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ALTER COLUMN "updatedAt" SET DEFAULT '2025-11-05 21:08:28.844'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ALTER COLUMN "createdAt" SET DEFAULT '2025-11-05 21:08:28.844'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '2025-11-05 21:08:28.844'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '2025-11-05 21:08:28.844'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN "updatedAt" SET DEFAULT '2025-11-05 21:08:28.839'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN "createdAt" SET DEFAULT '2025-11-05 21:08:28.839'`,
    );
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "reviews"`);
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "reviews" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "rating"`);
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "rating" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" DROP COLUMN "quantityInBox"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "quantityInBox" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "inBoxPrice"`);
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "inBoxPrice" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" DROP COLUMN "stockQuantity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "stockQuantity" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "retail"`);
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "retail" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "wholesale"`);
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "wholesale" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN "image" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "size"`);
    await queryRunner.query(`DROP TYPE "public"."Products_size_enum"`);
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "size" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."Products_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "status" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "description"`);
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "description" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "category"`);
    await queryRunner.query(`DROP TYPE "public"."Products_category_enum"`);
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "category" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" ALTER COLUMN "weight" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "verifications" ALTER COLUMN "createdAt" SET DEFAULT '2025-11-05 21:08:25.55'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updatedAt" SET DEFAULT '2025-11-05 21:08:23.339'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "createdAt" SET DEFAULT '2025-11-05 21:08:23.339'`,
    );
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "deletedAt"`);
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "costPrice"`);
    await queryRunner.query(
      `ALTER TABLE "Products" DROP COLUMN "minOrderQuantity"`,
    );
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "expiryDate"`);
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "producedAt"`);
    await queryRunner.query(
      `ALTER TABLE "Products" DROP COLUMN "supplierReference"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Products" DROP COLUMN "certifications"`,
    );
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "isOrganic"`);
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "isFeatured"`);
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "grade"`);
    await queryRunner.query(`DROP TYPE "public"."Products_grade_enum"`);
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "images"`);
    await queryRunner.query(
      `ALTER TABLE "Products" DROP CONSTRAINT "UQ_eb2e6c7c03ea341ff8fcbcdb6f7"`,
    );
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "sku"`);
    await queryRunner.query(
      `ALTER TABLE "Products" ADD "ingredients" character varying NOT NULL`,
    );
    await queryRunner.query(`DROP TABLE "Ingredients"`);
    await queryRunner.query(`DROP TABLE "Batches"`);
  }
}
