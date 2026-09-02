import { svg } from "../icons";
import type { IconName } from "../icons";
import { persist, state } from "../state";
import { chipHTML, dueHTML, prioChip, projChip, statusChip, statusOf, subProgress } from "../tasks";
import { $, esc, fmtDateTime, must, uid } from "../util";
import type { Task } from "../types";

const GHOST = '<span class="chip chip--ghost">Пусто</span>';

export function openPeek(id: string): void {
  state.ui.peek = id;
  renderPeek();
}

export function closePeek(): void {
  state.ui.peek = null;
  must("#peek").classList.remove("is-open");
  must("#scrim").classList.remove("is-open");
}

export function renderPeek(): void {
  const peek = must("#peek");
  const scrim = must("#scrim");
  const task = state.ui.peek ? state.tasks[state.ui.peek] : undefined;

  if (!task) {
    peek.classList.remove("is-open");
    scrim.classList.remove("is-open");
    return;
  }

  peek.innerHTML = peekHTML(task);
  peek.classList.add("is-open");
  scrim.classList.add("is-open");
  autoGrow($<HTMLTextAreaElement>(".peek-title", peek));
}

function peekHTML(t: Task): string {
  const progress = subProgress(t);

  let html =
    '<div class="peek-bar">' +
      `<button class="check${t.status === "done" ? " is-on" : ""}" data-act="check" aria-label="Готово">` +
        `${svg("check", 11)}</button>` +
      `<span class="due" style="color:var(--text-faint)">${esc(statusOf(t.status).label)}</span>` +
      '<span class="sp"></span>' +
      `<button class="icon-btn" data-act="dup" title="Дублировать">${svg("copy", 14)}</button>` +
      `<button class="icon-btn" data-act="del" title="Удалить">${svg("trash", 14)}</button>` +
      `<button class="icon-btn" data-act="close" title="Закрыть">${svg("x", 14)}</button>` +
    '</div><div class="peek-body">' +
      `<textarea class="peek-title" rows="1" data-act="title" data-fk="peektitle" placeholder="Без названия">${esc(t.title)}</textarea>` +
      '<div class="props">' +
        propRow("check", "Статус", `<button class="prop-v" data-act="status">${statusChip(t.status)}</button>`) +
        propRow("flag", "Приоритет", `<button class="prop-v" data-act="prio">${prioChip(t.priority) || GHOST}</button>`) +
        propRow("folder", "Проект", `<button class="prop-v" data-act="proj">${projChip(t.project) || GHOST}</button>`) +
        propRow("cal2", "Срок", `<button class="prop-v" data-act="due">${t.due ? dueHTML(t) : GHOST}</button>`) +
        propRow(
          "tag",
          "Теги",
          `<button class="prop-v" data-act="tags">${t.tags.map((x) => chipHTML(x, "gray")).join("") || GHOST}</button>`,
        ) +
      "</div>" +
      '<div class="divider"></div>' +
      '<div class="sub-head">' +
        `<span>Подзадачи${progress ? ` · ${progress.done}/${progress.total}` : ""}</span>` +
        `<button class="btn" data-act="add-sub" style="font-size:12px;padding:2px 7px">${svg("plus", 12)} Добавить</button>` +
      "</div>";

  t.subtasks.forEach((s) => {
    html +=
      `<div class="sub${s.done ? " is-done" : ""}" data-sid="${s.id}">` +
        `<button class="check${s.done ? " is-on" : ""}" data-act="sub-check" aria-label="Готово">${svg("check", 11)}</button>` +
        `<input type="text" data-act="sub-text" data-fk="sub:${s.id}" value="${esc(s.text)}" placeholder="Шаг">` +
        `<button class="sub-del" data-act="sub-del" aria-label="Удалить">${svg("x", 12)}</button>` +
      "</div>";
  });
  if (!t.subtasks.length) {
    html += '<div style="font-size:13px;color:var(--text-faint);padding:2px">Пока ни одного шага.</div>';
  }

  html +=
    '<div class="divider"></div>' +
    '<div class="sub-head"><span>Заметки</span></div>' +
    `<textarea class="notes" data-act="notes" data-fk="notes" placeholder="Что важно помнить об этой задаче…">${esc(t.notes)}</textarea>` +
    `<div class="peek-meta"><span>Создано ${esc(fmtDateTime(t.created))}</span>` +
    (t.doneAt ? `<span>Выполнено ${esc(fmtDateTime(t.doneAt))}</span>` : "") +
    "</div></div>";

  return html;
}

function propRow(icon: IconName, label: string, value: string): string {
  return `<div class="prop"><div class="prop-k">${svg(icon, 14)}${esc(label)}</div>${value}</div>`;
}

export function autoGrow(node: HTMLTextAreaElement | null): void {
  if (!node) return;
  node.style.height = "auto";
  node.style.height = `${node.scrollHeight}px`;
}

/* ---------------- подзадачи ---------------- */

export function addSubtask(): void {
  const task = state.ui.peek ? state.tasks[state.ui.peek] : undefined;
  if (!task) return;
  task.subtasks = [...task.subtasks, { id: uid(), text: "", done: false }];
  persist();
  renderPeek();
  const inputs = document.querySelectorAll<HTMLInputElement>(".peek .sub input");
  inputs[inputs.length - 1]?.focus();
}

export function toggleSubtask(sid: string): void {
  const task = state.ui.peek ? state.tasks[state.ui.peek] : undefined;
  if (!task) return;
  task.subtasks = task.subtasks.map((s) => (s.id === sid ? { ...s, done: !s.done } : s));
  persist();
  renderPeek();
}

export function removeSubtask(sid: string): void {
  const task = state.ui.peek ? state.tasks[state.ui.peek] : undefined;
  if (!task) return;
  task.subtasks = task.subtasks.filter((s) => s.id !== sid);
  persist();
  renderPeek();
}
