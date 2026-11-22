import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Activity log / audit trail. No foreign keys on purpose: an entry must survive the deletion of the
 * task, project or user it is about.
 */
export class Activity1795300000000 implements MigrationInterface {
    name = 'Activity1795300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`activities\` (\`id\` int NOT NULL AUTO_INCREMENT, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`nodeId\` int NOT NULL, \`projectId\` int NULL, \`actorId\` int NULL, \`actorName\` varchar(100) NULL, \`ownerId\` int NULL, \`nodeType\` varchar(20) NOT NULL, \`nodeTitle\` varchar(255) NULL, \`action\` varchar(50) NOT NULL, \`changes\` json NULL, INDEX \`IDX_activities_node\` (\`nodeId\`, \`id\`), INDEX \`IDX_activities_project\` (\`projectId\`, \`id\`), INDEX \`IDX_activities_owner\` (\`ownerId\`, \`id\`), INDEX \`IDX_activities_actor\` (\`actorId\`, \`id\`), INDEX \`IDX_activities_createdAt\` (\`createdAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`activities\``);
    }
}
