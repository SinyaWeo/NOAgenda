import { MigrationInterface, QueryRunner } from "typeorm";

/** The "week starts on" preference was stored but never used anywhere, so it is gone. */
export class RemoveWeekStart1795300000000 implements MigrationInterface {
    name = 'RemoveWeekStart1795300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `users` DROP COLUMN `weekStart`");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `users` ADD `weekStart` tinyint NULL DEFAULT '1'");
    }
}
