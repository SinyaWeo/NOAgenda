import { MigrationInterface, QueryRunner } from "typeorm";

/** Default quotes shown on the dashboard. Only inserted into an empty table so admin-managed quotes are never touched. */
const QUOTES = [
    "Each task done today means less pressure tomorrow.",
    "Finish today, breathe tomorrow.",
    "Do it now; stress less later.",
    "Today’s effort is tomorrow’s peace.",
    "Get ahead of the curve today so you aren't chasing your tail tomorrow.",
    "Don’t put off until tomorrow what you can do today.",
    "Your future self will thank you for getting this done today.",
    "Each task done is another step towards your goal.",
    "Every small win is progress toward the finish line.",
    "Task by task, goal by goal.",
    "Every task checked off is a step closer to the finish line.",
    "Each task is a building block for your ultimate goal.",
    "Consistency is just one task after another.",
    "Every task completed is a step closer to your goal.",
    "Clarity of thought leads to ease of action.",
    "Order the mind, and the rest will follow.",
    "Big goals are just small tasks with a plan.",
    "Map the chaos; find the path.",
    "Don't wait for inspiration; create it with action.",
    "The secret to getting ahead is getting started.",
    "Focus on the process, and the results will take care of themselves.",
    "Small gains, every day.",
    "Progress over perfection.",
    "One thing at a time.",
    "Keep it simple.",
    "Build the momentum.",
    "Make it happen.",
    "The journey of a thousand miles begins with a single task.",
    "Action is the foundational key to all success.",
    "Your mind is for having ideas, not holding them.",
];

export class SeedQuotes1795031700000 implements MigrationInterface {
    name = 'SeedQuotes1795031700000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const [{ count }] = await queryRunner.query('SELECT COUNT(*) AS count FROM `quotes`');
        if (Number(count) > 0) return;
        const placeholders = QUOTES.map(() => '(?)').join(', ');
        await queryRunner.query(`INSERT INTO \`quotes\` (\`text\`) VALUES ${placeholders}`, QUOTES);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const placeholders = QUOTES.map(() => '?').join(', ');
        await queryRunner.query(`DELETE FROM \`quotes\` WHERE \`text\` IN (${placeholders})`, QUOTES);
    }
}
