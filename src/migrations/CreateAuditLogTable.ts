import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateAuditLogTable1703420000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "audit_logs",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "actionType",
            type: "enum",
            enum: [
              "LOGIN",
              "LOGOUT",
              "LOGIN_FAILED",
              "PASSWORD_CHANGED",
              "PASSWORD_RESET",
              "CREATE",
              "UPDATE",
              "DELETE",
              "ROLE_CHANGED",
              "PERMISSION_CHANGED",
              "STATUS_CHANGED",
              "INVENTORY_ADJUSTED",
              "BATCH_ASSIGNED",
              "REPORT_EXPORTED",
              "DATA_EXPORTED",
              "SALE_CREATED",
              "SALE_UPDATED",
              "SALE_CANCELLED",
              "CONFIGURATION_CHANGED",
              "SYSTEM_ACTION",
              "USER_CREATED",
              "USER_UPDATED",
              "USER_DELETED",
              "USER_DEACTIVATED",
              "USER_ACTIVATED",
            ],
          },
          {
            name: "entityType",
            type: "enum",
            enum: [
              "USER",
              "PRODUCT",
              "BATCH",
              "INVENTORY",
              "SALE",
              "CHECKOUT",
              "CART",
              "COOPERATIVE",
              "COOPERATIVE_MEMBER",
              "CUSTOMER",
              "REPORT",
              "SYSTEM",
              "CONFIGURATION",
              "AUTHENTICATION",
            ],
          },
          {
            name: "entityId",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "description",
            type: "text",
          },
          {
            name: "performedByUserId",
            type: "varchar",
          },
          {
            name: "performedByUserName",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "performedByRole",
            type: "enum",
            enum: ["user", "admin", "superadmin"],
            isNullable: true,
          },
          {
            name: "ipAddress",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "userAgent",
            type: "text",
            isNullable: true,
          },
          {
            name: "timestamp",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "metadata",
            type: "json",
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes for better query performance
    await queryRunner.createIndex(
      "audit_logs",
      new TableIndex({
        name: "IDX_AUDIT_TIMESTAMP",
        columnNames: ["timestamp"],
      }),
    );

    await queryRunner.createIndex(
      "audit_logs",
      new TableIndex({
        name: "IDX_AUDIT_USER",
        columnNames: ["performedByUserId"],
      }),
    );

    await queryRunner.createIndex(
      "audit_logs",
      new TableIndex({
        name: "IDX_AUDIT_ACTION_TYPE",
        columnNames: ["actionType"],
      }),
    );

    await queryRunner.createIndex(
      "audit_logs",
      new TableIndex({
        name: "IDX_AUDIT_ENTITY_TYPE",
        columnNames: ["entityType"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("audit_logs");
  }
}
