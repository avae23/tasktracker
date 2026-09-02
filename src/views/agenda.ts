import { svg } from "../icons";
import { chipHTML, dueHTML, prioChip, projChip, subProgress, visibleTasks } from "../tasks";
import { dayDelta, esc, todayISO } from "../util";
import { emptyHTML } from "./empty";
import type { Task } from "../types";

interface Bucket {
  key: string;
  title: string;
  test: (t: Task, today: string) => boolean;
}

const BUCKETS: Bucket[] = [
  { key: "late", title: "Просрочено", test: (t, today) => !!t.due && t.due < today && t.status !== "done" },
  { key: "today", title: "Сегодня", test: (t, today) => t.due === today },
  { key: "tomorrow", title: "Завтра", test: (t) => !!t.due && dayDelta(t.due) === 1 },
  {
    key: "week",
    title: "Ближайшие 7 дней",
    test: (t) => {
      if (!t.due) return false;
      const delta = dayDelta(t.due);
      return delta > 1 && delta <= 7;
    },
  },
  { key: "later", title: "Позже", test: (t) => !!t.due && dayDelta(t.due) > 7 },
  { key: "none", title: "Без срока", test: (t) => !t.due },
];

export function renderAgenda(): string {
  const today = todayISO();
  // выполненные показываем только за сегодня — иначе список превращается в архив
  const list = visibleTasks().filter((t) => t.status !== "done" || t.due === today);
  if (!list.length) return emptyHTML();

  const used = new Set<string>();
  let html = "";

  BUCKETS.forEach((bucket) => {
    const items = list.filter((t) => !used.has(t.id) && bucket.test(t, today));
    if (!items.length) return;
    items.forEach((t) => used.add(t.id));

    html += `<div class="sect"><div class="sect-head"><h3>${bucket.title}</h3><span class="cnt">${items.length}</span></div>`;
    items.forEach((t) => {
      let sub = "";
      if (t.priority) sub += prioChip(t.priority);
      if (t.project) sub += projChip(t.project);
      if (t.due && bucket.key !== "today") sub += dueHTML(t);
      t.tags.forEach((tag) => {
        sub += chipHTML(tag, "gray");
      });
      const progress = subProgress(t);
      if (progress) sub += `<span class="due">${progress.done}/${progress.total}</span>`;

      html +=
        `<div class="item${t.status === "done" ? " is-done" : ""}" data-id="${t.id}">` +
          `<button class="check${t.status === "done" ? " is-on" : ""}" data-act="check" aria-label="Готово">` +
            `${svg("check", 11)}</button>` +
          `<div class="item-main"><div class="item-title">${esc(t.title || "Без названия")}</div>` +
          (sub ? `<div class="item-sub">${sub}</div>` : "") +
          "</div>" +
          `<button class="icon-btn" data-act="menu" aria-label="Действия">${svg("dots", 14)}</button>` +
        "</div>";
    });
    html += "</div>";
  });

  return html || emptyHTML();
}
