import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSalePaymentsTable1773397218669 implements MigrationInterface {
  public name = "AddSalePaymentsTable1773397218669";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."SalePayments_paymentmethod_enum" AS ENUM('paystack', 'bank_transfer', 'cash', 'mobile_money', 'cheque', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."SalePayments_status_enum" AS ENUM('pending', 'confirmed', 'failed', 'refunded')`,
    );
    await queryRunner.query(
      `CREATE TABLE "SalePayments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "amount" numeric(10,2) NOT NULL, "paymentMethod" "public"."SalePayments_paymentmethod_enum" NOT NULL DEFAULT 'other', "status" "public"."SalePayments_status_enum" NOT NULL DEFAULT 'pending', "reference" character varying, "note" text, "isCustomerInitiated" boolean NOT NULL DEFAULT false, "saleId" uuid NOT NULL, CONSTRAINT "PK_ea0e738a6f0ac7ad7d8ad3e7816" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '"2026-03-13T10:20:25.792Z"'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '"2026-03-13T10:20:25.792Z"'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."audit_logs_actiontype_enum" RENAME TO "audit_logs_actiontype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_actiontype_enum" AS ENUM('LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'CREATE', 'UPDATE', 'DELETE', 'ROLE_CHANGED', 'PERMISSION_CHANGED', 'STATUS_CHANGED', 'INVENTORY_ADJUSTED', 'BATCH_ASSIGNED', 'REPORT_EXPORTED', 'DATA_EXPORTED', 'GENERATE_INVOICE', 'GENERATE_RECEIPT', 'GENERATE_WAYBILL', 'SALE_CREATED', 'SALE_UPDATED', 'SALE_CANCELLED', 'ORDER_STATUS_UPDATED', 'PAYMENT_RECORDED', 'PAYMENT_STATUS_UPDATED', 'CONFIGURATION_CHANGED', 'SYSTEM_ACTION', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_DEACTIVATED', 'USER_ACTIVATED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "actionType" TYPE "public"."audit_logs_actiontype_enum" USING "actionType"::"text"::"public"."audit_logs_actiontype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."audit_logs_actiontype_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."audit_logs_entitytype_enum" RENAME TO "audit_logs_entitytype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_entitytype_enum" AS ENUM('USER', 'PRODUCT', 'BATCH', 'INVENTORY', 'SALE', 'CHECKOUT', 'CART', 'PAYMENT', 'COOPERATIVE', 'COOPERATIVE_MEMBER', 'CUSTOMER', 'REPORT', 'INVOICE', 'RECEIPT', 'WAYBILL', 'SYSTEM', 'CONFIGURATION', 'AUTHENTICATION')`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "entityType" TYPE "public"."audit_logs_entitytype_enum" USING "entityType"::"text"::"public"."audit_logs_entitytype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."audit_logs_entitytype_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "SalePayments" ADD CONSTRAINT "FK_70bde1c64b552a56ec06fae79bc" FOREIGN KEY ("saleId") REFERENCES "Sales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "SalePayments" DROP CONSTRAINT "FK_70bde1c64b552a56ec06fae79bc"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_entitytype_enum_old" AS ENUM('USER', 'PRODUCT', 'BATCH', 'INVENTORY', 'SALE', 'CHECKOUT', 'CART', 'COOPERATIVE', 'COOPERATIVE_MEMBER', 'CUSTOMER', 'REPORT', 'SYSTEM', 'CONFIGURATION', 'AUTHENTICATION')`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "entityType" TYPE "public"."audit_logs_entitytype_enum_old" USING "entityType"::"text"::"public"."audit_logs_entitytype_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."audit_logs_entitytype_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."audit_logs_entitytype_enum_old" RENAME TO "audit_logs_entitytype_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_actiontype_enum_old" AS ENUM('LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'CREATE', 'UPDATE', 'DELETE', 'ROLE_CHANGED', 'PERMISSION_CHANGED', 'STATUS_CHANGED', 'INVENTORY_ADJUSTED', 'BATCH_ASSIGNED', 'REPORT_EXPORTED', 'DATA_EXPORTED', 'SALE_CREATED', 'SALE_UPDATED', 'SALE_CANCELLED', 'CONFIGURATION_CHANGED', 'SYSTEM_ACTION', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_DEACTIVATED', 'USER_ACTIVATED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "actionType" TYPE "public"."audit_logs_actiontype_enum_old" USING "actionType"::"text"::"public"."audit_logs_actiontype_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."audit_logs_actiontype_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."audit_logs_actiontype_enum_old" RENAME TO "audit_logs_actiontype_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "updatedAt" SET DEFAULT '2026-03-08 12:06:14.315'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Carts" ALTER COLUMN "createdAt" SET DEFAULT '2026-03-08 12:06:14.315'`,
    );
    await queryRunner.query(`DROP TABLE "SalePayments"`);
    await queryRunner.query(`DROP TYPE "public"."SalePayments_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."SalePayments_paymentmethod_enum"`,
    );
  }
}
