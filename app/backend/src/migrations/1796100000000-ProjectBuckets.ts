import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Per-project views go away; Kanban buckets belong to the project and each stands for a task status.
 *
 * - A project with buckets in several views keeps those of its first view (lowest id).
 * - A bucket takes the status most of its tasks have (open when empty); tasks whose status differs leave it.
 * - Every project gets a bucket for each status it lacks, titled in its owner's language.
 *
 * down() restores the schema with one "Board" view per project holding all its buckets; the original
 * views and the dropped buckets are not coming back.
 */
export class ProjectBuckets1796100000000 implements MigrationInterface {
    name = 'ProjectBuckets1796100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`kanban_buckets\` ADD \`status\` enum ('open', 'in_progress', 'done') NOT NULL DEFAULT 'open'`);

        // Keep the buckets of each project's first view; tasks in the others lose their bucket (FK SET NULL).
        await queryRunner.query(`DELETE b FROM \`kanban_buckets\` b
            JOIN (SELECT \`projectId\`, MIN(\`viewId\`) AS keepView FROM \`kanban_buckets\` GROUP BY \`projectId\`) k ON k.\`projectId\` = b.\`projectId\`
            WHERE b.\`viewId\` <> k.keepView`);

        await queryRunner.query(`UPDATE \`kanban_buckets\` b SET b.\`status\` = COALESCE((
                SELECT n.\`status\` FROM \`nodes\` n
                 WHERE n.\`bucketId\` = b.\`id\` AND n.\`status\` IS NOT NULL AND n.\`deletedAt\` IS NULL
                 GROUP BY n.\`status\`
                 ORDER BY COUNT(*) DESC, FIELD(n.\`status\`, 'open', 'in_progress', 'done')
                 LIMIT 1), 'open')`);

        await queryRunner.query(`UPDATE \`nodes\` n JOIN \`kanban_buckets\` b ON b.\`id\` = n.\`bucketId\`
            SET n.\`bucketId\` = NULL WHERE n.\`status\` IS NULL OR n.\`status\` <> b.\`status\``);

        await queryRunner.query(`ALTER TABLE \`kanban_buckets\` DROP FOREIGN KEY \`FK_kanban_buckets_viewId\``);
        await queryRunner.query(`ALTER TABLE \`kanban_buckets\` DROP COLUMN \`viewId\``);
        await queryRunner.query(`DROP TABLE \`project_views\``);

        await queryRunner.query(`INSERT INTO \`kanban_buckets\` (\`projectId\`, \`title\`, \`status\`, \`position\`)
            SELECT p.\`id\`,
                   CASE WHEN u.\`language\` = 'cs' THEN s.cs ELSE s.en END,
                   s.st,
                   COALESCE((SELECT MAX(x.\`position\`) FROM \`kanban_buckets\` x WHERE x.\`projectId\` = p.\`id\`), -1) + s.ord
              FROM \`nodes\` p
             CROSS JOIN (
                   SELECT 'open' AS st, 1 AS ord, 'To do' AS en, 'K řešení' AS cs
                   UNION ALL SELECT 'in_progress', 2, 'In progress', 'Rozpracováno'
                   UNION ALL SELECT 'done', 3, 'Done', 'Hotovo') s
              LEFT JOIN \`users\` u ON u.\`id\` = p.\`ownerId\`
             WHERE p.\`type\` = 'project'
               AND NOT EXISTS (SELECT 1 FROM \`kanban_buckets\` b WHERE b.\`projectId\` = p.\`id\` AND b.\`status\` = s.st)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`project_views\` (\`id\` int NOT NULL AUTO_INCREMENT, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`title\` varchar(255) NOT NULL, \`viewType\` enum ('list', 'kanban', 'table', 'gantt', 'timeline', 'mindmap', 'calendar') NOT NULL DEFAULT 'list', \`projectId\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`project_views\` ADD CONSTRAINT \`FK_dd5cb737ca690f2ef3e206d4e65\` FOREIGN KEY (\`projectId\`) REFERENCES \`nodes\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`INSERT INTO \`project_views\` (\`title\`, \`viewType\`, \`projectId\`)
            SELECT DISTINCT 'Board', 'kanban', \`projectId\` FROM \`kanban_buckets\``);
        await queryRunner.query(`ALTER TABLE \`kanban_buckets\` ADD \`viewId\` int NULL`);
        await queryRunner.query(`UPDATE \`kanban_buckets\` b JOIN \`project_views\` v ON v.\`projectId\` = b.\`projectId\` SET b.\`viewId\` = v.\`id\``);
        await queryRunner.query(`ALTER TABLE \`kanban_buckets\` MODIFY \`viewId\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`kanban_buckets\` ADD CONSTRAINT \`FK_kanban_buckets_viewId\` FOREIGN KEY (\`viewId\`) REFERENCES \`project_views\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`kanban_buckets\` DROP COLUMN \`status\``);
    }
}
