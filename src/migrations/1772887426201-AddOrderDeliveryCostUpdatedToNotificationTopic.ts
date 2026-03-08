import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderDeliveryCostUpdatedToNotificationTopic1772887426201
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the new enum value to the existing enum type
    await queryRunner.query(
      `ALTER TYPE "notifications_topic_enum" ADD VALUE 'ORDER_DELIVERY_COST_UPDATED';`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(_: QueryRunner): Promise<void> {
    // Note: PostgreSQL does not support removing enum values.
    // If rollback is needed, you may need to recreate the enum type without this value.
    // For now, leaving down empty as adding a value is generally safe.
  }
}
