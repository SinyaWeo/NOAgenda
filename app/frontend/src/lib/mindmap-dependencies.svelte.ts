import type { Connection, Edge } from '@xyflow/svelte';
import { userTimeZone } from '#lib/auth.svelte.js';
import {
	addDependency,
	EMPTY_DEPENDENCIES,
	linkProblem,
	loadDependencies,
	removeDependency,
	type DependencyData,
	type TaskDependency
} from '#lib/dependencies.js';
import { errMessage } from '#lib/errors.js';
import { spanOf, violated } from '#lib/gantt.js';
import { t } from '#lib/i18n/index.js';
import { canRemove, dependencyEdges, dependencyOfEdge, isDependencyEdge } from '#lib/mindmap.js';
import { showToast } from '#lib/toast.svelte.js';
import type { Node as AppNode } from '#lib/types.js';

/**
 * Dependencies on a mind map (the project tab and the all-projects page share this): loads them for the
 * tasks on the map, turns them into dashed arrows, and handles connecting (drag from a task's bottom dot
 * onto another task: that task now waits for it) and removing (select an arrow, then Delete or the button).
 *
 * `nodes` gives the loaded projects and tasks by id; `apply` receives the dependency edges whenever they
 * change, to put next to the tree edges.
 */
export class MindmapDependencies {
	data = $state<DependencyData>(EMPTY_DEPENDENCIES);
	/** Id of the selected dependency edge, if any. */
	selected = $state<string | null>(null);

	readonly #nodes: () => Map<number, AppNode>;
	readonly #apply: (edges: Edge[]) => void;

	constructor(nodes: () => Map<number, AppNode>, apply: (edges: Edge[]) => void) {
		this.#nodes = nodes;
		this.#apply = apply;
	}

	get selectedDependency(): TaskDependency | null {
		return this.selected ? dependencyOfEdge(this.selected, this.data) : null;
	}

	/** May the user remove the selected dependency? */
	get selectedRemovable(): boolean {
		const d = this.selectedDependency;
		return !!d && canRemove(d, new Set(this.data.editable));
	}

	label(d: TaskDependency): string {
		const byId = this.#nodes();
		return t('views.dependency.dependency', {
			from: byId.get(d.fromId)?.title ?? '',
			to: byId.get(d.toId)?.title ?? ''
		});
	}

	#taskIds(): number[] {
		return [...this.#nodes().values()].filter((n) => n.type === 'task').map((n) => n.id);
	}

	/** (Re)load the dependencies of the tasks on the map and redraw them. */
	async load(): Promise<void> {
		const ids = this.#taskIds();
		try {
			this.data = ids.length ? await loadDependencies(ids) : EMPTY_DEPENDENCIES;
		} catch (e: unknown) {
			showToast(errMessage(e, t('views.dependency.loadFailed')), 'error');
		}
		if (this.selected && !this.selectedDependency) this.selected = null;
		this.#apply(this.edges());
	}

	edges(): Edge[] {
		const byId = this.#nodes();
		const tz = userTimeZone();
		const span = (id: number) => {
			const n = byId.get(id);
			return n ? spanOf(n, tz) : null;
		};
		return dependencyEdges(this.data, new Set(this.#taskIds()), {
			broken: (d) => {
				const a = span(d.fromId);
				const b = span(d.toId);
				return !!a && !!b && violated(a, b);
			},
			label: (d) => this.label(d)
		});
	}

	/** Svelte Flow asks this while a connection is dragged: only valid targets light up. */
	isValidConnection = (c: Edge | Connection): boolean => {
		const byId = this.#nodes();
		const from = Number(c.source);
		const to = Number(c.target);
		return (
			byId.get(from)?.type === 'task' &&
			byId.get(to)?.type === 'task' &&
			this.data.editable.includes(from) &&
			linkProblem(this.data, from, to) === null
		);
	};

	/** A dropped connection: save it (Svelte Flow does not add the edge itself; `load` redraws). */
	onbeforeconnect = (c: Connection): false => {
		void this.connect(Number(c.source), Number(c.target));
		return false;
	};

	async connect(fromId: number, toId: number): Promise<void> {
		const byId = this.#nodes();
		const from = byId.get(fromId);
		if (from?.type !== 'task' || byId.get(toId)?.type !== 'task') {
			showToast(t('views.mindmap.linkTasksOnly'), 'info');
			return;
		}
		if (!this.data.editable.includes(fromId)) {
			showToast(t('views.mindmap.linkReadOnly', { title: from.title ?? '' }), 'error');
			return;
		}
		const problem = linkProblem(this.data, fromId, toId);
		if (problem) {
			showToast(t(problem), problem === 'views.dependency.linkCycle' ? 'error' : 'info');
			return;
		}
		try {
			await addDependency(fromId, toId);
			showToast(t('views.dependency.linked', { from: from.title ?? '', to: byId.get(toId)?.title ?? '' }));
		} catch (e: unknown) {
			showToast(errMessage(e, t('views.dependency.linkFailed')), 'error');
		}
		await this.load();
	}

	/** Delete key on selected edges: remove the dependencies among them; tree edges and nodes are never deleted here. */
	onbeforedelete = async ({ edges }: { nodes: unknown[]; edges: Edge[] }): Promise<boolean> => {
		const deps = edges
			.filter(isDependencyEdge)
			.map((e) => dependencyOfEdge(e.id, this.data))
			.filter((d): d is TaskDependency => d !== null);
		for (const d of deps) await this.remove(d, false);
		if (deps.length) await this.load();
		return false;
	};

	onselectionchange = ({ edges }: { edges: Edge[] }): void => {
		this.selected = edges.find(isDependencyEdge)?.id ?? null;
	};

	async remove(d: TaskDependency, reload = true): Promise<void> {
		try {
			await removeDependency(d);
			this.selected = null;
			showToast(t('views.dependency.unlinked'));
		} catch (e: unknown) {
			showToast(errMessage(e, t('views.dependency.unlinkFailed')), 'error');
		}
		if (reload) await this.load();
	}
}
