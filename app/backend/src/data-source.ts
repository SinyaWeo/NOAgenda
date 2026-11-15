/**
 * TypeORM DataSource used by the migration CLI (see the `migration:*` npm scripts).
 * The running app configures TypeORM separately in app.module.ts but shares the
 * same entity and migration locations.
 *
 * The CLI runs against the compiled output (dist/), so build first:
 *   npm run migration:generate -- src/migrations/<Name>
 *   npm run migration:run
 */
import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { join } from 'path';

config();

export default new DataSource({
  type: 'mariadb',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [join(__dirname, '**', '*.entity.{js,ts}')],
  migrations: [join(__dirname, 'migrations', '*.{js,ts}')],
});
