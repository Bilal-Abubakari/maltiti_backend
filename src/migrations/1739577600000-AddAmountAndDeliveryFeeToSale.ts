import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddAmountAndDeliveryFeeToSale1739577600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add new AWAITING_DELIVERY status to payment status enum
    await queryRunner.query(`
      ALTER TYPE "Sales_paymentstatus_enum" 
      ADD VALUE IF NOT EXISTS 'awaiting_delivery'
    `);

    // Step 2: Add amount column to Sales table (nullable initially for safe migration)
    await queryRunner.addColumn(
      "Sales",
      new TableColumn({
        name: "amount",
        type: "decimal",
        precision: 10,
        scale: 2,
        isNullable: true,
      }),
    );

    // Step 3: Add deliveryFee column to Sales table
    await queryRunner.addColumn(
      "Sales",
      new TableColumn({
        name: "deliveryFee",
        type: "decimal",
        precision: 10,
        scale: 2,
        isNullable: true,
      }),
    );

    // Step 4: Migrate existing data - Copy checkout amounts to sales
    // This assumes that existing Checkout.amount represents the total (products + delivery)
    // For historical data, we'll set Sale.amount = Checkout.amount and deliveryFee = null
    await queryRunner.query(`
      UPDATE "Sales" s
      SET amount = CAST(c.amount AS DECIMAL(10,2))
      FROM "Checkouts" c
      WHERE c."saleId" = s.id
      AND s.amount IS NULL
    `);

    // Step 5: For sales without checkout (admin-created), calculate amount from lineItems
    // This is a one-time calculation for existing data
    // Note: This is a placeholder - in production, you might need to handle this differently
    await queryRunner.query(`
      UPDATE "Sales"
      SET amount = 0
      WHERE amount IS NULL
      AND id NOT IN (SELECT "saleId" FROM "Checkouts" WHERE "saleId" IS NOT NULL)
    `);

    // Note: We intentionally keep amount as nullable to handle edge cases
    // and allow for gradual data migration if needed
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the added columns
    await queryRunner.dropColumn("Sales", "deliveryFee");
    await queryRunner.dropColumn("Sales", "amount");

    // Note: We cannot easily remove the enum value in PostgreSQL
    // The enum value 'awaiting_delivery' will remain but unused
    // If you need to remove it, you would need to:
    // 1. Create a new enum without the value
    // 2. Change the column type to the new enum
    // 3. Drop the old enum
    // This is complex and rarely needed for rollbacks
  }
}
