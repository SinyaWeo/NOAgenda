import { MigrationInterface, QueryRunner } from "typeorm";

/** Reminders get an owner (who is reminded) and a sent marker so each one fires exactly once. */
export class ReminderDelivery1795100000000 implements MigrationInterface {
    name = 'ReminderDelivery1795100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `task_reminders` ADD `createdBy` int NULL, ADD `sentAt` datetime NULL");
        // Reminders that are already in the past were never delivered and must not all fire at once on upgrade.
        await queryRunner.query("UPDATE `task_reminders` SET `sentAt` = `reminderDate` WHERE `reminderDate` <= NOW()");
        await queryRunner.query("ALTER TABLE `task_reminders` ADD CONSTRAINT `FK_task_reminders_createdBy` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION");
        await queryRunner.query("CREATE INDEX `IDX_task_reminders_pending` ON `task_reminders` (`sentAt`, `reminderDate`)");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP INDEX `IDX_task_reminders_pending` ON `task_reminders`");
        await queryRunner.query("ALTER TABLE `task_reminders` DROP FOREIGN KEY `FK_task_reminders_createdBy`");
        await queryRunner.query("ALTER TABLE `task_reminders` DROP COLUMN `sentAt`, DROP COLUMN `createdBy`");
    }
}
