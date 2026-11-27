import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Two-factor authentication (TOTP). On `users`: the authenticator secret (encrypted at rest, see
 * common/secret-box.ts), when 2FA was switched on (null = off, or set up but not confirmed yet), the last
 * time step accepted (replay protection) and keyed hashes (HMAC, SecretBox.mac) of the unused recovery codes
 * (JSON array).
 * On `teams`: whether the team requires 2FA from its members.
 */
export class TwoFactorAuth1796800000000 implements MigrationInterface {
    name = 'TwoFactorAuth1796800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`totpSecret\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`totpEnabledAt\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`totpLastStep\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`totpRecoveryCodes\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`teams\` ADD \`requireMfa\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`teams\` DROP COLUMN \`requireMfa\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`totpRecoveryCodes\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`totpLastStep\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`totpEnabledAt\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`totpSecret\``);
    }
}
