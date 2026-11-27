import { MigrationInterface, QueryRunner } from "typeorm";

/** Repeating tasks can opt out of unticking their subtasks on each new cycle (on by default, as before). */
export class RepeatResetSubtasks1796400000000 implements MigrationInterface {
    name = 'RepeatResetSubtasks1796400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`nodes\` ADD \`repeatResetSubtasks\` tinyint NOT NULL DEFAULT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`nodes\` DROP COLUMN \`repeatResetSubtasks\``);
    }
}
