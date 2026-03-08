import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameLineItemsToLineItems1765689623853
  implements MigrationInterface
{
  public name = "RenameLineItemsToLineItems1765689623853";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename column from snake_case to camelCase
    await queryRunner.query(
      `ALTER TABLE "Sales" RENAME COLUMN "line_items" TO "lineItems"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert column name back to snake_case
    await queryRunner.query(
      `ALTER TABLE "Sales" RENAME COLUMN "lineItems" TO "line_items"`,
    );
  }
}
