import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAvatarUrlToUser1766649542575 implements MigrationInterface {
  public name = "AddAvatarUrlToUser1766649542575";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "avatarUrl" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatarUrl"`);
  }
}
