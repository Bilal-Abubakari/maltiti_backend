-- Migration Script for Product Feature Enhancement
-- Maltiti A. Enterprise Ltd - Admin Portal Backend
-- Version: 1.0
-- Date: 2024

-- ============================================
-- BATCH TABLE CREATION
-- ============================================

CREATE TABLE IF NOT EXISTS "Batches" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "batchNumber" VARCHAR(255) UNIQUE NOT NULL,
  "productionDate" DATE,
  "expiryDate" DATE,
  "manufacturingLocation" VARCHAR(255),
  "qualityCheckStatus" VARCHAR(100),
  "notes" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);

-- Create index for batch queries
CREATE INDEX IF NOT EXISTS idx_batches_batch_number ON "Batches"("batchNumber");
CREATE INDEX IF NOT EXISTS idx_batches_active ON "Batches"("isActive") WHERE "deletedAt" IS NULL;

-- ============================================
-- PRODUCT TABLE ENHANCEMENTS
-- ============================================

-- Backup existing products table (optional but recommended)
-- CREATE TABLE "Products_Backup_20241106" AS SELECT * FROM "Products";

-- Add new columns to Products table
ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "sku" VARCHAR(100) UNIQUE;
ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "images" TEXT[];
ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "grade" VARCHAR(50);
ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN DEFAULT false;
ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "isOrganic" BOOLEAN DEFAULT false;
ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "certifications" TEXT[];
ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "supplierReference" VARCHAR(255);
ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "producedAt" DATE;
ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "expiryDate" DATE;
ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "minOrderQuantity" INTEGER DEFAULT 0;
ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "costPrice" DECIMAL(10,2);
ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "batchId" UUID;
ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;

-- Update data types for better precision
ALTER TABLE "Products" ALTER COLUMN "wholesale" TYPE DECIMAL(10,2) USING "wholesale"::DECIMAL(10,2);
ALTER TABLE "Products" ALTER COLUMN "retail" TYPE DECIMAL(10,2) USING "retail"::DECIMAL(10,2);
ALTER TABLE "Products" ALTER COLUMN "stockQuantity" TYPE INTEGER USING "stockQuantity"::INTEGER;
ALTER TABLE "Products" ALTER COLUMN "inBoxPrice" TYPE DECIMAL(10,2) USING "inBoxPrice"::DECIMAL(10,2);
ALTER TABLE "Products" ALTER COLUMN "quantityInBox" TYPE INTEGER USING "quantityInBox"::INTEGER;
ALTER TABLE "Products" ALTER COLUMN "rating" TYPE DECIMAL(2,1) USING "rating"::DECIMAL(2,1);
ALTER TABLE "Products" ALTER COLUMN "reviews" TYPE INTEGER USING "reviews"::INTEGER;

-- Change ingredients to TEXT type for better storage
ALTER TABLE "Products" ALTER COLUMN "ingredients" TYPE TEXT;

-- Update status column to use enum values
UPDATE "Products" SET "status" = 'active' WHERE LOWER("status") = 'active';
UPDATE "Products" SET "status" = 'inactive' WHERE LOWER("status") = 'inactive';

-- ============================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================

-- Add foreign key relationship between Products and Batches
ALTER TABLE "Products"
ADD CONSTRAINT fk_products_batch
FOREIGN KEY ("batchId")
REFERENCES "Batches"("id")
ON DELETE SET NULL;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Drop old indexes if they exist
DROP INDEX IF EXISTS idx_products_category;
DROP INDEX IF EXISTS idx_products_status;

-- Create composite and single column indexes
CREATE INDEX IF NOT EXISTS idx_products_category_status ON "Products"("category", "status") WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_sku ON "Products"("sku") WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_name ON "Products"("name") WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_featured ON "Products"("isFeatured") WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_favorite ON "Products"("favorite") WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_batch ON "Products"("batchId") WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_status ON "Products"("status") WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_deleted ON "Products"("deletedAt");

