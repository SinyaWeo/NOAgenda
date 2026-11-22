import { MigrationInterface, QueryRunner } from "typeorm";

/** Calendar as another project view type. */
export class CalendarView1795400000000 implements MigrationInterface {
    name = 'CalendarView1795400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`project_views\` MODIFY \`viewType\` enum ('list', 'kanban', 'table', 'gantt', 'timeline', 'mindmap', 'calendar') NOT NULL DEFAULT 'list'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE \`project_views\` SET \`viewType\` = 'list' WHERE \`viewType\` = 'calendar'`);
        await queryRunner.query(`ALTER TABLE \`project_views\` MODIFY \`viewType\` enum ('list', 'kanban', 'table', 'gantt', 'timeline', 'mindmap') NOT NULL DEFAULT 'list'`);
    }
}
