import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Projects and tasks live in the single `nodes` table. The old `projects` and `tasks` tables are
 * not mapped by any entity and nothing reads or writes them, so they are removed.
 *
 * They are only dropped when both are empty: if somebody did keep data in them, they are left alone
 * (and can be exported by hand) rather than destroyed by an automatic migration.
 */
export class DropLegacyTaskProjectTables1795400000000 implements MigrationInterface {
    name = 'DropLegacyTaskProjectTables1795400000000'

    private async count(queryRunner: QueryRunner, table: string): Promise<number | null> {
        if (!(await queryRunner.hasTable(table))) return null;
        const [row] = await queryRunner.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
        return Number(row.n);
    }

    public async up(queryRunner: QueryRunner): Promise<void> {
        const tasks = await this.count(queryRunner, 'tasks');
        const projects = await this.count(queryRunner, 'projects');
        if ((tasks ?? 0) > 0 || (projects ?? 0) > 0) {
            console.warn(`Legacy tables not dropped: tasks has ${tasks} row(s), projects has ${projects}.`);
            return;
        }
        if (tasks !== null) await queryRunner.query("DROP TABLE `tasks`"); // first: it holds the foreign key
        if (projects !== null) await queryRunner.query("DROP TABLE `projects`");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        if (!(await queryRunner.hasTable('projects'))) {
            await queryRunner.query("CREATE TABLE `projects` (`id` int NOT NULL AUTO_INCREMENT, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `name` varchar(255) NOT NULL, `description` varchar(255) NULL, `isArchived` tinyint NOT NULL DEFAULT 0, `ownerId` int NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB");
        }
        if (!(await queryRunner.hasTable('tasks'))) {
            await queryRunner.query("CREATE TABLE `tasks` (`id` int NOT NULL AUTO_INCREMENT, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `title` varchar(255) NOT NULL, `description` varchar(255) NULL, `status` enum ('open', 'in_progress', 'done') NOT NULL DEFAULT 'open', `dueDate` datetime NULL, `priority` int NULL, `position` double NULL, `repeatMode` enum ('default', 'monthly', 'from_current_date') NULL, `repeatAfter` int NULL, `startDate` datetime NULL, `percentDone` int NULL DEFAULT '0', `parentTaskId` int NULL, `createdBy` int NULL, `bucketId` int NULL, `projectId` int NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB");
            await queryRunner.query("ALTER TABLE `tasks` ADD CONSTRAINT `FK_e08fca67ca8966e6b9914bf2956` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        }
    }
}
