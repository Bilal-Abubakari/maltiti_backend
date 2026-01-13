import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddGuestCheckoutSupport1768000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add sessionId column to Carts table for guest users
    await queryRunner.addColumn(
      "Carts",
      new TableColumn({
        name: "sessionId",
        type: "varchar",
        isNullable: true,
      }),
    );

    // Make userId nullable in Carts table to allow guest carts
    await queryRunner.changeColumn(
      "Carts",
      "userId",
      new TableColumn({
        name: "userId",
        type: "uuid",
        isNullable: true,
      }),
    );

    // Add guestEmail column to Checkouts table
    await queryRunner.addColumn(
      "Checkouts",
      new TableColumn({
        name: "guestEmail",
        type: "varchar",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove guestEmail column from Checkouts
    await queryRunner.dropColumn("Checkouts", "guestEmail");

    // Make userId non-nullable again in Carts table
    await queryRunner.changeColumn(
      "Carts",
      "userId",
      new TableColumn({
        name: "userId",
        type: "uuid",
        isNullable: false,
      }),
    );

    // Remove sessionId column from Carts
    await queryRunner.dropColumn("Carts", "sessionId");
  }
}
