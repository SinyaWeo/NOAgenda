import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Data integrity + new columns for API-token scopes and the upload quota.
 *
 * - api_tokens.scope ('read' | 'write'): existing tokens become 'write' so nothing breaks.
 * - attachments.size: bytes per upload for the per-user quota (old rows stay 0 = unknown).
 * - UNIQUE (parent, member) on the join tables. Duplicates are removed first, keeping the
 *   strongest permission (admin > write > read), then the lowest id.
 * - Foreign keys for the columns that held user / node ids without any constraint. Rows that
 *   point at something that no longer exists are cleaned up first (otherwise adding the key fails).
 * - team_members: removing a team or a user removes the membership (it used to block with a 409).
 */
export class Hardening1794900000000 implements MigrationInterface {
    name = 'Hardening1794900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const q = (sql: string) => queryRunner.query(sql);

        // ---- new columns
        await q("ALTER TABLE `api_tokens` ADD `scope` varchar(10) NOT NULL DEFAULT 'write'");
        await q("ALTER TABLE `attachments` ADD `size` int UNSIGNED NOT NULL DEFAULT 0");

        // ---- remove duplicates before the unique indexes
        const rank = (a: string) => `FIELD(${a}.permission, 'read', 'write', 'admin')`;
        for (const [table, c1, c2] of [['project_users', 'projectId', 'userId'], ['project_teams', 'projectId', 'teamId']]) {
            await q(`DELETE a FROM \`${table}\` a JOIN \`${table}\` b ON a.\`${c1}\` = b.\`${c1}\` AND a.\`${c2}\` = b.\`${c2}\` AND a.id <> b.id
                      WHERE ${rank('a')} < ${rank('b')} OR (a.permission = b.permission AND a.id > b.id)`);
        }
        for (const [table, cols] of [
            ['team_members', ['teamId', 'userId']],
            ['task_assignees', ['nodeId', 'userId']],
            ['task_labels', ['nodeId', 'labelId']],
            ['favorites', ['userId', 'entityType', 'entityId']],
            ['task_relations', ['nodeId', 'relatedNodeId', 'kind']],
        ] as [string, string[]][]) {
            const same = cols.map((c) => `a.\`${c}\` = b.\`${c}\``).join(' AND ');
            await q(`DELETE a FROM \`${table}\` a JOIN \`${table}\` b ON ${same} AND a.id > b.id`);
        }

        // ---- team membership follows its team / user
        await q("ALTER TABLE `team_members` DROP FOREIGN KEY `FK_6d1c8c7f705803f0711336a5c33`");
        await q("ALTER TABLE `team_members` DROP FOREIGN KEY `FK_0a72b849753a046462b4c5a8ec2`");
        await q("ALTER TABLE `team_members` ADD CONSTRAINT `FK_0a72b849753a046462b4c5a8ec2` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION");
        await q("ALTER TABLE `team_members` ADD CONSTRAINT `FK_6d1c8c7f705803f0711336a5c33` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION");

        // ---- orphans (rows pointing at things that no longer exist)
        await q("DELETE FROM `api_tokens` WHERE `userId` NOT IN (SELECT id FROM `users`)");
        await q("DELETE FROM `user_sessions` WHERE `userId` NOT IN (SELECT id FROM `users`)");
        await q("DELETE FROM `saved_filters` WHERE `userId` NOT IN (SELECT id FROM `users`)");
        await q("DELETE FROM `labels` WHERE `createdBy` IS NOT NULL AND `createdBy` NOT IN (SELECT id FROM `users`)");
        await q("DELETE FROM `teams` WHERE `ownerId` IS NOT NULL AND `ownerId` NOT IN (SELECT id FROM `users`)");
        await q("DELETE FROM `webhook` WHERE (`projectId` IS NOT NULL AND `projectId` NOT IN (SELECT id FROM `nodes`)) OR (`userId` IS NOT NULL AND `userId` NOT IN (SELECT id FROM `users`))");
        await q("DELETE FROM `kanban_buckets` WHERE `projectId` NOT IN (SELECT id FROM `nodes`) OR `viewId` NOT IN (SELECT id FROM `project_views`)");
        await q("UPDATE `nodes` SET `ownerId` = NULL WHERE `ownerId` IS NOT NULL AND `ownerId` NOT IN (SELECT id FROM `users`)");
        await q("UPDATE `nodes` SET `createdBy` = NULL WHERE `createdBy` IS NOT NULL AND `createdBy` NOT IN (SELECT id FROM `users`)");
        await q("UPDATE `nodes` SET `bucketId` = NULL WHERE `bucketId` IS NOT NULL AND `bucketId` NOT IN (SELECT id FROM `kanban_buckets`)");

