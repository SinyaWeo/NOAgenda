import { MigrationInterface, QueryRunner } from "typeorm";

/** System-generated notifications: what happened (type), what it is about (nodeId) and the text parameters. */
export class NotificationEvents1795000000000 implements MigrationInterface {
    name = 'NotificationEvents1795000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `notifications` ADD `type` varchar(40) NULL, ADD `nodeId` int NULL, ADD `params` text NULL");
        await queryRunner.query("ALTER TABLE `notifications` ADD CONSTRAINT `FK_notifications_nodeId` FOREIGN KEY (`nodeId`) REFERENCES `nodes`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `notifications` DROP FOREIGN KEY `FK_notifications_nodeId`");
        await queryRunner.query("ALTER TABLE `notifications` DROP COLUMN `params`, DROP COLUMN `nodeId`, DROP COLUMN `type`");
    }
}
