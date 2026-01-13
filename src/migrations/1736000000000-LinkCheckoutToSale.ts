import { MigrationInterface, QueryRunner } from "typeorm";

export class LinkCheckoutToSale1736000000000 implements MigrationInterface {
  public name = "LinkCheckoutToSale1736000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, let's handle the Checkouts table restructuring

    // Add new columns to Checkouts table
    await queryRunner.query(`
      ALTER TABLE "Checkouts" 
      ADD COLUMN "saleId" uuid,
      ADD COLUMN "paystackReference" varchar,
      ADD COLUMN "deletedAt" timestamp;
    `);

    // Change amount from string to decimal
    await queryRunner.query(`
      ALTER TABLE "Checkouts" 
      ALTER COLUMN "amount" TYPE decimal(10,2) USING "amount"::decimal;
    `);

    // Set default for paymentStatus if not already set
    await queryRunner.query(`
      ALTER TABLE "Checkouts" 
      ALTER COLUMN "paymentStatus" SET DEFAULT 'unpaid';
    `);

    // Make extraInfo nullable and change to text
    await queryRunner.query(`
      ALTER TABLE "Checkouts" 
      ALTER COLUMN "extraInfo" DROP NOT NULL,
      ALTER COLUMN "extraInfo" TYPE text;
    `);

    // Update createdAt and updatedAt to use proper timestamps
    await queryRunner.query(`
      ALTER TABLE "Checkouts" 
      ALTER COLUMN "createdAt" TYPE timestamp,
      ALTER COLUMN "createdAt" SET DEFAULT now(),
      ALTER COLUMN "updatedAt" TYPE timestamp,
      ALTER COLUMN "updatedAt" SET DEFAULT now();
    `);

    // For existing checkouts, we need to:
    // 1. Create a customer from the user if not exists
    // 2. Create a sale record
    // 3. Link the checkout to the sale

    await queryRunner.query(`
      -- Create customers for users who have checkouts but no customer record
      INSERT INTO "Customers" (id, name, email, phone, "userId", "createdAt", "updatedAt")
      SELECT 
        gen_random_uuid(),
        u.name,
        u.email,
        u."phoneNumber",
        u.id,
        NOW(),
        NOW()
      FROM "users" u
      INNER JOIN "Checkouts" c ON c."userId" = u.id
      WHERE NOT EXISTS (
        SELECT 1 FROM "Customers" cust WHERE cust."userId" = u.id
      )
      GROUP BY u.id, u.name, u.email, u."phoneNumber";
    `);

    await queryRunner.query(`
      -- Create sales for existing checkouts (one sale per checkout)
      INSERT INTO "Sales" (id, "customerId", status, "lineItems", "createdAt", "updatedAt")
      SELECT 
        gen_random_uuid() as id,
        cust.id as "customerId",
        (CASE 
          WHEN c."paymentStatus" = 'paid' THEN 'paid'
          WHEN c."paymentStatus" = 'unpaid' THEN 'pending_payment'
          ELSE 'invoice_requested'
        END)::"Sales_status_enum" as status,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'productId', cart."productId",
                'productName', p.name,
                'quantity', cart.quantity,
                'unitPrice', p.retail,
                'totalPrice', cart.quantity * p.retail
              )
            )
            FROM "Carts" cart
            INNER JOIN "Products" p ON cart."productId" = p.id
            WHERE cart."checkoutId" = c.id
          ),
          '[]'::json
        ) as "lineItems",
        c."createdAt",
        c."updatedAt"
      FROM "Checkouts" c
      INNER JOIN "users" u ON c."userId" = u.id
      INNER JOIN "Customers" cust ON cust."userId" = u.id
      WHERE c."saleId" IS NULL
      ORDER BY c."createdAt" DESC;
    `);

    await queryRunner.query(`
      -- Link checkouts to sales (one-to-one relationship)
      WITH ranked_sales AS (
        SELECT 
          s.id as sale_id,
          c.id as checkout_id,
          ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY s."createdAt" DESC) as rn
        FROM "Checkouts" c
        INNER JOIN "users" u ON c."userId" = u.id
        INNER JOIN "Customers" cust ON cust."userId" = u.id
        INNER JOIN "Sales" s ON s."customerId" = cust.id AND s."createdAt" = c."createdAt"
        WHERE c."saleId" IS NULL
      )
      UPDATE "Checkouts" c
      SET "saleId" = rs.sale_id
      FROM ranked_sales rs
      WHERE c.id = rs.checkout_id AND rs.rn = 1;
    `);

    // Now remove old columns that are no longer needed
    await queryRunner.query(`
      ALTER TABLE "Checkouts" 
      DROP COLUMN IF EXISTS "userId",
      DROP COLUMN IF EXISTS "orderStatus",
      DROP COLUMN IF EXISTS "location",
      DROP COLUMN IF EXISTS "name";
    `);

    // Add foreign key constraint for saleId
    await queryRunner.query(`
      ALTER TABLE "Checkouts" 
      ADD CONSTRAINT "FK_Checkouts_Sale" 
      FOREIGN KEY ("saleId") 
      REFERENCES "Sales"(id) 
      ON DELETE CASCADE;
    `);

    // Make saleId NOT NULL after we've populated it
    await queryRunner.query(`
      ALTER TABLE "Checkouts" 
      ALTER COLUMN "saleId" SET NOT NULL;
    `);

    // Add unique constraint to ensure one checkout per sale
    // First, fix any duplicates by keeping only the first checkout for each sale
    await queryRunner.query(`
      DELETE FROM "Checkouts"
      WHERE id IN (
        SELECT c2.id
        FROM "Checkouts" c1
        INNER JOIN "Checkouts" c2 ON c1."saleId" = c2."saleId" AND c1.id < c2.id
      );
    `);

    await queryRunner.query(`
      ALTER TABLE "Checkouts" 
      ADD CONSTRAINT "UQ_Checkouts_saleId" 
      UNIQUE ("saleId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove constraints first
    await queryRunner.query(`
      ALTER TABLE "Checkouts" 
      DROP CONSTRAINT IF EXISTS "UQ_Checkouts_saleId";
    `);

    await queryRunner.query(`
      ALTER TABLE "Checkouts" 
      DROP CONSTRAINT IF EXISTS "FK_Checkouts_Sale";
    `);

    // Add back old columns
    await queryRunner.query(`
      ALTER TABLE "Checkouts" 
      ADD COLUMN "userId" uuid,
      ADD COLUMN "orderStatus" varchar,
      ADD COLUMN "location" varchar,
      ADD COLUMN "name" varchar;
    `);

    // Restore data from Sale/Customer back to Checkout
    await queryRunner.query(`
      UPDATE "Checkouts" c
      SET 
        "userId" = cust."userId",
        "name" = cust.name,
        "location" = COALESCE(cust.address, 'Unknown')
      FROM "Sales" s
      INNER JOIN "Customers" cust ON s."customerId" = cust.id
      WHERE c."saleId" = s.id;
    `);

    // Change amount back to string
    await queryRunner.query(`
      ALTER TABLE "Checkouts" 
      ALTER COLUMN "amount" TYPE varchar USING "amount"::varchar;
    `);

    // Remove new columns
    await queryRunner.query(`
      ALTER TABLE "Checkouts" 
      DROP COLUMN IF EXISTS "saleId",
      DROP COLUMN IF EXISTS "paystackReference",
      DROP COLUMN IF EXISTS "deletedAt";
    `);

    // Make extraInfo NOT NULL again
    await queryRunner.query(`
      ALTER TABLE "Checkouts" 
      ALTER COLUMN "extraInfo" SET NOT NULL;
    `);
  }
}
