/**
 * Fill the database with example data: 10 users, 3 teams, personal projects per user and shared
 * projects per team (with views, kanban buckets, tasks, labels and assignees).
 *
 *   npm run seed                 # no-op if the example users already exist
 *   npm run seed -- --reset      # delete the example users and everything they own, then seed again
 *
 * Needs the migrations applied. Refuses to run with NODE_ENV=production.
 */
import { EntityManager, In } from 'typeorm';
import dataSource from '../data-source';
import { hashPassword } from '../common/password';
import { User } from '../modules/user/user.entity';
import { UserRole } from '../modules/user/user-role.enum';
import { Team } from '../modules/team/team.entity';
import { TeamMember } from '../modules/team-member/team-member.entity';
import { Node, NodeStatus, NodeType } from '../modules/node/node.entity';
import { Permission, ProjectUser } from '../modules/project-user/project-user.entity';
import { ProjectTeam } from '../modules/project-team/project-team.entity';
import { ProjectView, ViewType } from '../modules/project-view/project-view.entity';
import { KanbanBucket } from '../modules/kanban-bucket/kanban-bucket.entity';
import { Label } from '../modules/label/label.entity';
import { TaskLabel } from '../modules/task-label/task-label.entity';
import { TaskAssignee } from '../modules/task-assignee/task-assignee.entity';

const PASSWORD = 'password123';
const DAY = 24 * 60 * 60 * 1000;

interface SeedUser {
  username: string;
  name: string;
  language: 'en' | 'cs';
  role?: UserRole;
}

const USERS: SeedUser[] = [
  { username: 'alice', name: 'Alice Novak', language: 'en', role: UserRole.ADMIN },
  { username: 'bob', name: 'Bob Svoboda', language: 'cs' },
  { username: 'carol', name: 'Carol Dvorak', language: 'en' },
  { username: 'dave', name: 'Dave Cerny', language: 'en' },
  { username: 'erin', name: 'Erin Prochazka', language: 'cs' },
  { username: 'frank', name: 'Frank Kral', language: 'en' },
  { username: 'grace', name: 'Grace Horak', language: 'en' },
  { username: 'heidi', name: 'Heidi Marek', language: 'cs' },
  { username: 'ivan', name: 'Ivan Pospisil', language: 'en' },
  { username: 'judy', name: 'Judy Kovar', language: 'en' },
];

interface SeedTeam {
  name: string;
  description: string;
  owner: string;
  members: string[];
  projects: { name: string; permission: Permission; kanban?: boolean }[];
}

const TEAMS: SeedTeam[] = [
  {
    name: 'Engineering',
    description: 'Product development and infrastructure',
    owner: 'alice',
    members: ['bob', 'carol', 'dave'],
    projects: [
      { name: 'Platform Rewrite', permission: Permission.WRITE, kanban: true },
      { name: 'CI/CD Improvements', permission: Permission.WRITE },
      { name: 'Engineering Handbook', permission: Permission.READ },
    ],
  },
  {
    name: 'Marketing',
    description: 'Campaigns, content and brand',
    owner: 'erin',
    members: ['frank', 'grace', 'bob'],
    projects: [
      { name: 'Spring Campaign', permission: Permission.WRITE, kanban: true },
      { name: 'Website Content', permission: Permission.WRITE },
      { name: 'Brand Guidelines', permission: Permission.READ },
    ],
  },
  {
    name: 'Operations',
    description: 'Office, finance and support',
    owner: 'ivan',
    members: ['heidi', 'judy', 'carol', 'frank'],
    projects: [
      { name: 'Quarterly Budget', permission: Permission.WRITE },
      { name: 'Support Backlog', permission: Permission.WRITE, kanban: true },
    ],
  },
];

const PERSONAL_PROJECTS = [
  'Home Renovation',
  'Learning Plan',
  'Side Project',
  'Travel Planning',
  'Fitness Goals',
  'Reading List',
  'Personal Finance',
  'Garden',
  'Career Development',
  'Weekly Review',
];

const TASK_TITLES = [
  'Define scope',
  'Draft outline',
  'Review with stakeholders',
  'Collect feedback',
  'Prepare first version',
  'Fix open issues',
  'Schedule follow-up',
  'Write documentation',
];

const LABELS = [
  { title: 'urgent', color: '#ef4444' },
  { title: 'idea', color: '#3b82f6' },
  { title: 'waiting', color: '#f59e0b' },
];

const STATUSES = [NodeStatus.OPEN, NodeStatus.IN_PROGRESS, NodeStatus.DONE];
const BUCKETS = ['To do', 'In progress', 'Done'];

/** Deletes the example users and what hangs off them (nodes use SET NULL on their owner, so go by node). */
async function removeSeedData(m: EntityManager): Promise<void> {
  const users = await m.find(User, { where: { username: In(USERS.map((u) => u.username)) } });
  if (!users.length) return;
  const ids = users.map((u) => u.id);
  const nodes = await m
    .createQueryBuilder(Node, 'n')
    .select('n.id', 'id')
    .where('n.ownerId IN (:...ids) OR n.createdBy IN (:...ids)', { ids })
    .getRawMany<{ id: number }>();
  const nodeIds = nodes.map((n) => n.id);
  if (nodeIds.length) {
    // Break parent links first so the delete order within the batch doesn't matter.
    await m.update(Node, { id: In(nodeIds) }, { parentId: null });
    await m.delete(Node, { id: In(nodeIds) });
  }
  await m.delete(User, { id: In(ids) });
}

