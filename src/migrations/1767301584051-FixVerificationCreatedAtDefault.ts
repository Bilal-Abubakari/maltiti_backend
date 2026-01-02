import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Fix verification table createdAt column default value
 *
 * Changes the default from a hardcoded past timestamp to now()
 * ensuring new verification records get the current timestamp
 */
export class FixVerificationCreatedAtDefault1767301584051
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Change createdAt default from hardcoded timestamp to now()
    await queryRunner.query(
      `ALTER TABLE "verifications" ALTER COLUMN "createdAt" SET DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore previous hardcoded default value
    await queryRunner.query(
      `ALTER TABLE "verifications" ALTER COLUMN "createdAt" SET DEFAULT '2025-12-06 09:47:05.168'::timestamp without time zone`,
    );
  }
}
