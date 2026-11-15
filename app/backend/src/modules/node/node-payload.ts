/**
 * The UI describes "inside this project / under this task" in a few legacy shapes
 * (`project: {id}`, `projectId`, `parentTask`, `parentTaskId`). Collapse them into
 * the single `parentId` the data model uses, and drop the legacy keys.
 */
export function normalizeParentRefs(data: Record<string, any>): any {
  const out: Record<string, any> = { ...data };
  if (out.parentId === undefined) {
    // If a client sends both, the parent task is the more specific location and wins
    // (a subtask's project is found by climbing the tree).
    if (out.parentTask?.id !== undefined) out.parentId = Number(out.parentTask.id);
    else if (out.parentTaskId !== undefined) out.parentId = Number(out.parentTaskId);
    else if (out.project?.id !== undefined) out.parentId = Number(out.project.id);
    else if (out.projectId !== undefined) out.parentId = Number(out.projectId);
  }
  delete out.project;
  delete out.projectId;
  delete out.parentTask;
  delete out.parentTaskId;
  return out;
}