        // ---- foreign keys
        const fk = (table: string, name: string, col: string, ref: string, onDelete: string) =>
            q(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`${name}\` FOREIGN KEY (\`${col}\`) REFERENCES \`${ref}\`(\`id\`) ON DELETE ${onDelete} ON UPDATE NO ACTION`);
        await fk('api_tokens', 'FK_api_tokens_userId', 'userId', 'users', 'CASCADE');
        await fk('user_sessions', 'FK_user_sessions_userId', 'userId', 'users', 'CASCADE');
        await fk('saved_filters', 'FK_saved_filters_userId', 'userId', 'users', 'CASCADE');
        await fk('labels', 'FK_labels_createdBy', 'createdBy', 'users', 'CASCADE');
        await fk('teams', 'FK_teams_ownerId', 'ownerId', 'users', 'CASCADE');
        await fk('webhook', 'FK_webhook_projectId', 'projectId', 'nodes', 'CASCADE');
        await fk('webhook', 'FK_webhook_userId', 'userId', 'users', 'CASCADE');
        await fk('kanban_buckets', 'FK_kanban_buckets_projectId', 'projectId', 'nodes', 'CASCADE');
        await fk('kanban_buckets', 'FK_kanban_buckets_viewId', 'viewId', 'project_views', 'CASCADE');
        await fk('nodes', 'FK_nodes_ownerId', 'ownerId', 'users', 'SET NULL');
        await fk('nodes', 'FK_nodes_createdBy', 'createdBy', 'users', 'SET NULL');
        await fk('nodes', 'FK_nodes_bucketId', 'bucketId', 'kanban_buckets', 'SET NULL');

        // ---- unique indexes
        await q("CREATE UNIQUE INDEX `UQ_project_users_project_user` ON `project_users` (`projectId`, `userId`)");
        await q("CREATE UNIQUE INDEX `UQ_project_teams_project_team` ON `project_teams` (`projectId`, `teamId`)");
        await q("CREATE UNIQUE INDEX `UQ_team_members_team_user` ON `team_members` (`teamId`, `userId`)");
        await q("CREATE UNIQUE INDEX `UQ_task_assignees_node_user` ON `task_assignees` (`nodeId`, `userId`)");
        await q("CREATE UNIQUE INDEX `UQ_task_labels_node_label` ON `task_labels` (`nodeId`, `labelId`)");
        await q("CREATE UNIQUE INDEX `UQ_favorites_user_entity` ON `favorites` (`userId`, `entityType`, `entityId`)");
        await q("CREATE UNIQUE INDEX `UQ_task_relations_pair_kind` ON `task_relations` (`nodeId`, `relatedNodeId`, `kind`)");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const q = (sql: string) => queryRunner.query(sql);
        // The unique indexes can be what InnoDB uses to satisfy a foreign key, so drop the keys first.
        for (const [table, name] of [
            ['nodes', 'FK_nodes_bucketId'], ['nodes', 'FK_nodes_createdBy'], ['nodes', 'FK_nodes_ownerId'],
            ['kanban_buckets', 'FK_kanban_buckets_viewId'], ['kanban_buckets', 'FK_kanban_buckets_projectId'],
            ['webhook', 'FK_webhook_userId'], ['webhook', 'FK_webhook_projectId'],
            ['teams', 'FK_teams_ownerId'], ['labels', 'FK_labels_createdBy'],
            ['saved_filters', 'FK_saved_filters_userId'], ['user_sessions', 'FK_user_sessions_userId'], ['api_tokens', 'FK_api_tokens_userId'],
        ]) await q(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${name}\``);

        await q("ALTER TABLE `team_members` DROP FOREIGN KEY `FK_6d1c8c7f705803f0711336a5c33`");
        await q("ALTER TABLE `team_members` DROP FOREIGN KEY `FK_0a72b849753a046462b4c5a8ec2`");
        // Each unique index also serves as the index of one existing foreign key (its first column),
        // so give that key a plain index before the unique one goes away.
        for (const [table, name, lead] of [
            ['task_relations', 'UQ_task_relations_pair_kind', 'nodeId'], ['favorites', 'UQ_favorites_user_entity', 'userId'],
            ['task_labels', 'UQ_task_labels_node_label', 'nodeId'], ['task_assignees', 'UQ_task_assignees_node_user', 'nodeId'],
            ['team_members', 'UQ_team_members_team_user', 'teamId'], ['project_teams', 'UQ_project_teams_project_team', 'projectId'],
            ['project_users', 'UQ_project_users_project_user', 'projectId'],
        ]) {
            await q(`CREATE INDEX \`IDX_${table}_${lead}\` ON \`${table}\` (\`${lead}\`)`);
            await q(`DROP INDEX \`${name}\` ON \`${table}\``);
        }
        await q("ALTER TABLE `team_members` ADD CONSTRAINT `FK_0a72b849753a046462b4c5a8ec2` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await q("ALTER TABLE `team_members` ADD CONSTRAINT `FK_6d1c8c7f705803f0711336a5c33` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");

        await q("ALTER TABLE `attachments` DROP COLUMN `size`");
        await q("ALTER TABLE `api_tokens` DROP COLUMN `scope`");
    }

}
