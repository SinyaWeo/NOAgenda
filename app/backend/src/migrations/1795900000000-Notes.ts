import { MigrationInterface, QueryRunner } from "typeorm";

/** Notes: private one-line dashboard notes that can be converted to a project, task or idea. */
export class Notes1795900000000 implements MigrationInterface {
    name = 'Notes1795900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`notes\` (\`id\` int NOT NULL AUTO_INCREMENT, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`userId\` int NOT NULL, \`text\` varchar(255) NOT NULL, \`done\` tinyint NOT NULL DEFAULT 0, \`doneAt\` datetime(6) NULL, \`position\` int NOT NULL DEFAULT 0, INDEX \`IDX_notes_user\` (\`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`notes\` ADD CONSTRAINT \`FK_notes_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`notes\` DROP FOREIGN KEY \`FK_notes_userId\``);
        await queryRunner.query(`DROP INDEX \`IDX_notes_user\` ON \`notes\``);
        await queryRunner.query(`DROP TABLE \`notes\``);
    }
}
