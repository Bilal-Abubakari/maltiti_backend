import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveCheckoutAmount1739577700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove the amount column from Checkouts table
    // All monetary values are now in Sale.amount and Sale.deliveryFee
    await queryRunner.query(`
      ALTER TABLE "Checkouts" 
      DROP COLUMN IF EXISTS "amount";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the amount column if rollback is needed
    await queryRunner.query(`
      ALTER TABLE "Checkouts" 
      ADD COLUMN "amount" DECIMAL(10,2);
    `);

    // Note: Data cannot be automatically restored
    // You would need to recalculate from Sale.amount + Sale.deliveryFee
  }
}