async function seed(m: EntityManager): Promise<Record<string, number>> {
  const counts = { users: 0, teams: 0, projects: 0, tasks: 0, labels: 0 };
  const passwordHash = await hashPassword(PASSWORD);
  const now = new Date();

  const users = new Map<string, User>();
  for (const u of USERS) {
    const user = await m.save(
      m.create(User, {
        username: u.username,
        email: `${u.username}@example.test`,
        password: passwordHash,
        name: u.name,
        language: u.language,
        role: u.role ?? UserRole.USER,
        isEmailConfirmed: true,
        termsAcceptedAt: now,
      }),
    );
    users.set(u.username, user);
    counts.users++;
  }
  const userOf = (username: string): User => {
    const user = users.get(username);
    if (!user) throw new Error(`Unknown seed user ${username}`);
    return user;
  };

  const labelsByUser = new Map<string, Label[]>();
  for (const u of USERS) {
    const labels = await m.save(LABELS.map((l) => m.create(Label, { ...l, createdBy: userOf(u.username).id })));
    labelsByUser.set(u.username, labels);
    counts.labels += labels.length;
  }

  /** Creates a project with a view, optional kanban buckets and a handful of tasks. */
  async function createProject(
    owner: string,
    name: string,
    opts: { kanban?: boolean; archived?: boolean; assignees?: string[]; seedIndex: number },
  ): Promise<Node> {
    const ownerUser = userOf(owner);
    const project = await m.save(
      m.create(Node, { type: NodeType.PROJECT, name, ownerId: ownerUser.id, isArchived: opts.archived ?? false }),
    );
    counts.projects++;

    const view = await m.save(
      m.create(ProjectView, {
        title: opts.kanban ? 'Board' : 'List',
        viewType: opts.kanban ? ViewType.KANBAN : ViewType.LIST,
        project,
      }),
    );
    const buckets = opts.kanban
      ? await m.save(
          BUCKETS.map((title, position) =>
            m.create(KanbanBucket, { projectId: project.id, viewId: view.id, title, position }),
          ),
        )
      : [];

    const taskCount = 3 + (opts.seedIndex % 4);
    const labels = labelsByUser.get(owner) ?? [];
    for (let i = 0; i < taskCount; i++) {
      const status = STATUSES[(opts.seedIndex + i) % STATUSES.length];
      const task = await m.save(
        m.create(Node, {
          type: NodeType.TASK,
          title: TASK_TITLES[(opts.seedIndex + i) % TASK_TITLES.length],
          description: i % 2 === 0 ? `Example task ${i + 1} of "${name}".` : undefined,
          status,
          priority: (i % 5) + 1,
          position: (i + 1) * 1024,
          percentDone: status === NodeStatus.DONE ? 100 : status === NodeStatus.IN_PROGRESS ? 50 : 0,
          dueDate: new Date(now.getTime() + (((opts.seedIndex + i) % 21) - 5) * DAY),
          parentId: project.id,
          createdBy: ownerUser.id,
          bucketId: buckets.length ? buckets[STATUSES.indexOf(status)].id : undefined,
        }),
      );
      counts.tasks++;
      if (labels.length && i % 2 === 0) {
        await m.save(m.create(TaskLabel, { node: task, label: labels[i % labels.length] }));
      }
      const assignees = opts.assignees ?? [];
      if (assignees.length) {
        await m.save(m.create(TaskAssignee, { node: task, user: userOf(assignees[i % assignees.length]) }));
      }
    }
    return project;
  }

  // Personal projects: two per user; a few are archived or shared with a colleague.
  let index = 0;
  for (const [i, u] of USERS.entries()) {
    const names = [PERSONAL_PROJECTS[i], PERSONAL_PROJECTS[(i + 5) % PERSONAL_PROJECTS.length]];
    for (const [j, name] of names.entries()) {
      const project = await createProject(u.username, name, {
        kanban: j === 1,
        archived: i % 4 === 3 && j === 1,
        seedIndex: index++,
      });
      if (j === 0 && i % 3 === 0) {
        const colleague = userOf(USERS[(i + 1) % USERS.length].username);
        await m.save(
          m.create(ProjectUser, {
            project,
            user: colleague,
            permission: i % 2 === 0 ? Permission.WRITE : Permission.READ,
          }),
        );
      }
    }
  }

  // Teams and their shared projects.
  for (const t of TEAMS) {
    const owner = userOf(t.owner);
    const team = await m.save(m.create(Team, { name: t.name, description: t.description, ownerId: owner.id }));
    counts.teams++;
    const everyone = [t.owner, ...t.members];
    for (const username of everyone) {
      await m.save(m.create(TeamMember, { team, user: userOf(username) }));
    }
    for (const p of t.projects) {
      const project = await createProject(t.owner, p.name, {
        kanban: p.kanban,
        assignees: everyone,
        seedIndex: index++,
      });
      await m.save(m.create(ProjectTeam, { project, team, permission: p.permission }));
    }
  }

  return counts;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to seed example data with NODE_ENV=production.');
    process.exit(2);
  }
  const reset = process.argv.slice(2).includes('--reset');

  await dataSource.initialize();
  try {
    const existing = await dataSource.getRepository(User).count({
      where: [
        { username: In(USERS.map((u) => u.username)) },
        { email: In(USERS.map((u) => `${u.username}@example.test`)) },
      ],
    });
    if (existing && !reset) {
      console.log('Example users already exist; nothing to do. Use --reset to delete and re-create them.');
      return;
    }
    const counts = await dataSource.transaction(async (m) => {
      if (reset) await removeSeedData(m);
      return seed(m);
    });
    console.log(
      `Seeded ${counts.users} users, ${counts.teams} teams, ${counts.projects} projects, ${counts.tasks} tasks, ${counts.labels} labels.`,
    );
    console.log(
      `Sign in as any of: ${USERS.map((u) => u.username).join(', ')} (password: ${PASSWORD}; alice is an admin).`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
