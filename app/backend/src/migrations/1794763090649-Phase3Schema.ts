import { MigrationInterface, QueryRunner } from "typeorm";

export class Phase3Schema1794763090649 implements MigrationInterface {
    name = 'Phase3Schema1794763090649'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_48c0c32e6247a2de155baeaf98\` ON \`teams\``);
        await queryRunner.query(`DROP INDEX \`IDX_e4b67047e594990832918c86ca\` ON \`labels\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`termsAcceptedAt\` datetime NULL`);
        // NOTE: generated as DROP COLUMN + ADD COLUMN, which would delete all existing text.
        // MODIFY changes the type in place and keeps the data.
        await queryRunner.query(`ALTER TABLE \`nodes\` MODIFY \`description\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`comments\` MODIFY \`content\` text NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_806b1f38979406d2165dac1080\` ON \`teams\` (\`ownerId\`, \`name\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_148523c721272d4e6da6535155\` ON \`labels\` (\`createdBy\`, \`title\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_148523c721272d4e6da6535155\` ON \`labels\``);
        await queryRunner.query(`DROP INDEX \`IDX_806b1f38979406d2165dac1080\` ON \`teams\``);
        // Fails (instead of silently truncating) if any value is longer than 255 characters.
        await queryRunner.query(`ALTER TABLE \`comments\` MODIFY \`content\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`nodes\` MODIFY \`description\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`termsAcceptedAt\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_e4b67047e594990832918c86ca\` ON \`labels\` (\`title\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_48c0c32e6247a2de155baeaf98\` ON \`teams\` (\`name\`)`);
    }

}
