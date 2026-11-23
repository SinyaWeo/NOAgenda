import { MigrationInterface, QueryRunner } from "typeorm";

/** Trash: deleting a node only sets `deletedAt` (and `deletedBy`); a timer removes it for good later. */
export class NodeTrash1795800000000 implements MigrationInterface {
    name = 'NodeTrash1795800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`nodes\` ADD \`deletedAt\` datetime(6) NULL, ADD \`deletedBy\` int NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_nodes_deletedAt\` ON \`nodes\` (\`deletedAt\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_nodes_deletedAt\` ON \`nodes\``);
        await queryRunner.query(`ALTER TABLE \`nodes\` DROP COLUMN \`deletedBy\`, DROP COLUMN \`deletedAt\``);
    }
}
