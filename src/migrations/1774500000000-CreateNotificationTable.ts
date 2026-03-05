import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateNotificationTable1774500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "notifications",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "userId",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "topic",
            type: "enum",
            enum: [
              "ORDER_CREATED",
              "ORDER_STATUS_UPDATED",
              "ORDER_CANCELLED",
              "ORDER_DELIVERED",
              "PAYMENT_RECEIVED",
              "PAYMENT_FAILED",
              "REFUND_PROCESSED",
              "PRODUCT_CREATED",
              "PRODUCT_PRICE_CHANGED",
              "PRODUCT_OUT_OF_STOCK",
              "PRODUCT_BACK_IN_STOCK",
              "USER_ACCOUNT_CREATED",
              "USER_EMAIL_VERIFIED",
              "USER_PASSWORD_RESET",
              "USER_PROFILE_UPDATED",
              "ADMIN_NEW_ORDER",
              "ADMIN_ORDER_CANCELLED",
              "ADMIN_CONTACT_FORM_SUBMITTED",
              "ADMIN_LOW_STOCK_ALERT",
              "REVIEW_SUBMITTED",
              "REVIEW_APPROVED",
              "REVIEW_REJECTED",
              "SYSTEM_MAINTENANCE",
              "SYSTEM_ANNOUNCEMENT",
            ],
            isNullable: false,
          },
          {
            name: "title",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "message",
            type: "text",
            isNullable: false,
          },
          {
            name: "link",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "payload",
            type: "jsonb",
            isNullable: false,
          },
          {
            name: "isRead",
            type: "boolean",
            default: false,
            isNullable: false,
          },
          {
            name: "readAt",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "createdAt",
            type: "timestamp",
            default: "now()",
            isNullable: false,
          },
          {
            name: "updatedAt",
            type: "timestamp",
            default: "now()",
            isNullable: false,
          },
          {
            name: "deletedAt",
            type: "timestamp",
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes for better query performance
    await queryRunner.createIndex(
      "notifications",
      new TableIndex({
        name: "IDX_notification_user_id",
        columnNames: ["userId"],
      }),
    );

    await queryRunner.createIndex(
      "notifications",
      new TableIndex({
        name: "IDX_notification_topic",
        columnNames: ["topic"],
      }),
    );

    await queryRunner.createIndex(
      "notifications",
      new TableIndex({
        name: "IDX_notification_read",
        columnNames: ["isRead"],
      }),
    );

    await queryRunner.createIndex(
      "notifications",
      new TableIndex({
        name: "IDX_notification_created_at",
        columnNames: ["createdAt"],
      }),
    );

    // Composite index for common queries
    await queryRunner.createIndex(
      "notifications",
      new TableIndex({
        name: "IDX_notification_user_read_created",
        columnNames: ["userId", "isRead", "createdAt"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("notifications");
  }
}
