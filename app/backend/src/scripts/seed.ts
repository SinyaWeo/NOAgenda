/**
 * Fill the database with example data: 10 users (1 admin, 3 team managers, 6 members), 3 teams, personal projects per user and shared
 * projects per team (with kanban buckets, tasks with start/due dates, labels, assignees, a few repeating tasks, task relations and
 * comments, reminders), plus per-user ideas (some tied to a project or shared with a team), dashboard quick notes, saved
 * filters and notifications that match the seeded assignments, comments, shares and reminders.
 *
 *   npm run seed                 # no-op if the example users already exist
 *   npm run seed -- --reset      # delete the example users and everything they own, then seed again
 *
 * Needs the migrations applied. Refuses to run with NODE_ENV=production unless ALLOW_DEMO_SEED=true
 * (the demo instance's nightly reset, docker/demo-reset.sh).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EntityManager, In } from 'typeorm';
import dataSource from '../data-source';
import { hashPassword } from '../common/password';
import { DEMO_PASSWORD, DEMO_USERS } from '../common/demo-users';
import { User } from '../modules/user/user.entity';
import { UserRole } from '../modules/user/user-role.enum';
import { Team } from '../modules/team/team.entity';
import { TeamMember, TeamRole } from '../modules/team-member/team-member.entity';
import { Node, NodeStatus, NodeType, RepeatMode } from '../modules/node/node.entity';
import { Permission, ProjectUser } from '../modules/project-user/project-user.entity';
import { ProjectTeam } from '../modules/project-team/project-team.entity';
import { KanbanBucket } from '../modules/kanban-bucket/kanban-bucket.entity';
import { Label } from '../modules/label/label.entity';
import { TaskLabel } from '../modules/task-label/task-label.entity';
import { TaskAssignee } from '../modules/task-assignee/task-assignee.entity';
import { RelationKind, TaskRelation } from '../modules/task-relation/task-relation.entity';
import { Comment } from '../modules/comment/comment.entity';
import { IdeaTeam } from '../modules/idea/idea-team.entity';
import { Note } from '../modules/note/note.entity';
import { SavedFilter } from '../modules/saved-filter/saved-filter.entity';
import type { FilterCriteriaDto } from '../modules/saved-filter/dto/filter-criteria.dto';
import { TaskReminder } from '../modules/task-reminder/task-reminder.entity';
import { Notification, type NotificationType } from '../modules/notification/notification.entity';
import { daysBeforeAt, safeTimeZone } from '../common/zoned-time';

const PASSWORD = DEMO_PASSWORD;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const USERS = DEMO_USERS;

interface SeedTeam {
  name: string;
  description: string;
  /** The team's manager (also recorded as its creator). */
  manager: string;
  members: string[];
  projects: { name: string; permission: Permission; kanban?: boolean }[];
}