-- Full text search index for better search performance
CREATE INDEX IF NOT EXISTS idx_products_search ON "Products" USING GIN(to_tsvector('english', "name" || ' ' || "description"));

-- ============================================
-- UPDATE TIMESTAMPS TRIGGER
-- ============================================

-- Create or replace function to auto-update updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_products_updated_at ON "Products";
DROP TRIGGER IF EXISTS update_batches_updated_at ON "Batches";

-- Create triggers for auto-updating timestamps
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON "Products"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at
BEFORE UPDATE ON "Batches"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATA MIGRATION & CLEANUP
-- ============================================

-- Set default values for existing products
UPDATE "Products" SET "isFeatured" = false WHERE "isFeatured" IS NULL;
UPDATE "Products" SET "isOrganic" = false WHERE "isOrganic" IS NULL;
UPDATE "Products" SET "minOrderQuantity" = 0 WHERE "minOrderQuantity" IS NULL;
UPDATE "Products" SET "rating" = 0 WHERE "rating" IS NULL OR "rating" = '';
UPDATE "Products" SET "reviews" = 0 WHERE "reviews" IS NULL OR "reviews" = '';

-- Convert old category values to new enum values (adjust as needed)
UPDATE "Products" SET "category" = 'shea_butter' WHERE LOWER("category") LIKE '%shea%butter%';
UPDATE "Products" SET "category" = 'black_soap' WHERE LOWER("category") LIKE '%black%soap%';
UPDATE "Products" SET "category" = 'cosmetics' WHERE LOWER("category") LIKE '%cosmetic%';
UPDATE "Products" SET "category" = 'shea_soap' WHERE LOWER("category") LIKE '%shea%soap%';
UPDATE "Products" SET "category" = 'essential_oils' WHERE LOWER("category") LIKE '%oil%';
UPDATE "Products" SET "category" = 'other' WHERE "category" NOT IN ('shea_butter', 'black_soap', 'cosmetics', 'shea_soap', 'essential_oils');

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check Products table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'Products'
-- ORDER BY ordinal_position;

-- Check Batches table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'Batches'
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename IN ('Products', 'Batches');

-- Check foreign keys
-- SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'Products';

-- ============================================
-- ROLLBACK SCRIPT (USE WITH CAUTION)
-- ============================================

/*
-- Rollback: Remove foreign key
ALTER TABLE "Products" DROP CONSTRAINT IF EXISTS fk_products_batch;

-- Rollback: Remove new columns
ALTER TABLE "Products" DROP COLUMN IF EXISTS "sku";
ALTER TABLE "Products" DROP COLUMN IF EXISTS "images";
ALTER TABLE "Products" DROP COLUMN IF EXISTS "grade";
ALTER TABLE "Products" DROP COLUMN IF EXISTS "isFeatured";
ALTER TABLE "Products" DROP COLUMN IF EXISTS "isOrganic";
ALTER TABLE "Products" DROP COLUMN IF EXISTS "certifications";
ALTER TABLE "Products" DROP COLUMN IF EXISTS "supplierReference";
ALTER TABLE "Products" DROP COLUMN IF EXISTS "producedAt";
ALTER TABLE "Products" DROP COLUMN IF EXISTS "expiryDate";
ALTER TABLE "Products" DROP COLUMN IF EXISTS "minOrderQuantity";
ALTER TABLE "Products" DROP COLUMN IF EXISTS "costPrice";
ALTER TABLE "Products" DROP COLUMN IF EXISTS "batchId";
ALTER TABLE "Products" DROP COLUMN IF EXISTS "deletedAt";

-- Rollback: Drop Batches table
DROP TABLE IF EXISTS "Batches";

-- Rollback: Restore from backup
-- INSERT INTO "Products" SELECT * FROM "Products_Backup_20241106";
*/

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Products table enhanced with new fields and indexes';
  RAISE NOTICE 'Batches table created with foreign key relationship';
  RAISE NOTICE 'Please verify the changes before proceeding to production';
END $$;

