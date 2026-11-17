import { MigrationInterface, QueryRunner } from "typeorm";

/** Admin-controlled account lock (separate from the temporary brute-force `lockedUntil`). */
export class AddUserIsLocked1795500000000 implements MigrationInterface {
    name = 'AddUserIsLocked1795500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        if (await queryRunner.hasColumn('users', 'isLocked')) return;
        await queryRunner.query("ALTER TABLE `users` ADD `isLocked` tinyint NOT NULL DEFAULT 0");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        if (!(await queryRunner.hasColumn('users', 'isLocked'))) return;
        await queryRunner.query("ALTER TABLE `users` DROP COLUMN `isLocked`");
    }
}
