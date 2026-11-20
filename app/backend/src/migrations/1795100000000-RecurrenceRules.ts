import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Richer repeating tasks: weekday rules, "nth weekday" / month-end rules, end conditions
 * (until a date, or after N occurrences) and a history of completed cycles.
 */
export class RecurrenceRules1795100000000 implements MigrationInterface {
    name = 'RecurrenceRules1795100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`nodes\` MODIFY \`repeatMode\` enum ('default', 'monthly', 'from_current_date', 'weekly', 'monthly_weekday', 'month_end') NULL`);
        await queryRunner.query(`ALTER TABLE \`nodes\` ADD \`repeatWeekdays\` varchar(13) NULL`);
        await queryRunner.query(`ALTER TABLE \`nodes\` ADD \`repeatUntil\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`nodes\` ADD \`repeatCount\` int NULL`);
        await queryRunner.query(`CREATE TABLE \`task_completions\` (\`id\` int NOT NULL AUTO_INCREMENT, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`completedAt\` datetime NOT NULL, \`completedBy\` int NULL, \`dueDate\` datetime NULL, \`nodeId\` int NOT NULL, INDEX \`IDX_task_completions_node\` (\`nodeId\`, \`completedAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`task_completions\` ADD CONSTRAINT \`FK_4123f378520c69fe34e198e240b\` FOREIGN KEY (\`nodeId\`) REFERENCES \`nodes\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`task_completions\` ADD CONSTRAINT \`FK_task_completions_completedBy\` FOREIGN KEY (\`completedBy\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`task_completions\` DROP FOREIGN KEY \`FK_task_completions_completedBy\``);
        await queryRunner.query(`ALTER TABLE \`task_completions\` DROP FOREIGN KEY \`FK_4123f378520c69fe34e198e240b\``);
        await queryRunner.query(`DROP INDEX \`IDX_task_completions_node\` ON \`task_completions\``);
        await queryRunner.query(`DROP TABLE \`task_completions\``);
        await queryRunner.query(`ALTER TABLE \`nodes\` DROP COLUMN \`repeatCount\``);
        await queryRunner.query(`ALTER TABLE \`nodes\` DROP COLUMN \`repeatUntil\``);
        await queryRunner.query(`ALTER TABLE \`nodes\` DROP COLUMN \`repeatWeekdays\``);
        // Rows using the new modes cannot stay once the enum shrinks back.
        await queryRunner.query(`UPDATE \`nodes\` SET \`repeatMode\` = 'default' WHERE \`repeatMode\` IN ('weekly', 'monthly_weekday', 'month_end')`);
        await queryRunner.query(`ALTER TABLE \`nodes\` MODIFY \`repeatMode\` enum ('default', 'monthly', 'from_current_date') NULL`);
    }
}
