import { MigrationInterface, QueryRunner } from "typeorm";

/** The "default project" user setting is gone. */
export class DropDefaultProject1795600000000 implements MigrationInterface {
    name = 'DropDefaultProject1795600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`defaultProjectId\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`defaultProjectId\` int NULL`);
    }
}
