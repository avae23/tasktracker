import { bus } from "./bus";
import { persist, state } from "./state";
import { createTask, patchTask } from "./tasks";
import { fmtDateTime, uid } from "./util";
import type { Project, Task } from "./types";

/** Формат файла, который делает tools/sync-claude.mjs. */
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

interface SyncFile {
  kind: string;
  version: number;
  generatedAt: string;
  items: SyncItem[];
}

const PROJECT_NAME = "Claude Code";

function ensureProject(): Project {
  const existing = state.projects.find((p) => p.name === PROJECT_NAME);
  if (existing) return existing;
  const project: Project = { id: uid(), name: PROJECT_NAME, color: "purple" };
  state.projects.push(project);
  return project;
}

/** Человекочитаемая заметка: чем закончилась работа над проектом. */
function noteFor(item: SyncItem): string {
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

function findExisting(key: string): Task | undefined {
  return Object.values(state.tasks).find(
    (t) => t.source?.kind === "claude-code" && t.source.key === key,
  );
}

/**
 * Сливает выгрузку с текущими задачами: новые проекты добавляет, известные
 * обновляет. Ничего не удаляет и не трогает статус, срок и приоритет —
 * их вы расставляете сами, и перезапись затирала бы вашу работу.
 */
export function applySync(file: SyncFile): { added: number; updated: number } {
  const project = ensureProject();
  let added = 0;
  let updated = 0;

  file.items.forEach((item) => {
    const notes = noteFor(item);
    const existing = findExisting(item.key);
    if (existing) {
      patchTask(existing.id, { notes });
      updated++;
    } else {
      createTask({
        title: `Продолжить: ${item.title}`,
        notes,
        project: project.id,
        tags: ["claude code"],
        source: { kind: "claude-code", key: item.key },
      });
      added++;
    }
  });

  persist();
  return { added, updated };
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
      if (parsed?.kind !== "claude-code-sync" || !Array.isArray(parsed.items)) {
        window.alert(
          "Это не выгрузка из Claude Code.\n\nСначала выполните в папке проекта:\n  npm run sync:claude\n\nа затем выберите созданный claude-tasks.json.",
        );
        return;
      }

      const { added, updated } = applySync(parsed);
      bus.render();
      window.alert(
        added || updated
          ? `Готово. Добавлено: ${added}, обновлено: ${updated}.`
          : "В выгрузке нет проектов — похоже, сессий Claude Code пока нет.",
      );
    });
  });

  input.click();
}
