import { MigrationInterface, QueryRunner } from "typeorm";

/** Plain (non-unique) indexes for lookups that scan whole tables today. No data is changed. */
export class HotPathIndexes1794800000000 implements MigrationInterface {
    name = 'HotPathIndexes1794800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX \`IDX_nodes_ownerId\` ON \`nodes\` (\`ownerId\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_nodes_createdBy\` ON \`nodes\` (\`createdBy\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_kanban_buckets_projectId\` ON \`kanban_buckets\` (\`projectId\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_webhook_projectId\` ON \`webhook\` (\`projectId\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_webhook_userId\` ON \`webhook\` (\`userId\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_webhook_userId\` ON \`webhook\``);
        await queryRunner.query(`DROP INDEX \`IDX_webhook_projectId\` ON \`webhook\``);
        await queryRunner.query(`DROP INDEX \`IDX_kanban_buckets_projectId\` ON \`kanban_buckets\``);
        await queryRunner.query(`DROP INDEX \`IDX_nodes_createdBy\` ON \`nodes\``);
        await queryRunner.query(`DROP INDEX \`IDX_nodes_ownerId\` ON \`nodes\``);
    }

}
