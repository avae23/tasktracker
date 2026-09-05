import { bus } from "./bus";
import { persist, state } from "./state";
import { createTask, patchTask } from "./tasks";
import { fmtDateTime, uid } from "./util";
import type { ColorName, Project, Task } from "./types";

/* ---------------- формат файла из tools/sync-claude.mjs ---------------- */

/** v1: по одной сводке на проект. */
interface SyncItem {
  key: string;
  title: string;
  path: string | null;
  branch: string | null;
  sessions: number;
  lastActivity: string;
  lastPrompt: string | null;
  recent: string[];
}

/** v2: эпик → задачи → подзадачи. */
interface SyncTask {
  key: string;
  title: string;
  status?: Task["status"];
  priority?: Task["priority"];
  tags?: string[];
  notes?: string;
  subtasks?: string[];
}

interface SyncEpic {
  key: string;
  name: string;
  color?: ColorName;
  tasks: SyncTask[];
}

interface SyncFile {
  kind: string;
  version: number;
  generatedAt?: string;
  items?: SyncItem[];
  epics?: SyncEpic[];
}

const DEFAULT_PROJECT = "Claude Code";

function ensureProject(name: string, color: ColorName): Project {
  const existing = state.projects.find((p) => p.name === name);
  if (existing) return existing;
  const project: Project = { id: uid(), name, color };
  state.projects.push(project);
  return project;
}

function findExisting(key: string): Task | undefined {
  return Object.values(state.tasks).find(
    (t) => t.source?.kind === "claude-code" && t.source.key === key,
  );
}

/** Человекочитаемая заметка для v1: чем закончилась работа над проектом. */
function noteForItem(item: SyncItem): string {
  const lines: string[] = [];
  if (item.lastPrompt) lines.push(`Остановились на: ${item.lastPrompt.trim()}`, "");
  const earlier = item.recent.slice(1);
  if (earlier.length) {
    lines.push("Перед этим:");
    earlier.forEach((p) => lines.push(`— ${p.replace(/\s+/g, " ").trim()}`));
    lines.push("");
  }
  if (item.path) lines.push(`Папка: ${item.path}`);
  if (item.branch) lines.push(`Ветка: ${item.branch}`);
  lines.push(`Сессий: ${item.sessions} · последняя ${fmtDateTime(item.lastActivity)}`);
  return lines.join("\n");
}

interface Result {
  added: number;
  updated: number;
  subtasksAdded: number;
}

/**
 * Сливает выгрузку с текущими задачами: новое добавляет, известное обновляет.
 * Ничего не удаляет и не трогает статус, срок и приоритет уже существующих
 * задач — их расставляет пользователь, и перезапись затирала бы его работу.
 */
export function applySync(file: SyncFile): Result {
  const result: Result = { added: 0, updated: 0, subtasksAdded: 0 };

  const upsert = (spec: SyncTask, projectId: string): void => {
    const existing = findExisting(spec.key);

    if (existing) {
      if (spec.notes) patchTask(existing.id, { notes: spec.notes });
      // подзадачи дописываем по тексту, чтобы повторный импорт не плодил копии
      const have = new Set(existing.subtasks.map((s) => s.text));
      const fresh = (spec.subtasks ?? []).filter((text) => !have.has(text));
      if (fresh.length) {
        existing.subtasks = [
          ...existing.subtasks,
          ...fresh.map((text) => ({ id: uid(), text, done: false })),
        ];
        result.subtasksAdded += fresh.length;
      }
      result.updated++;
      return;
    }

    createTask({
      title: spec.title,
      status: spec.status ?? "todo",
      priority: spec.priority ?? null,
      notes: spec.notes ?? "",
      tags: spec.tags ?? [],
      project: projectId,
      subtasks: (spec.subtasks ?? []).map((text) => ({ id: uid(), text, done: false })),
      source: { kind: "claude-code", key: spec.key },
    });
    result.added++;
    result.subtasksAdded += spec.subtasks?.length ?? 0;
  };

  if (file.epics?.length) {
    file.epics.forEach((epic) => {
      const project = ensureProject(epic.name, epic.color ?? "gray");
      epic.tasks.forEach((task) => upsert(task, project.id));
    });
  } else {
    const project = ensureProject(DEFAULT_PROJECT, "purple");
    (file.items ?? []).forEach((item) => {
      upsert(
        {
          key: item.key,
          title: `Продолжить: ${item.title}`,
          notes: noteForItem(item),
          tags: ["claude code"],
        },
        project.id,
      );
    });
  }

  persist();
  return result;
}

export function importClaudeSync(): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";

  input.addEventListener("change", () => {
    const selected = input.files?.[0];
    if (!selected) return;

    void selected.text().then((text) => {
      let parsed: SyncFile;
      try {
        parsed = JSON.parse(text) as SyncFile;
      } catch {
        window.alert("Файл не читается: это не JSON.");
        return;
      }
      if (parsed?.kind !== "claude-code-sync" || !(parsed.items || parsed.epics)) {
        window.alert(
          "Это не выгрузка из Claude Code.\n\nСначала выполните в папке проекта:\n  npm run sync:claude\n\nа затем выберите созданный claude-tasks.json.",
        );
        return;
      }

      const { added, updated, subtasksAdded } = applySync(parsed);
      bus.render();
      window.alert(
        added || updated
          ? `Готово.\nЗадач добавлено: ${added}\nОбновлено: ${updated}\nПодзадач добавлено: ${subtasksAdded}`
          : "В выгрузке нет задач.",
      );
    });
  });

  input.click();
}
