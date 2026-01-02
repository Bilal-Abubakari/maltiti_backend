import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTimestampsToVerification1767298937442
  implements MigrationInterface
{
  public name = "AddTimestampsToVerification1767298937442";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add updatedAt column with default value
    await queryRunner.query(
      `ALTER TABLE "verifications" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );

    // Add deletedAt column (nullable for soft deletes)
    await queryRunner.query(
      `ALTER TABLE "verifications" ADD "deletedAt" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove deletedAt column
    await queryRunner.query(
      `ALTER TABLE "verifications" DROP COLUMN "deletedAt"`,
    );

    // Remove updatedAt column
    await queryRunner.query(
      `ALTER TABLE "verifications" DROP COLUMN "updatedAt"`,
    );
  }
}
