import { MigrationInterface, QueryRunner } from "typeorm";

/** Delivery bookkeeping for webhooks: the latest result and a failure streak (too many switch the hook off). */
export class WebhookDelivery1795200000000 implements MigrationInterface {
    name = 'WebhookDelivery1795200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `webhook` ADD `lastStatus` int NULL, ADD `lastError` varchar(255) NULL, ADD `lastDeliveryAt` datetime NULL, ADD `failureCount` int NOT NULL DEFAULT 0");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `webhook` DROP COLUMN `failureCount`, DROP COLUMN `lastDeliveryAt`, DROP COLUMN `lastError`, DROP COLUMN `lastStatus`");
    }
}
