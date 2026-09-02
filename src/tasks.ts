import { PRIO, STATUS } from "./constants";
import { normalize, persist, state } from "./state";
import { byId, dayDelta, esc, fmtDue, todayISO, uid } from "./util";
import type {
  ColorName, GroupBy, PriorityDef, Project, StatusDef, StatusId, Task, TaskGroup,
} from "./types";

/* ---------------- справочники ---------------- */

export function statusOf(id: StatusId): StatusDef {
  return byId(STATUS, id) ?? STATUS[0]!;
}

export function prioOf(id: string | null): PriorityDef | null {
  return byId(PRIO, id);
}

export function projectOf(id: string | null): Project | null {
  return byId(state.projects, id);
}

/* ---------------- выборки ---------------- */

export function allTasks(): Task[] {
  return Object.values(state.tasks);
}

/** Задачи текущего проекта (или все) — без учёта поиска и «показывать выполненные». */
export function scopedTasks(): Task[] {
  return allTasks().filter((t) => !state.ui.project || t.project === state.ui.project);
}

/** Что показываем в текущем представлении: проект + поиск + фильтр выполненных. */
export function visibleTasks(): Task[] {
  const query = state.ui.search.trim().toLowerCase();
  return scopedTasks()
    .filter((t) => {
      if (!state.ui.showDone && t.status === "done") return false;
      if (!query) return true;
      const hay = `${t.title} ${t.notes} ${t.tags.join(" ")}`.toLowerCase();
      return hay.includes(query);
    })
    .sort(sorter());
}

function sorter(): (a: Task, b: Task) => number {
  switch (state.ui.sort) {
    case "due":
      return (a, b) => {
        if (!a.due && !b.due) return a.order - b.order;
        if (!a.due) return 1;
        if (!b.due) return -1;
        return a.due < b.due ? -1 : a.due > b.due ? 1 : 0;
      };
    case "priority": {
      const rank: Record<string, number> = { high: 0, mid: 1, low: 2 };
      return (a, b) => {
        const x = a.priority ? rank[a.priority]! : 3;
        const y = b.priority ? rank[b.priority]! : 3;
        return x - y || a.order - b.order;
      };
    }
    case "title":
      return (a, b) => a.title.localeCompare(b.title, "ru");
    case "created":
      return (a, b) => b.created.localeCompare(a.created);
    default:
      return (a, b) => a.order - b.order;
  }
}

export function subProgress(t: Task): { done: number; total: number } | null {
  if (!t.subtasks.length) return null;
  return { done: t.subtasks.filter((s) => s.done).length, total: t.subtasks.length };
}

export function isOverdue(t: Task): boolean {
  return t.status !== "done" && !!t.due && t.due < todayISO();
}

/* ---------------- изменения ---------------- */

function nextOrder(): number {
  return allTasks().reduce((max, t) => Math.max(max, t.order), 0) + 100;
}

export function createTask(patch: Partial<Task> = {}): Task {
  const task = normalize({
    id: uid(),
    order: nextOrder(),
    created: new Date().toISOString(),
    ...patch,
  });
  if (state.ui.project && !task.project) task.project = state.ui.project;
  state.tasks[task.id] = task;
  persist();
  return task;
}

export function patchTask(id: string, patch: Partial<Task>): Task | null {
  const task = state.tasks[id];
  if (!task) return null;
  Object.assign(task, patch);
  if (patch.status === "done" && !task.doneAt) task.doneAt = new Date().toISOString();
  if (patch.status && patch.status !== "done") task.doneAt = null;
  persist();
  return task;
}

export function removeTask(id: string): void {
  delete state.tasks[id];
  if (state.ui.peek === id) state.ui.peek = null;
  persist();
}

export function duplicateTask(id: string): Task | null {
  const source = state.tasks[id];
  if (!source) return null;
  const copy: Task = {
    ...structuredClone(source),
    id: uid(),
    title: `${source.title} (копия)`,
    order: source.order + 50,
    created: new Date().toISOString(),
    doneAt: null,
  };
  copy.subtasks = copy.subtasks.map((s) => ({ ...s, id: uid() }));
  state.tasks[copy.id] = copy;
  persist();
  return copy;
}

export function toggleDone(id: string): void {
  const task = state.tasks[id];
  if (!task) return;
  patchTask(id, { status: task.status === "done" ? "todo" : "done" });
}

/* ---------------- группировка ---------------- */

export function groupTasks(list: Task[], mode: GroupBy, keepEmpty = false): TaskGroup[] {
  if (mode === "none") return [{ key: "__all__", items: list }];

  let groups: TaskGroup[] = [];
  if (mode === "status") {
    groups = STATUS.map((s) => ({
      key: `status:${s.id}`,
      chip: chipHTML(s.label, s.color),
      items: list.filter((t) => t.status === s.id),
    }));
  } else if (mode === "priority") {
    groups = PRIO.map((p) => ({
      key: `priority:${p.id}`,
      chip: prioChipHTML(p),
      items: list.filter((t) => t.priority === p.id),
    }));
    groups.push({
      key: "priority:",
      chip: chipHTML("Без приоритета", "gray"),
      items: list.filter((t) => !prioOf(t.priority)),
    });
  } else {
    groups = state.projects.map((p) => ({
      key: `project:${p.id}`,
      chip: chipHTML(p.name, p.color),
      items: list.filter((t) => t.project === p.id),
    }));
    groups.push({
      key: "project:",
      chip: chipHTML("Без проекта", "gray"),
      items: list.filter((t) => !projectOf(t.project)),
    });
  }
  return keepEmpty ? groups : groups.filter((g) => g.items.length > 0);
}

/** "status:done" → { status: "done" }: чем становится задача, попав в эту группу. */
export function patchFromGroupKey(key: string | undefined): Partial<Task> {
  if (!key || key === "__all__") return {};
  const at = key.indexOf(":");
  const field = key.slice(0, at);
  const value = key.slice(at + 1);
  if (field === "status") return { status: value as StatusId };
  if (field === "priority") return { priority: (value || null) as Task["priority"] };
  if (field === "project") return { project: value || null };
  return {};
}

/* ---------------- разметка ---------------- */

export function chipHTML(label: string, color: ColorName): string {
  return `<span class="chip" data-c="${color}">${esc(label)}</span>`;
}

function prioChipHTML(p: PriorityDef): string {
  return `<span class="chip" data-c="${p.color}"><i class="pdot"></i>${esc(p.label)}</span>`;
}

export function statusChip(id: StatusId): string {
  const s = statusOf(id);
  return chipHTML(s.label, s.color);
}

export function prioChip(id: string | null): string {
  const p = prioOf(id);
  return p ? prioChipHTML(p) : "";
}

export function projChip(id: string | null): string {
  const p = projectOf(id);
  return p ? chipHTML(p.name, p.color) : "";
}

export function dueHTML(t: Task): string {
  if (!t.due) return '<span class="due due-empty">—</span>';
  let cls = "due";
  if (t.status !== "done") {
    const delta = dayDelta(t.due);
    if (delta < 0) cls += " is-late";
    else if (delta === 0) cls += " is-today";
  }
  return `<span class="${cls}">${esc(fmtDue(t.due))}</span>`;
}

export const EMPTY_CHIP = '<span class="chip chip--ghost">—</span>';
