import { MigrationInterface, QueryRunner } from "typeorm";

/** Step-up login: until when a session may make admin changes after re-entering the password. */
export class SessionStepUp1796000000000 implements MigrationInterface {
    name = 'SessionStepUp1796000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_sessions\` ADD \`elevatedUntil\` datetime NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_sessions\` DROP COLUMN \`elevatedUntil\``);
    }
}
