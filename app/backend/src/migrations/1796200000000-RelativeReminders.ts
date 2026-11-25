import { MigrationInterface, QueryRunner } from "typeorm";

/** Reminders can be relative to the due date: N days before it, at a time of day (HH:MM). */
export class RelativeReminders1796200000000 implements MigrationInterface {
    name = 'RelativeReminders1796200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`task_reminders\` ADD \`daysBefore\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`task_reminders\` ADD \`atTime\` varchar(5) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`task_reminders\` DROP COLUMN \`atTime\``);
        await queryRunner.query(`ALTER TABLE \`task_reminders\` DROP COLUMN \`daysBefore\``);
    }
}
