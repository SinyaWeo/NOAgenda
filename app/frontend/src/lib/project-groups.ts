import type { Task } from './types';

export interface ProjectGroup {
	/** Null: personal tasks (outside any project). */
	projectId: number | null;
	name: string;
	tasks: Task[];
}

/**
 * The project a task belongs to: `projectId` as GET /tasks reports it (subtasks included), or for a
 * task loaded elsewhere its parent when that is one of the known projects.
 */
export function taskProjectId(task: Task, projectNames: Record<number, string>): number | null {
	if (task.projectId !== undefined) return task.projectId;
	return task.parentId != null && task.parentId in projectNames ? task.parentId : null;
}

/** Tasks in sections: personal tasks first, then by project name; each keeps the given order. */
export function groupByProject(tasks: Task[], projectNames: Record<number, string>): ProjectGroup[] {
	const groups = new Map<number | null, ProjectGroup>();
	for (const task of tasks) {
		const projectId = taskProjectId(task, projectNames);
		let group = groups.get(projectId);
		if (!group) {
			const name = projectId != null ? (projectNames[projectId] ?? `#${projectId}`) : '';
			group = { projectId, name, tasks: [] };
			groups.set(projectId, group);
		}
		group.tasks.push(task);
	}
	return [...groups.values()].sort((a, b) =>
		a.projectId == null ? -1 : b.projectId == null ? 1 : a.name.localeCompare(b.name)
	);
}
