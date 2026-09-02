import { state } from "../state";
import { svg } from "../icons";
import { chipHTML, dueHTML, groupTasks, prioChip, projChip, subProgress, visibleTasks } from "../tasks";
import { esc } from "../util";
import type { Task } from "../types";

export function renderBoard(): string {
  const mode = state.ui.group === "none" ? "status" : state.ui.group;
  const groups = groupTasks(visibleTasks(), mode, true);

  let html = '<div class="board">';
  groups.forEach((group) => {
    html +=
      `<div class="col" data-group="${esc(group.key)}">` +
        `<div class="col-head">${group.chip ?? ""}<span class="cnt">${group.items.length}</span></div>` +
        `<div class="col-body" data-group="${esc(group.key)}">` +
        group.items.map(cardHTML).join("") +
      "</div>" +
      `<button class="col-add" data-act="add-in-group" data-group="${esc(group.key)}">${svg("plus", 13)} Новая</button>` +
      "</div>";
  });
  return `${html}</div>`;
}

function cardHTML(t: Task): string {
  let meta = "";
  if (t.priority) meta += prioChip(t.priority);
  if (t.project && state.ui.group !== "project") meta += projChip(t.project);
  t.tags.slice(0, 3).forEach((tag) => {
    meta += chipHTML(tag, "gray");
  });

  const progress = subProgress(t);
  let foot = "";
  if (t.due) foot += dueHTML(t);
  if (progress) foot += `<span class="mini-prog">${svg("check", 11)}${progress.done}/${progress.total}</span>`;
  if (t.notes.trim()) foot += `<span title="Есть заметка">${svg("note", 11)}</span>`;

  return (
    `<div class="card${t.status === "done" ? " is-done" : ""}" data-id="${t.id}" draggable="true">` +
      `<div class="card-title">${esc(t.title || "Без названия")}</div>` +
      (meta ? `<div class="card-meta">${meta}</div>` : "") +
      (foot ? `<div class="card-foot">${foot}</div>` : "") +
    "</div>"
  );
}
