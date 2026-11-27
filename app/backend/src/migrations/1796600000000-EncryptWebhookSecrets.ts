import { MigrationInterface, QueryRunner } from "typeorm";
import { ENCRYPTED_COLUMNS, decryptColumn, reencryptColumn } from "../common/encrypted-columns";
import { secretBox } from "../common/secret-box";

/**
 * Webhook signing secrets are encrypted at rest (common/secret-box.ts). The column grows to TEXT, because
 * the encrypted form is longer than the 255 characters a secret may have, and every existing value is
 * encrypted with the current SECRETS_KEY. Running it again changes nothing.
 *
 * Rolling back does NOT quietly turn the secrets into plain text again: it refuses unless
 * SECRETS_ROLLBACK_DECRYPT=true is set, the explicit "yes, write them back in clear" switch.
 */
export class EncryptWebhookSecrets1796600000000 implements MigrationInterface {
    name = 'EncryptWebhookSecrets1796600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`webhook\` MODIFY \`secret\` text NULL`);
        // The key is only needed when there is something to encrypt: a fresh database (CI, a new install)
        // must migrate even where SECRETS_KEY is not set yet (the backend itself refuses to start without it).
        const [{ n }] = await queryRunner.query(`SELECT COUNT(*) AS n FROM \`webhook\` WHERE \`secret\` IS NOT NULL AND \`secret\` <> ''`);
        if (Number(n) === 0) return;
        const col = ENCRYPTED_COLUMNS.find((c) => c.table === 'webhook' && c.column === 'secret')!;
        await reencryptColumn(queryRunner, col, secretBox());
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        if (process.env.SECRETS_ROLLBACK_DECRYPT !== 'true') {
            throw new Error(
                'Reverting EncryptWebhookSecrets would store webhook secrets as plain text again. ' +
                'Set SECRETS_ROLLBACK_DECRYPT=true to confirm that this is what you want.',
            );
        }
        const col = ENCRYPTED_COLUMNS.find((c) => c.table === 'webhook' && c.column === 'secret')!;
        const [{ k }] = await queryRunner.query(`SELECT COUNT(*) AS k FROM \`webhook\` WHERE \`secret\` LIKE 'enc:%'`);
        const n = Number(k) ? await decryptColumn(queryRunner, col, secretBox()) : 0;
        console.warn(`EncryptWebhookSecrets reverted: ${n} webhook secret(s) are plain text again.`);
        await queryRunner.query(`ALTER TABLE \`webhook\` MODIFY \`secret\` varchar(255) NULL`);
    }
}
