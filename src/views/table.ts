import { state } from "../state";
import { svg } from "../icons";
import { chipHTML, dueHTML, EMPTY_CHIP, groupTasks, prioChip, projChip, statusChip, visibleTasks } from "../tasks";
import { esc } from "../util";
import { emptyHTML } from "./empty";
import type { Task } from "../types";

export function renderTable(): string {
  const list = visibleTasks();
  if (!list.length) return emptyHTML();

  const groups = groupTasks(list, state.ui.group);
  let html = '<div class="tbl-wrap">';

  groups.forEach((group, index) => {
    if (group.key !== "__all__") {
      html += `<div class="group-head">${group.chip ?? ""}<span class="cnt">${group.items.length}</span></div>`;
    }
    html += '<table class="tbl">';
    if (index === 0) {
      html +=
        "<thead><tr>" +
        '<th class="c-title">Задача</th><th class="c-status">Статус</th><th class="c-prio">Приоритет</th>' +
        '<th class="c-proj">Проект</th><th class="c-due">Срок</th><th class="c-tags">Теги</th><th class="c-act"></th>' +
        "</tr></thead>";
    }
    html += `<tbody data-group="${esc(group.key)}">`;
    group.items.forEach((task) => {
      html += rowHTML(task);
    });
    html += "</tbody></table>";
    html +=
      `<button class="add-row" data-act="add-in-group" data-group="${esc(group.key)}">` +
      `${svg("plus", 13)} Новая задача</button>`;
  });

  return `${html}</div>`;
}

function rowHTML(t: Task): string {
  const done = t.status === "done";
  const tags = t.tags.map((tag) => chipHTML(tag, "gray")).join("");
  return (
    `<tr class="row${done ? " is-done" : ""}" data-id="${t.id}">` +
      '<td class="c-title"><div class="title-cell">' +
        `<span class="grip" data-act="drag" draggable="true">${svg("grip", 14)}</span>` +
        `<button class="check${done ? " is-on" : ""}" data-act="check" aria-label="Готово">${svg("check", 11)}</button>` +
        `<input class="t-input" data-act="title" data-fk="title:${t.id}" value="${esc(t.title)}" placeholder="Без названия">` +
        '<button class="open-btn" data-act="open">Открыть</button>' +
      "</div></td>" +
      `<td class="c-status"><button class="cell-btn" data-act="status">${statusChip(t.status)}</button></td>` +
      `<td class="c-prio"><button class="cell-btn" data-act="prio">${prioChip(t.priority) || EMPTY_CHIP}</button></td>` +
      `<td class="c-proj"><button class="cell-btn" data-act="proj">${projChip(t.project) || EMPTY_CHIP}</button></td>` +
      `<td class="c-due"><button class="cell-btn due-btn" data-act="due">${dueHTML(t)}</button></td>` +
      `<td class="c-tags"><button class="cell-btn" data-act="tags"><span class="tag-cell">${tags || EMPTY_CHIP}</span></button></td>` +
      `<td class="c-act"><button class="icon-btn" data-act="menu" aria-label="Действия">${svg("dots", 14)}</button></td>` +
    "</tr>"
  );
}
