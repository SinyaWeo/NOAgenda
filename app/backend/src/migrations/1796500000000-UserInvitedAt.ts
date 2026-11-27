import { MigrationInterface, QueryRunner } from "typeorm";

/** When an admin created the account and sent the activation invite (null for self-registered users). */
export class UserInvitedAt1796500000000 implements MigrationInterface {
    name = 'UserInvitedAt1796500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`invitedAt\` datetime NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`invitedAt\``);
    }
}