const TEAMS: SeedTeam[] = [
  {
    name: 'Engineering',
    description: 'Product development and infrastructure',
    manager: 'bob',
    members: ['erin', 'frank'],
    projects: [
      { name: 'Platform Rewrite', permission: Permission.WRITE, kanban: true },
      { name: 'CI/CD Improvements', permission: Permission.WRITE },
      { name: 'Engineering Handbook', permission: Permission.READ },
    ],
  },
  {
    name: 'Marketing',
    description: 'Campaigns, content and brand',
    manager: 'carol',
    members: ['grace', 'heidi'],
    projects: [
      { name: 'Spring Campaign', permission: Permission.WRITE, kanban: true },
      { name: 'Website Content', permission: Permission.WRITE },
      { name: 'Brand Guidelines', permission: Permission.READ },
    ],
  },
  {
    name: 'Operations',
    description: 'Office, finance and support',
    manager: 'dave',
    members: ['ivan', 'judy'],
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

const SUBTASK_TITLES = [
  'Gather requirements',
  'Write a first draft',
  'Ask for a second opinion',
  'Update the plan',
  'Test the result',
  'Send a summary',
  'Archive old notes',
];

const LABELS = [
  { title: 'urgent', color: '#ef4444' },
  { title: 'idea', color: '#3b82f6' },
  { title: 'waiting', color: '#f59e0b' },
];

/** Private ideas; each user gets two (rotating through the list). */
const IDEAS = [
  'Try a no-meeting Wednesday and see if focus time improves.',
  'A short weekly digest email with what changed in my projects.',
  'Keyboard shortcuts cheat sheet as a printable one-pager.',
  'Group similar support requests into a FAQ page.',
  'Run a small survey before planning next quarter.',
  'Pair new colleagues with a buddy for their first month.',
  'Automate the monthly report instead of building it by hand.',
  'Dark mode screenshots for the website.',
  'Book the venue for the team offsite early this year.',
  'Collect quick wins in one list and do one every Friday.',
];

/** Ideas a team manager files under one of the team's projects and shares with the team. */
const TEAM_IDEAS: Record<string, string> = {
  Engineering: 'Move the slowest integration tests to a nightly job so CI stays under ten minutes.',
  Marketing: 'Reuse the best-performing campaign visuals in the newsletter header.',
  Operations: 'Tag support tickets by product area so we can see where most questions come from.',
};

const COMMENTS = [
  'I had a look at this, the first part is ready for review.',
  'Can we move the deadline by a couple of days? Waiting on input from the other team.',
  'Looks good to me 👍',
  'I added the notes from yesterday’s call to the description.',
  'Blocked until the dependency is done, see the related task.',
  'Picked this up, will update the progress by the end of the week.',
];

const QUICK_NOTES = [
  'Call the accountant about the invoice',
  'Reply to the newsletter feedback',
  'Order new notebooks',
  'Check the build on the release branch',
  'Prepare questions for the 1:1',
];

const SAVED_FILTERS: { name: string; description?: string; filters: FilterCriteriaDto }[] = [
  { name: 'Overdue', description: 'Open tasks past their due date', filters: { due: 'overdue', hideDone: true } },
  { name: 'This week', filters: { due: 'week', hideDone: true } },
  { name: 'Urgent work in progress', filters: { status: NodeStatus.IN_PROGRESS, priority: 4 } },
];

/** The notification texts per language, read from the backend locales (nest copies them next to the build). */
const NOTIFICATION_TEXT: Record<string, Record<string, string>> = Object.fromEntries(
  ['en', 'cs'].map((lang) => [
    lang,
    JSON.parse(readFileSync(join(__dirname, '..', 'i18n', 'locales', lang, 'notification.json'), 'utf8')) as Record<
      string,
      string
    >,
  ]),
);

const STATUSES = [NodeStatus.OPEN, NodeStatus.IN_PROGRESS, NodeStatus.DONE];
const DEFAULT_BUCKETS = ['To do', 'In progress', 'Done'];
const BUCKETS = ['Backlog', 'Doing', 'Shipped'];

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
  // Notifications keep their recipient without ON DELETE, so they have to go before the users.
  await m.createQueryBuilder().delete().from(Notification).where('userId IN (:...ids)', { ids }).execute();
  if (nodeIds.length) {
    // Break parent links first so the delete order within the batch doesn't matter.
    await m.update(Node, { id: In(nodeIds) }, { parentId: null });
    await m.delete(Node, { id: In(nodeIds) });
  }
  // Teams outlive their creator (ownerId is only SET NULL), so remove the example teams explicitly.
  await m.delete(Team, { ownerId: In(ids) });
  await m.delete(User, { id: In(ids) });
}

async function seed(m: EntityManager): Promise<Record<string, number>> {
  const counts = {
    users: 0,
    teams: 0,
    projects: 0,
    tasks: 0,
    labels: 0,
    relations: 0,
    comments: 0,
    ideas: 0,
    reminders: 0,
    notifications: 0,
  };
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

  /**
   * Stores a notification the way NotificationService.notify does (text in the recipient's language,
   * params for the UI), dated `hoursAgo` back; anything older than two days is already read.
   */
  async function notify(
    recipient: User,
    type: NotificationType,
    actor: User | null,
    node: Node,
    hoursAgo: number,
  ): Promise<void> {
    if (actor && actor.id === recipient.id) return;
    const kind = node.type === NodeType.PROJECT ? 'project' : 'task';
    const title = (kind === 'project' ? node.name : node.title) ?? '';
    const template = NOTIFICATION_TEXT[recipient.language ?? 'en']?.[type] ?? NOTIFICATION_TEXT.en[type];
    await m.save(
      m.create(Notification, {
        user: recipient,
        type,
        nodeId: node.id,
        message: template.replace('{actor}', actor?.username ?? '').replace('{title}', title),
        params: JSON.stringify({ actor: actor?.username ?? '', title, kind }),
        read: hoursAgo > 48,
        createdAt: new Date(now.getTime() - hoursAgo * HOUR),
      }),
    );
    counts.notifications++;
  }

  const labelsByUser = new Map<string, Label[]>();
  for (const u of USERS) {
    const labels = await m.save(LABELS.map((l) => m.create(Label, { ...l, createdBy: userOf(u.username).id })));
    labelsByUser.set(u.username, labels);
    counts.labels += labels.length;
  }

  /** Creates a project with its kanban buckets and a handful of tasks. */
  async function createProject(
    owner: string,
    name: string,
    opts: { kanban?: boolean; archived?: boolean; assignees?: string[]; seedIndex: number },
  ): Promise<{ project: Node; tasks: Node[] }> {
    const ownerUser = userOf(owner);
    const project = await m.save(
      m.create(Node, { type: NodeType.PROJECT, name, ownerId: ownerUser.id, isArchived: opts.archived ?? false }),
    );
    counts.projects++;

    // Every project has a bucket per status; "kanban" projects get a custom set of titles.
    const buckets = await m.save(
      STATUSES.map((status, position) =>
        m.create(KanbanBucket, {
          projectId: project.id,
          title: opts.kanban ? BUCKETS[position] : DEFAULT_BUCKETS[position],
          status,
          position,
        }),
      ),
    );

    /** Adds `count` child tasks under `parent`; the first one gets two children of its own when `deep`. */
    async function addSubtasks(
      parent: Node,
      count: number,
      assignee: string | undefined,
      deep: boolean,
    ): Promise<void> {
      for (let k = 0; k < count; k++) {
        const status = STATUSES[(parent.id + k) % STATUSES.length];
        const sub = await m.save(
          m.create(Node, {
            type: NodeType.TASK,
            title: SUBTASK_TITLES[(parent.id + k) % SUBTASK_TITLES.length],
            status,
            priority: ((parent.id + k) % 5) + 1,
            position: (k + 1) * 1024,
            percentDone: status === NodeStatus.DONE ? 100 : status === NodeStatus.IN_PROGRESS ? 50 : 0,
            startDate: parent.startDate,
            dueDate: parent.dueDate,
            parentId: parent.id,
            createdBy: ownerUser.id,
          }),
        );
        counts.tasks++;
        if (assignee) await m.save(m.create(TaskAssignee, { node: sub, user: userOf(assignee) }));
        if (deep && k === 0) await addSubtasks(sub, 2, assignee, false);
      }
    }

    const taskCount = 3 + (opts.seedIndex % 4);
    const labels = labelsByUser.get(owner) ?? [];
    const tasks: Node[] = [];
    for (let i = 0; i < taskCount; i++) {
      const status = STATUSES[(opts.seedIndex + i) % STATUSES.length];
      const dueDate = new Date(now.getTime() + (((opts.seedIndex + i) % 21) - 5) * DAY);
      // Every few projects the second task repeats (weekly, or at the end of each month).
      const repeat = i === 1 && opts.seedIndex % 3 === 0 && status !== NodeStatus.DONE;
      const task = await m.save(
        m.create(Node, {
          type: NodeType.TASK,
          title: TASK_TITLES[(opts.seedIndex + i) % TASK_TITLES.length],
          description: i % 2 === 0 ? `Example task ${i + 1} of "${name}".` : undefined,
          status,
          priority: (i % 5) + 1,
          position: (i + 1) * 1024,
          percentDone: status === NodeStatus.DONE ? 100 : status === NodeStatus.IN_PROGRESS ? 50 : 0,
          // A start date a few days before the due date, so the timeline shows real bars.
          startDate: new Date(dueDate.getTime() - (1 + ((opts.seedIndex + i) % 6)) * DAY),
          dueDate,
          repeatMode: repeat ? (opts.seedIndex % 2 === 0 ? RepeatMode.WEEKLY : RepeatMode.MONTH_END) : undefined,
          repeatAfter: repeat ? 1 : undefined,
          parentId: project.id,
          createdBy: ownerUser.id,
          bucketId: opts.kanban ? buckets[STATUSES.indexOf(status)].id : undefined,
        }),
      );
      counts.tasks++;
      tasks.push(task);
      if (labels.length && i % 2 === 0) {
        await m.save(m.create(TaskLabel, { node: task, label: labels[i % labels.length] }));
      }
      const assignees = opts.assignees ?? [];
      const assignee = assignees.length ? assignees[i % assignees.length] : undefined;
      if (assignee) {
        await m.save(m.create(TaskAssignee, { node: task, user: userOf(assignee) }));
        await notify(userOf(assignee), 'task_assigned', ownerUser, task, 2 + ((opts.seedIndex * 7 + i * 11) % 96));
      }
      // Every other task has subtasks (2-3 each); the first of those also shows a second level.
      if ((opts.seedIndex + i) % 2 === 0) {
        await addSubtasks(task, 2 + ((opts.seedIndex + i) % 2), assignee, i === 0 || i === 2);
      }
    }

    // Reminders set by the owner: one a day before an upcoming due date at 9:00, one at a fixed time the day
    // after tomorrow, and on every other project one that already went off for an overdue task.
    const open = tasks.filter((t) => t.status !== NodeStatus.DONE && t.dueDate);
    const upcoming = open.find((t) => (t.dueDate as Date).getTime() > now.getTime() + 2 * DAY);
    if (upcoming) {
      const at = daysBeforeAt(upcoming.dueDate as Date, 1, '09:00', safeTimeZone(ownerUser.timezone));
      if (at > now) await remind(upcoming, at, { daysBefore: 1, atTime: '09:00' });
    }
    const fixed = open.find((t) => t !== upcoming);
    if (fixed) {
      const at = new Date(now.getTime() + 2 * DAY);
      at.setUTCHours(10, 0, 0, 0);
      await remind(fixed, at);
    }
    const overdue = open.find((t) => (t.dueDate as Date).getTime() < now.getTime());
    if (overdue && opts.seedIndex % 2 === 0) {
      const at = new Date((overdue.dueDate as Date).getTime() - DAY);
      at.setUTCHours(9, 0, 0, 0);
      await remind(overdue, at, undefined, at);
      await notify(ownerUser, 'task_reminder', null, overdue, Math.max(1, (now.getTime() - at.getTime()) / HOUR));
    }

    async function remind(
      node: Node,
      reminderDate: Date,
      relative?: { daysBefore: number; atTime: string },
      sentAt?: Date,
    ): Promise<void> {
      await m.save(
        m.create(TaskReminder, {
          node,
          reminderDate,
          createdBy: ownerUser.id,
          daysBefore: relative?.daysBefore ?? null,
          atTime: relative?.atTime ?? null,
          sentAt: sentAt ?? null,
        }),
      );
      counts.reminders++;
    }

    // Relations between the project's tasks: the first blocks the second, the third is related to the
    // first, and in larger projects the fifth duplicates the fourth.
    await relate(tasks[0], tasks[1], RelationKind.BLOCKS);
    await relate(tasks[2], tasks[0], RelationKind.RELATED);
    if (tasks.length >= 5) await relate(tasks[4], tasks[3], RelationKind.DUPLICATE_OF);
    return { project, tasks };
  }

  async function relate(node: Node | undefined, relatedNode: Node | undefined, kind: RelationKind): Promise<void> {
    if (!node || !relatedNode) return;
    await m.save(m.create(TaskRelation, { node, relatedNode, kind }));
    counts.relations++;
  }

  async function createIdea(owner: string, text: string, projectId?: number): Promise<Node> {
    const idea = await m.save(
      m.create(Node, {
        type: NodeType.IDEA,
        description: text,
        createdBy: userOf(owner).id,
        parentId: projectId ?? null,
      }),
    );
    counts.ideas++;
    return idea;
  }

  // Personal projects: two per user; a few are archived or shared with a colleague.
  let index = 0;
  for (const [i, u] of USERS.entries()) {
    const names = [PERSONAL_PROJECTS[i], PERSONAL_PROJECTS[(i + 5) % PERSONAL_PROJECTS.length]];
    for (const [j, name] of names.entries()) {
      const { project } = await createProject(u.username, name, {
        kanban: j === 1,
        archived: i % 4 === 3 && j === 1,
        seedIndex: index++,
      });
      // The first idea of every other user is filed under their first project.
      if (j === 0) await createIdea(u.username, IDEAS[(i * 2) % IDEAS.length], i % 2 === 0 ? project.id : undefined);
      if (j === 0 && i % 3 === 0) {
        const colleague = userOf(USERS[(i + 1) % USERS.length].username);
        await notify(colleague, 'project_added', userOf(u.username), project, 20 + i * 3);
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
    const manager = userOf(t.manager);
    const team = await m.save(m.create(Team, { name: t.name, description: t.description, ownerId: manager.id }));
    counts.teams++;
    const everyone = [t.manager, ...t.members];
    for (const username of everyone) {
      const role = username === t.manager ? TeamRole.MANAGER : TeamRole.MEMBER;
      await m.save(m.create(TeamMember, { team, user: userOf(username), role }));
    }
    const teamProjects: { project: Node; tasks: Node[] }[] = [];
    for (const p of t.projects) {
      const created = await createProject(t.manager, p.name, {
        kanban: p.kanban,
        assignees: everyone,
        seedIndex: index++,
      });
      await m.save(m.create(ProjectTeam, { project: created.project, team, permission: p.permission }));
      teamProjects.push(created);
    }

    // A dependency across projects: the second project's first task waits on the first project's last task.
    await relate(teamProjects[0]?.tasks.at(-1), teamProjects[1]?.tasks[0], RelationKind.BLOCKS);

    // A short discussion on the first two tasks of each team project, which notifies the task's creator
    // (the manager) and its assignee (createProject assigns task i to everyone[i]).
    for (const [pi, { tasks }] of teamProjects.entries()) {
      for (const [ti, task] of tasks.slice(0, 2).entries()) {
        for (let c = 0; c < 2; c++) {
          const author = userOf(everyone[(pi + ti + c) % everyone.length]);
          const hoursAgo = 1 + ((pi * 5 + ti * 3 + (1 - c) * 2) % 30);
          await m.save(
            m.create(Comment, {
              node: task,
              author,
              content: COMMENTS[(pi * 2 + ti + c) % COMMENTS.length],
              createdAt: new Date(now.getTime() - hoursAgo * HOUR),
            }),
          );
          counts.comments++;
          for (const recipient of new Set([t.manager, everyone[ti % everyone.length]])) {
            await notify(userOf(recipient), 'task_comment', author, task, hoursAgo);
          }
        }
      }
    }

    // The manager files an idea under the team's first project and shares it with the team.
    const idea = await createIdea(t.manager, TEAM_IDEAS[t.name], teamProjects[0]?.project.id);
    await m.save(m.create(IdeaTeam, { idea, team }));
  }

  // A second private idea, quick notes on the dashboard (one already ticked off) and saved filters for everyone.
  for (const [i, u] of USERS.entries()) {
    const user = userOf(u.username);
    await createIdea(u.username, IDEAS[(i * 2 + 1) % IDEAS.length]);
    await m.save(
      [0, 1, 2].map((k) =>
        m.create(Note, {
          userId: user.id,
          text: QUICK_NOTES[(i + k) % QUICK_NOTES.length],
          done: k === 2,
          doneAt: k === 2 ? now : null,
          position: k + 1,
        }),
      ),
    );
    await m.save(SAVED_FILTERS.map((f) => m.create(SavedFilter, { ...f, userId: user.id })));
  }

  return counts;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
    console.error('Refusing to seed example data with NODE_ENV=production (set ALLOW_DEMO_SEED=true for the demo).');
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
      `Seeded ${counts.users} users, ${counts.teams} teams, ${counts.projects} projects, ${counts.tasks} tasks, ${counts.labels} labels, ` +
        `${counts.relations} task relations, ${counts.comments} comments, ${counts.ideas} ideas, ` +
        `${counts.reminders} reminders, ${counts.notifications} notifications.`,
    );
    console.log(
      `Sign in as any of: ${USERS.map((u) => u.username).join(', ')} (password: ${PASSWORD}). alice is the app admin; bob, carol and dave manage one team each.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
