import { debounce, iso, todayISO, uid } from "./util";
import { localAdapter, loadUI, markSeeded, saveUI, wasSeeded } from "./storage";
import type { Project, Snapshot, Task, UIState } from "./types";

interface AppState {
  tasks: Record<string, Task>;
  projects: Project[];
  ui: UIState;
}

export const state: AppState = {
  tasks: {},
  projects: [],
  ui: {
    view: "dash",
    project: null,
    search: "",
    showDone: true,
    group: "status",
    sort: "manual",
    month: todayISO().slice(0, 7),
    peek: null,
    period: 14,
    vtab: {},
  },
};

export function snapshot(): Snapshot {
  return { tasks: state.tasks, projects: state.projects };
}

export const persist = debounce(() => {
  localAdapter.save(snapshot());
}, 180);

export const persistUI = debounce(() => {
  saveUI(state.ui);
}, 250);

/** Приводит любой объект к валидной задаче — на случай старых или битых данных. */
export function normalize(raw: Partial<Task> & { id: string }): Task {
  return {
    id: raw.id,
    title: raw.title ?? "",
    status: raw.status ?? "todo",
    priority: raw.priority ?? null,
    project: raw.project ?? null,
    due: raw.due ?? null,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    notes: raw.notes ?? "",
    subtasks: Array.isArray(raw.subtasks) ? raw.subtasks : [],
    order: typeof raw.order === "number" ? raw.order : 0,
    created: raw.created ?? new Date().toISOString(),
    doneAt: raw.doneAt ?? null,
    ...(raw.source ? { source: raw.source } : {}),
  };
}

export function replaceAll(next: Snapshot): void {
  const tasks: Record<string, Task> = {};
  for (const [id, task] of Object.entries(next.tasks ?? {})) {
    if (task && typeof task === "object") tasks[id] = normalize({ ...task, id });
  }
  state.tasks = tasks;
  state.projects = Array.isArray(next.projects) ? next.projects : [];
  localAdapter.save(snapshot());
}

export function boot(): void {
  const stored = localAdapter.load();
  if (stored) {
    replaceAll(stored);
  }

  const ui = loadUI();
  if (ui) {
    for (const [key, value] of Object.entries(ui)) {
      if (key === "peek") continue;
      (state.ui as unknown as Record<string, unknown>)[key] = value;
    }
  }
  if (!state.ui.month) state.ui.month = todayISO().slice(0, 7);
  if (!state.ui.vtab) state.ui.vtab = {};

  if (Object.keys(state.tasks).length === 0 && !wasSeeded()) {
    seed();
    markSeeded();
    localAdapter.save(snapshot());
  }
}

/* ---------------- демо-данные для первого запуска ---------------- */

type SeedRow = [
  title: string,
  status: Task["status"],
  priority: Task["priority"],
  project: string | null,
  due: string | null,
  tags: string[],
  notes: string,
  subtasks: Array<[string, boolean]>,
  doneDaysAgo?: number,
];

export function seed(): void {
  const shift = (n: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return iso(d);
  };

  state.projects = [
    { id: "p1", name: "Работа", color: "blue" },
    { id: "p2", name: "Учёба", color: "purple" },
    { id: "p3", name: "Дом", color: "orange" },
    { id: "p4", name: "Здоровье", color: "green" },
  ];

  const rows: SeedRow[] = [
    ["Собрать отчёт по итогам августа", "doing", "high", "p1", shift(1), ["отчёт", "квартал"],
      "Свести цифры из таблицы расходов, добавить график по неделям и короткое резюме на первой странице.",
      [["Выгрузить данные", true], ["Построить графики", false], ["Написать резюме", false]]],
    ["Ответить на письма из «Отложенных»", "todo", "mid", "p1", shift(0), ["почта"], "", []],
    ["Подготовить план на неделю", "done", "mid", null, shift(-1), ["рутина"], "", [], 1],
    ["Дочитать главу про индексы", "todo", "low", "p2", shift(3), ["чтение"],
      "Главы 7–8, законспектировать примеры с составными индексами.", []],
    ["Сдать домашку по статистике", "todo", "high", "p2", shift(2), ["дедлайн"], "",
      [["Задачи 1–5", false], ["Проверить формулы", false]]],
    ["Записаться к стоматологу", "todo", "mid", "p4", shift(-2), ["звонки"],
      "Клиника на Ленина, спросить про вечернее время.", []],
    ["Тренировка: ноги + спина", "doing", "low", "p4", shift(0), [], "", []],
    ["Купить фильтр для воды", "todo", "low", "p3", shift(5), ["покупки"], "", []],
    ["Разобрать шкаф в коридоре", "todo", "low", "p3", null, ["уборка"], "", []],
    ["Продлить подписку на хостинг", "todo", "high", "p1", shift(7), ["оплата"], "", []],
    ["Созвон с командой по релизу", "done", "mid", "p1", shift(-3), ["встречи"], "", [], 3],
    ["Выбрать подарок на день рождения", "todo", "mid", null, shift(4), ["личное"], "", []],
    ["Оплатить интернет и связь", "done", "low", "p3", shift(-2), ["оплата"], "", [], 2],
    ["Разобрать входящие в почте", "done", "mid", "p1", shift(-5), ["почта"], "", [], 5],
    ["Пробежка 5 км", "done", "low", "p4", shift(-6), [], "", [], 6],
    ["Конспект лекции по регрессии", "done", "mid", "p2", shift(-8), ["чтение"], "", [], 8],
    ["Забрать посылку с почты", "done", "low", "p3", shift(-9), [], "", [], 9],
    ["Сверить бюджет за июль", "done", "high", "p1", shift(-11), ["отчёт"], "", [], 11],
  ];

  const now = Date.now();
  state.tasks = {};
  rows.forEach((row, i) => {
    const [title, status, priority, project, due, tags, notes, subtasks, doneDaysAgo] = row;
    const id = uid();
    state.tasks[id] = {
      id,
      title,
      status,
      priority,
      project,
      due,
      tags,
      notes,
      subtasks: subtasks.map(([text, done]) => ({ id: uid(), text, done })),
      order: (i + 1) * 100,
      created: new Date(now - (rows.length - i) * 3_600_000).toISOString(),
      doneAt: status === "done" ? new Date(now - (doneDaysAgo ?? 1) * 86_400_000).toISOString() : null,
    };
  });
}
