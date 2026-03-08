import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1772971567809 implements MigrationInterface {
  public name = "Init1772971567809";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "email" character varying NOT NULL, "name" character varying NOT NULL, "password" character varying NOT NULL, "userType" character varying NOT NULL, "phoneNumber" character varying, "avatarUrl" character varying, "permissions" character varying, "mustChangePassword" boolean NOT NULL DEFAULT false, "rememberToken" character varying, "status" character varying NOT NULL DEFAULT 'active', "dob" TIMESTAMP, "emailVerifiedAt" TIMESTAMP, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_1e3d0240b49c40521aaeb953293" UNIQUE ("phoneNumber"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "verifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "type" character varying NOT NULL, "token" character varying NOT NULL, "userId" uuid, CONSTRAINT "PK_2127ad1b143cf012280390b01d1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "Customers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "phone" character varying, "email" character varying, "address" text, "country" character varying(100), "region" character varying(100), "city" character varying(100), "phoneNumber" character varying(20), "extraInfo" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "userId" uuid, CONSTRAINT "REL_8f2671e378010b12df958146b9" UNIQUE ("userId"), CONSTRAINT "PK_c3220bb99cfda194990bc2975be" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_customer_email" ON "Customers" ("email") `,
    );
    await queryRunner.query(
      `CREATE TABLE "Batches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "batchNumber" character varying NOT NULL, "productionDate" date, "expiryDate" date, "manufacturingLocation" character varying, "qualityCheckStatus" character varying, "notes" character varying, "quantity" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "productId" uuid NOT NULL, CONSTRAINT "UQ_5945529c315d27db53cc627f5d5" UNIQUE ("batchNumber"), CONSTRAINT "PK_43f4a62b811487494b15bd1f8ba" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "Ingredients" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "name" character varying NOT NULL, CONSTRAINT "UQ_04a37f31b1b58c6181f03c4b567" UNIQUE ("name"), CONSTRAINT "PK_016662ef75437df7892238aaca9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."Products_unitofmeasurement_enum" AS ENUM('kilogram', 'gram', 'litre', 'millilitre')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."Products_category_enum" AS ENUM('Shea Butter', 'Black Soap', 'Cosmetics', 'Shea Soap', 'Powdered Soap', 'Dawadawa', 'Essential Oils', 'Hair Oil', 'Grains', 'Legumes', 'Other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."Products_status_enum" AS ENUM('active', 'inactive', 'out_of_stock', 'discontinued')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."Products_grade_enum" AS ENUM('A', 'B', 'premium', 'standard', 'organic')`,
    );
    await queryRunner.query(
      `CREATE TABLE "Products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sku" character varying, "name" character varying NOT NULL, "weight" character varying, "unitOfMeasurement" "public"."Products_unitofmeasurement_enum", "category" "public"."Products_category_enum" NOT NULL DEFAULT 'Other', "description" text, "status" "public"."Products_status_enum" NOT NULL DEFAULT 'active', "images" text, "image" character varying, "wholesale" numeric(10,2) NOT NULL, "retail" numeric(10,2) NOT NULL, "inBoxPrice" numeric(10,2), "quantityInBox" integer, "favorite" boolean NOT NULL DEFAULT false, "rating" numeric(2,1) NOT NULL DEFAULT '0', "reviews" integer NOT NULL DEFAULT '0', "grade" "public"."Products_grade_enum", "isFeatured" boolean NOT NULL DEFAULT false, "isOrganic" boolean NOT NULL DEFAULT false, "certifications" text, "supplierReference" character varying, "minOrderQuantity" integer NOT NULL DEFAULT '0', "costPrice" numeric(10,2), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_eb2e6c7c03ea341ff8fcbcdb6f7" UNIQUE ("sku"), CONSTRAINT "PK_36a07cc432789830e7fb7b58a83" PRIMARY KEY ("id"))`,
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
      `CREATE TABLE "Carts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sessionId" character varying, "quantity" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT '"2026-03-08T12:06:14.315Z"', "updatedAt" TIMESTAMP NOT NULL DEFAULT '"2026-03-08T12:06:14.315Z"', "userId" uuid, "productId" uuid, "checkoutId" uuid, CONSTRAINT "PK_6088efe237f1e59de8fff0032d5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "Checkouts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "guestEmail" character varying, "saleId" uuid NOT NULL, CONSTRAINT "REL_a7e38427baabe6104e8a837cf8" UNIQUE ("saleId"), CONSTRAINT "PK_d0387543badf79399b3db01fcb6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."Sales_orderstatus_enum" AS ENUM('pending', 'packaging', 'in_transit', 'delivered', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."Sales_paymentstatus_enum" AS ENUM('invoice_requested', 'awaiting_delivery', 'pending_payment', 'paid', 'refunded')`,
    );
    await queryRunner.query(
      `CREATE TABLE "Sales" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "orderStatus" "public"."Sales_orderstatus_enum" NOT NULL DEFAULT 'pending', "paymentStatus" "public"."Sales_paymentstatus_enum" NOT NULL DEFAULT 'invoice_requested', "paymentReference" character varying, "amount" numeric(10,2), "deliveryFee" numeric(10,2), "serviceFee" numeric(10,2), "confirmedDeliveryDate" TIMESTAMP, "lineItems" json NOT NULL, "customerId" uuid NOT NULL, CONSTRAINT "PK_42b06288cc6e50ea7f5bca1e212" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "Reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "saleId" uuid NOT NULL, "rating" integer NOT NULL, "title" character varying, "comment" text NOT NULL, CONSTRAINT "PK_5ae106da7bc18dc3731e48a8a94" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "DailyReportLogs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "reportDate" date NOT NULL, "sent" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_45f2c252e57c065330723697254" UNIQUE ("reportDate"), CONSTRAINT "PK_5c4603936072a13b8362c7bd5a7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_topic_enum" AS ENUM('ORDER_CREATED', 'ORDER_STATUS_UPDATED', 'ORDER_CANCELLED', 'ORDER_DELIVERED', 'ORDER_DELIVERY_COST_UPDATED', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'REFUND_PROCESSED', 'PRODUCT_CREATED', 'PRODUCT_PRICE_CHANGED', 'PRODUCT_OUT_OF_STOCK', 'PRODUCT_BACK_IN_STOCK', 'USER_ACCOUNT_CREATED', 'USER_EMAIL_VERIFIED', 'USER_PASSWORD_RESET', 'USER_PROFILE_UPDATED', 'ADMIN_NEW_ORDER', 'ADMIN_ORDER_CANCELLED', 'ADMIN_CONTACT_FORM_SUBMITTED', 'ADMIN_LOW_STOCK_ALERT', 'ADMIN_PAYMENT_RECEIVED', 'ADMIN_REVIEW_SUBMITTED', 'REVIEW_SUBMITTED', 'REVIEW_APPROVED', 'REVIEW_REJECTED', 'SYSTEM_MAINTENANCE', 'SYSTEM_ANNOUNCEMENT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "userId" character varying NOT NULL, "topic" "public"."notifications_topic_enum" NOT NULL, "title" character varying NOT NULL, "message" text NOT NULL, "link" character varying NOT NULL, "payload" jsonb NOT NULL, "isRead" boolean NOT NULL DEFAULT false, "readAt" TIMESTAMP, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_user_id" ON "notifications" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_topic" ON "notifications" ("topic") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_read" ON "notifications" ("isRead") `,
    );
    await queryRunner.query(
      `CREATE TABLE "Cooperatives" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "community" character varying NOT NULL, "registrationFee" character varying NOT NULL, "monthlyFee" character varying NOT NULL, "minimalShare" character varying NOT NULL, CONSTRAINT "PK_40f77e7e5b4ae88c79931e6ddc4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "cooperativeMembers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "phoneNumber" character varying NOT NULL, "houseNumber" character varying NOT NULL, "gpsAddress" character varying NOT NULL, "image" character varying NOT NULL, "idType" character varying NOT NULL, "idNumber" character varying NOT NULL, "community" character varying NOT NULL, "district" character varying NOT NULL, "region" character varying NOT NULL, "dob" TIMESTAMP NOT NULL, "education" character varying NOT NULL, "occupation" character varying NOT NULL, "secondaryOccupation" character varying NOT NULL, "crops" character varying NOT NULL, "farmSize" integer NOT NULL, "cooperativeId" uuid, CONSTRAINT "UQ_28a9ad52b9821f0211e86f582e3" UNIQUE ("phoneNumber"), CONSTRAINT "UQ_cb1d5b7bb97b9d6ae12efc0d0aa" UNIQUE ("idNumber"), CONSTRAINT "PK_78199b603f2baad7543cc3c23c4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_actiontype_enum" AS ENUM('LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'CREATE', 'UPDATE', 'DELETE', 'ROLE_CHANGED', 'PERMISSION_CHANGED', 'STATUS_CHANGED', 'INVENTORY_ADJUSTED', 'BATCH_ASSIGNED', 'REPORT_EXPORTED', 'DATA_EXPORTED', 'SALE_CREATED', 'SALE_UPDATED', 'SALE_CANCELLED', 'CONFIGURATION_CHANGED', 'SYSTEM_ACTION', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_DEACTIVATED', 'USER_ACTIVATED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_entitytype_enum" AS ENUM('USER', 'PRODUCT', 'BATCH', 'INVENTORY', 'SALE', 'CHECKOUT', 'CART', 'COOPERATIVE', 'COOPERATIVE_MEMBER', 'CUSTOMER', 'REPORT', 'SYSTEM', 'CONFIGURATION', 'AUTHENTICATION')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_performedbyrole_enum" AS ENUM('user', 'admin', 'superadmin')`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "actionType" "public"."audit_logs_actiontype_enum" NOT NULL, "entityType" "public"."audit_logs_entitytype_enum" NOT NULL, "entityId" character varying, "description" text NOT NULL, "performedByUserId" character varying NOT NULL, "performedByUserName" character varying, "performedByRole" "public"."audit_logs_performedbyrole_enum" NOT NULL, "ipAddress" character varying, "userAgent" text, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "metadata" json, CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_01993ae76b293d3b866cc3a125" ON "audit_logs" ("entityType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9d63f7dd74d7df762563b41bd0" ON "audit_logs" ("actionType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1a3e39f67189527c39099fe322" ON "audit_logs" ("performedByUserId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_88dcc148d532384790ab874c3d" ON "audit_logs" ("timestamp") `,
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
      `ALTER TABLE "verifications" ADD CONSTRAINT "FK_e6a542673f9abc1f67e5f32abaf" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Customers" ADD CONSTRAINT "FK_8f2671e378010b12df958146b98" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Batches" ADD CONSTRAINT "FK_6b066bac134b8d11dc0e9c82bfa" FOREIGN KEY ("productId") REFERENCES "Products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ADD CONSTRAINT "FK_8c26b3de964f6e854a22b7e3293" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ADD CONSTRAINT "FK_4f79c8ec27b2ad76fa2cf572d75" FOREIGN KEY ("productId") REFERENCES "Products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ADD CONSTRAINT "FK_d7f7406d8fa5047242b6aca8e1f" FOREIGN KEY ("checkoutId") REFERENCES "Checkouts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Checkouts" ADD CONSTRAINT "FK_a7e38427baabe6104e8a837cf85" FOREIGN KEY ("saleId") REFERENCES "Sales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Sales" ADD CONSTRAINT "FK_943905f112f5609938e9f8d3635" FOREIGN KEY ("customerId") REFERENCES "Customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Reviews" ADD CONSTRAINT "FK_f37dc346e78132bbe1b79076bf2" FOREIGN KEY ("saleId") REFERENCES "Sales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cooperativeMembers" ADD CONSTRAINT "FK_e25db8738ec7ba491f4e800e615" FOREIGN KEY ("cooperativeId") REFERENCES "Cooperatives"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
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
      `ALTER TABLE "cooperativeMembers" DROP CONSTRAINT "FK_e25db8738ec7ba491f4e800e615"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Reviews" DROP CONSTRAINT "FK_f37dc346e78132bbe1b79076bf2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Sales" DROP CONSTRAINT "FK_943905f112f5609938e9f8d3635"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Checkouts" DROP CONSTRAINT "FK_a7e38427baabe6104e8a837cf85"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" DROP CONSTRAINT "FK_d7f7406d8fa5047242b6aca8e1f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" DROP CONSTRAINT "FK_4f79c8ec27b2ad76fa2cf572d75"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" DROP CONSTRAINT "FK_8c26b3de964f6e854a22b7e3293"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Batches" DROP CONSTRAINT "FK_6b066bac134b8d11dc0e9c82bfa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Customers" DROP CONSTRAINT "FK_8f2671e378010b12df958146b98"`,
    );
    await queryRunner.query(
      `ALTER TABLE "verifications" DROP CONSTRAINT "FK_e6a542673f9abc1f67e5f32abaf"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8f604f0bafbc2f2cc419129da7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d0eae7587be198241a7e8f3b9d"`,
    );
    await queryRunner.query(`DROP TABLE "products_ingredients_ingredients"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_88dcc148d532384790ab874c3d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9d63f7dd74d7df762563b41bd0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_01993ae76b293d3b866cc3a125"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_88dcc148d532384790ab874c3d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1a3e39f67189527c39099fe322"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_01993ae76b293d3b866cc3a125"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9d63f7dd74d7df762563b41bd0"`,
    );
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(
      `DROP TYPE "public"."audit_logs_performedbyrole_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."audit_logs_entitytype_enum"`);
    await queryRunner.query(`DROP TYPE "public"."audit_logs_actiontype_enum"`);
    await queryRunner.query(`DROP TABLE "cooperativeMembers"`);
    await queryRunner.query(`DROP TABLE "Cooperatives"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notification_read"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notification_topic"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notification_user_id"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_topic_enum"`);
    await queryRunner.query(`DROP TABLE "DailyReportLogs"`);
    await queryRunner.query(`DROP TABLE "Reviews"`);
    await queryRunner.query(`DROP TABLE "Sales"`);
    await queryRunner.query(`DROP TYPE "public"."Sales_paymentstatus_enum"`);
    await queryRunner.query(`DROP TYPE "public"."Sales_orderstatus_enum"`);
    await queryRunner.query(`DROP TABLE "Checkouts"`);
    await queryRunner.query(`DROP TABLE "Carts"`);
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
    await queryRunner.query(`DROP TABLE "Products"`);
    await queryRunner.query(`DROP TYPE "public"."Products_grade_enum"`);
    await queryRunner.query(`DROP TYPE "public"."Products_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."Products_category_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."Products_unitofmeasurement_enum"`,
    );
    await queryRunner.query(`DROP TABLE "Ingredients"`);
    await queryRunner.query(`DROP TABLE "Batches"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_customer_email"`);
    await queryRunner.query(`DROP TABLE "Customers"`);
    await queryRunner.query(`DROP TABLE "verifications"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
