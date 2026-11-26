import { MigrationInterface, QueryRunner } from "typeorm";

/** Favorites were removed from the app: drop their table (down recreates it empty). */
export class DropFavorites1796300000000 implements MigrationInterface {
    name = 'DropFavorites1796300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`favorites\` DROP FOREIGN KEY \`FK_e747534006c6e3c2f09939da60f\``);
        await queryRunner.query(`DROP INDEX \`UQ_favorites_user_entity\` ON \`favorites\``);
        await queryRunner.query(`DROP TABLE \`favorites\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`favorites\` (\`id\` int NOT NULL AUTO_INCREMENT, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`entityType\` enum ('project', 'task') NOT NULL, \`entityId\` int NOT NULL, \`userId\` int NOT NULL, UNIQUE INDEX \`UQ_favorites_user_entity\` (\`userId\`, \`entityType\`, \`entityId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`favorites\` ADD CONSTRAINT \`FK_e747534006c6e3c2f09939da60f\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }
}
