import type { IconName } from "./icons";

export type StatusId = "todo" | "doing" | "done";
export type PriorityId = "high" | "mid" | "low";
export type ColorName =
  | "gray" | "brown" | "orange" | "yellow" | "green"
  | "blue" | "purple" | "pink" | "red";

export type ViewId = "dash" | "today" | "table" | "board" | "calendar";
export type GroupBy = "none" | "status" | "project" | "priority";
export type SortBy = "manual" | "due" | "priority" | "title" | "created";

export interface Subtask {
  id: string;
  text: string;
  done: boolean;
}

/** Откуда задача приехала: нужно, чтобы повторная выгрузка обновляла, а не дублировала. */
export interface TaskSource {
  kind: "claude-code";
  key: string;
}

export interface Task {
  id: string;
  title: string;
  status: StatusId;
  priority: PriorityId | null;
  /** id проекта или null */
  project: string | null;
  /** срок в формате YYYY-MM-DD */
  due: string | null;
  tags: string[];
  notes: string;
  subtasks: Subtask[];
  /** позиция при ручной сортировке */
  order: number;
  /** ISO-время создания */
  created: string;
  /** ISO-время выполнения */
  doneAt: string | null;
  /** заполнено, если задача создана выгрузкой, а не руками */
  source?: TaskSource;
}

export interface Project {
  id: string;
  name: string;
  color: ColorName;
}

/** Всё, что сохраняется между сессиями. */
export interface Snapshot {
  tasks: Record<string, Task>;
  projects: Project[];
}

/** Настройки представления — живут отдельно от данных. */
export interface UIState {
  view: ViewId;
  /** активный фильтр по проекту */
  project: string | null;
  search: string;
  showDone: boolean;
  group: GroupBy;
  sort: SortBy;
  /** видимый месяц календаря, YYYY-MM */
  month: string;
  /** id открытой в панели задачи */
  peek: string | null;
  /** период дашборда в днях */
  period: number;
  /** какие карточки дашборда показаны таблицей */
  vtab: Record<string, boolean>;
}

export interface StatusDef {
  id: StatusId;
  label: string;
  color: ColorName;
}

export interface PriorityDef {
  id: PriorityId;
  label: string;
  color: ColorName;
}

export interface ViewDef {
  id: ViewId;
  label: string;
  icon: IconName;
}

/** Группа задач в таблице или колонка на доске. */
export interface TaskGroup {
  /** "status:done", "project:", "__all__" — ключ, из которого выводится patch */
  key: string;
  chip?: string;
  items: Task[];
}
