import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class SplitSaleStatusIntoOrderAndPaymentStatus1737628800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the new orderStatus column with default value
    await queryRunner.addColumn(
      "Sales",
      new TableColumn({
        name: "orderStatus",
        type: "enum",
        enum: ["pending", "packaging", "in_transit", "delivered", "cancelled"],
        default: "'pending'",
      }),
    );

    // Add the new paymentStatus column with default value
    await queryRunner.addColumn(
      "Sales",
      new TableColumn({
        name: "paymentStatus",
        type: "enum",
        enum: ["invoice_requested", "pending_payment", "paid", "refunded"],
        default: "'invoice_requested'",
      }),
    );

    // Migrate data from old status column to new columns
    // Payment-related statuses go to paymentStatus (cast to text to avoid enum type mismatch)
    await queryRunner.query(`
      UPDATE "Sales"
      SET "paymentStatus" = CAST("status"::text AS "Sales_paymentstatus_enum")
      WHERE "status"::text IN ('invoice_requested', 'pending_payment', 'paid')
    `);

    // Order-related statuses go to orderStatus (cast to text to avoid enum type mismatch)
    await queryRunner.query(`
      UPDATE "Sales"
      SET "orderStatus" = CAST("status"::text AS "Sales_orderstatus_enum")
      WHERE "status"::text IN ('packaging', 'in_transit', 'delivered', 'cancelled')
    `);

    // For payment-related statuses, set orderStatus appropriately
    await queryRunner.query(`
      UPDATE "Sales"
      SET "orderStatus" = CASE
        WHEN "status"::text IN ('invoice_requested', 'pending_payment') THEN CAST('pending' AS "Sales_orderstatus_enum")
        WHEN "status"::text = 'paid' THEN CAST('packaging' AS "Sales_orderstatus_enum")
      END
      WHERE "status"::text IN ('invoice_requested', 'pending_payment', 'paid')
    `);

    // For order-related statuses, set paymentStatus appropriately
    await queryRunner.query(`
      UPDATE "Sales"
      SET "paymentStatus" = CASE
        WHEN "status"::text IN ('packaging', 'in_transit', 'delivered') THEN CAST('paid' AS "Sales_paymentstatus_enum")
        WHEN "status"::text = 'cancelled' THEN CAST('invoice_requested' AS "Sales_paymentstatus_enum")
      END
      WHERE "status"::text IN ('packaging', 'in_transit', 'delivered', 'cancelled')
    `);

    // Drop the old status column
    await queryRunner.dropColumn("Sales", "status");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the old status column
    await queryRunner.addColumn(
      "Sales",
      new TableColumn({
        name: "status",
        type: "enum",
        enum: [
          "invoice_requested",
          "pending_payment",
          "paid",
          "packaging",
          "in_transit",
          "delivered",
          "cancelled",
        ],
        default: "'invoice_requested'",
      }),
    );

    // Migrate data back from new columns to old status column
    // Priority: orderStatus takes precedence if it's more advanced
    await queryRunner.query(`
      UPDATE "Sales"
      SET "status" = CASE
        WHEN "orderStatus" = 'delivered' THEN 'delivered'
        WHEN "orderStatus" = 'in_transit' THEN 'in_transit'
        WHEN "orderStatus" = 'packaging' THEN 'packaging'
        WHEN "orderStatus" = 'cancelled' THEN 'cancelled'
        WHEN "paymentStatus" = 'paid' THEN 'paid'
        WHEN "paymentStatus" = 'pending_payment' THEN 'pending_payment'
        WHEN "paymentStatus" = 'invoice_requested' THEN 'invoice_requested'
        ELSE 'invoice_requested'
      END
    `);

    // Drop the new columns
    await queryRunner.dropColumn("Sales", "paymentStatus");
    await queryRunner.dropColumn("Sales", "orderStatus");
  }
}
