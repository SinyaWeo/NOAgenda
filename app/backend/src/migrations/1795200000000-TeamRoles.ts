import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Team roles: every membership is a `member` or a `manager`. Each team's creator (ownerId) becomes
 * a manager. A team now outlives its creator, so ownerId is only a record and is set to NULL when
 * the user is deleted instead of deleting the team.
 */
export class TeamRoles1795200000000 implements MigrationInterface {
    name = 'TeamRoles1795200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`team_members\` ADD \`role\` enum ('member', 'manager') NOT NULL DEFAULT 'member'`);
        await queryRunner.query(`UPDATE \`team_members\` tm JOIN \`teams\` t ON t.id = tm.teamId AND t.ownerId = tm.userId SET tm.role = 'manager'`);
        await queryRunner.query(`INSERT INTO \`team_members\` (\`userId\`, \`teamId\`, \`role\`) SELECT t.ownerId, t.id, 'manager' FROM \`teams\` t WHERE t.ownerId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM \`team_members\` tm WHERE tm.teamId = t.id AND tm.userId = t.ownerId)`);
        await queryRunner.query(`ALTER TABLE \`teams\` DROP FOREIGN KEY \`FK_teams_ownerId\``);
        await queryRunner.query(`ALTER TABLE \`teams\` ADD CONSTRAINT \`FK_teams_ownerId\` FOREIGN KEY (\`ownerId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`teams\` DROP FOREIGN KEY \`FK_teams_ownerId\``);
        await queryRunner.query(`ALTER TABLE \`teams\` ADD CONSTRAINT \`FK_teams_ownerId\` FOREIGN KEY (\`ownerId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`team_members\` DROP COLUMN \`role\``);
    }
}
