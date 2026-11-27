import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Plugins become built-in modules that register themselves by `key` (one row each, created on startup,
 * off by default). The old free-form rows did nothing and are removed. Users get their own settings per
 * plugin (e.g. where a notification channel delivers to), with secret fields encrypted at rest.
 */
export class PluginRegistry1796700000000 implements MigrationInterface {
    name = 'PluginRegistry1796700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM \`plugin\``);
        await queryRunner.query(`ALTER TABLE \`plugin\` ADD \`key\` varchar(64) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`plugin\` ADD UNIQUE INDEX \`UQ_plugin_key\` (\`key\`)`);
        await queryRunner.query(`ALTER TABLE \`plugin\` ALTER \`enabled\` SET DEFAULT 0`);
        await queryRunner.query(`CREATE TABLE \`user_plugin_settings\` (\`id\` int NOT NULL AUTO_INCREMENT, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`userId\` int NOT NULL, \`pluginKey\` varchar(64) NOT NULL, \`enabled\` tinyint NOT NULL DEFAULT 1, \`types\` varchar(255) NOT NULL DEFAULT '', \`settings\` text NULL, \`lastDeliveryAt\` datetime NULL, \`lastError\` varchar(255) NULL, UNIQUE INDEX \`UQ_user_plugin\` (\`userId\`, \`pluginKey\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`user_plugin_settings\` ADD CONSTRAINT \`FK_user_plugin_settings_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_plugin_settings\` DROP FOREIGN KEY \`FK_user_plugin_settings_userId\``);
        await queryRunner.query(`DROP TABLE \`user_plugin_settings\``);
        await queryRunner.query(`ALTER TABLE \`plugin\` ALTER \`enabled\` SET DEFAULT 1`);
        await queryRunner.query(`DROP INDEX \`UQ_plugin_key\` ON \`plugin\``);
        await queryRunner.query(`ALTER TABLE \`plugin\` DROP COLUMN \`key\``);
    }
}
