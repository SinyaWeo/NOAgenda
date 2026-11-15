import { MigrationInterface, QueryRunner } from "typeorm";

export class AuthLifecycle1794761579815 implements MigrationInterface {
    name = 'AuthLifecycle1794761579815'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // API tokens used to be stored in plaintext and were never accepted for authentication.
        // They are now stored hashed (shown once at creation), so existing rows cannot be
        // converted and are removed; users create new ones.
        await queryRunner.query(`DELETE FROM \`api_tokens\``);
        await queryRunner.query(`CREATE TABLE \`email_verification_tokens\` (\`id\` int NOT NULL AUTO_INCREMENT, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`tokenHash\` varchar(64) NOT NULL, \`email\` varchar(255) NOT NULL, \`expiresAt\` datetime NOT NULL, \`userId\` int NOT NULL, UNIQUE INDEX \`IDX_90489f8f3368c45f461e90efbe\` (\`tokenHash\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`failedLoginAttempts\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`lockedUntil\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` ADD \`prevTokenHash\` varchar(64) NULL`);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` ADD \`lastUsedAt\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` ADD \`rotatedAt\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`api_tokens\` ADD \`tokenPrefix\` varchar(16) NULL`);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` DROP COLUMN \`tokenHash\``);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` ADD \`tokenHash\` varchar(64) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` ADD UNIQUE INDEX \`IDX_4b2714b01e2aafe885e7ec75ef\` (\`tokenHash\`)`);
        await queryRunner.query(`ALTER TABLE \`email_verification_tokens\` ADD CONSTRAINT \`FK_10f285d038feb767bf7c2da14b3\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`email_verification_tokens\` DROP FOREIGN KEY \`FK_10f285d038feb767bf7c2da14b3\``);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` DROP INDEX \`IDX_4b2714b01e2aafe885e7ec75ef\``);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` DROP COLUMN \`tokenHash\``);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` ADD \`tokenHash\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`api_tokens\` DROP COLUMN \`tokenPrefix\``);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` DROP COLUMN \`rotatedAt\``);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` DROP COLUMN \`lastUsedAt\``);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` DROP COLUMN \`prevTokenHash\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`lockedUntil\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`failedLoginAttempts\``);
        await queryRunner.query(`DROP INDEX \`IDX_90489f8f3368c45f461e90efbe\` ON \`email_verification_tokens\``);
        await queryRunner.query(`DROP TABLE \`email_verification_tokens\``);
    }

}
