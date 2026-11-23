import { MigrationInterface, QueryRunner } from "typeorm";

/** Saved titles and descriptions of nodes, so overwritten text can be restored. No foreign keys, like `activities`. */
export class NodeRevisions1795700000000 implements MigrationInterface {
    name = 'NodeRevisions1795700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`node_revisions\` (\`id\` int NOT NULL AUTO_INCREMENT, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`nodeId\` int NOT NULL, \`actorId\` int NULL, \`actorName\` varchar(100) NULL, \`title\` varchar(255) NULL, \`description\` text NULL, INDEX \`IDX_node_revisions_node\` (\`nodeId\`, \`id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`node_revisions\``);
    }
}
