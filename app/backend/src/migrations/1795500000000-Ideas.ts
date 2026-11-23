import { MigrationInterface, QueryRunner } from "typeorm";

/** Ideas: a private node type, optionally shared (read-only) with teams. */
export class Ideas1795500000000 implements MigrationInterface {
    name = 'Ideas1795500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`nodes\` MODIFY \`type\` enum ('project', 'task', 'idea') NOT NULL`);
        await queryRunner.query(`CREATE TABLE \`idea_teams\` (\`id\` int NOT NULL AUTO_INCREMENT, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`ideaId\` int NOT NULL, \`teamId\` int NOT NULL, UNIQUE INDEX \`UQ_idea_teams_idea_team\` (\`ideaId\`, \`teamId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`idea_teams\` ADD CONSTRAINT \`FK_idea_teams_idea\` FOREIGN KEY (\`ideaId\`) REFERENCES \`nodes\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`idea_teams\` ADD CONSTRAINT \`FK_idea_teams_team\` FOREIGN KEY (\`teamId\`) REFERENCES \`teams\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`idea_teams\` DROP FOREIGN KEY \`FK_idea_teams_team\``);
        await queryRunner.query(`ALTER TABLE \`idea_teams\` DROP FOREIGN KEY \`FK_idea_teams_idea\``);
        await queryRunner.query(`DROP INDEX \`UQ_idea_teams_idea_team\` ON \`idea_teams\``);
        await queryRunner.query(`DROP TABLE \`idea_teams\``);
        await queryRunner.query(`DELETE FROM \`nodes\` WHERE \`type\` = 'idea'`);
        await queryRunner.query(`ALTER TABLE \`nodes\` MODIFY \`type\` enum ('project', 'task') NOT NULL`);
    }
}
