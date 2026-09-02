import { bus } from "./bus";
import { replaceAll, snapshot, state } from "./state";
import { groupTasks, prioOf, projectOf, visibleTasks } from "./tasks";
import { flash } from "./ui/menu";
import { fmtDue, iso } from "./util";
import type { Snapshot } from "./types";

/** Список задач в Markdown — чтобы вставить в заметки или переписку. */
export function toMarkdown(): string {
  const lines: string[] = ["# Личный трекер задач", ""];

  groupTasks(visibleTasks(), "project").forEach((group) => {
    if (!group.items.length) return;
    const project = projectOf(group.key.slice("project:".length));
    lines.push(`## ${project ? project.name : "Без проекта"}`, "");

    group.items.forEach((t) => {
      const bits: string[] = [];
      if (t.due) bits.push(fmtDue(t.due));
      if (t.priority) bits.push(prioOf(t.priority)!.label.toLowerCase());
      if (t.status === "doing") bits.push("в работе");
      lines.push(`- [${t.status === "done" ? "x" : " "}] ${t.title}${bits.length ? `  _(${bits.join(", ")})_` : ""}`);
      t.subtasks.forEach((s) => {
        lines.push(`  - [${s.done ? "x" : " "}] ${s.text}`);
      });
    });
    lines.push("");
  });

  return lines.join("\n");
}

export function copyMarkdown(anchor: Element): void {
  const text = toMarkdown();
  const ok = (): void => flash(anchor, "Скопировано в буфер обмена");
  const fail = (): void => {
    console.log(text);
    flash(anchor, "Не удалось скопировать — текст в консоли");
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(ok, fail);
  } else {
    fail();
  }
}

/* ---------------- резервная копия ---------------- */

export function exportJSON(): void {
  const payload = JSON.stringify(snapshot(), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tasktracker-${iso(new Date())}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function importJSON(): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    void file.text().then((text) => {
      let parsed: Snapshot;
      try {
        parsed = JSON.parse(text) as Snapshot;
      } catch {
        window.alert("Не получилось прочитать файл: это не JSON.");
        return;
      }
      if (!parsed || typeof parsed !== "object" || typeof parsed.tasks !== "object") {
        window.alert("В файле нет задач — похоже, это копия из другого приложения.");
        return;
      }
      const count = Object.keys(parsed.tasks).length;
      const current = Object.keys(state.tasks).length;
      const confirmed = window.confirm(
        `Загрузить ${count} задач из копии? Текущие ${current} задач будут заменены.`,
      );
      if (!confirmed) return;
      replaceAll(parsed);
      state.ui.peek = null;
      bus.render();
    });
  });
  input.click();
}
