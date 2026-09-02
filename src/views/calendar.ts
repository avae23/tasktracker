import { DOW, MONTHS } from "../constants";
import { svg } from "../icons";
import { state } from "../state";
import { projectOf, visibleTasks } from "../tasks";
import { esc, iso, todayISO } from "../util";
import type { Task } from "../types";

export function renderCalendar(): string {
  const [year, month] = state.ui.month.split("-").map(Number) as [number, number];
  const monthIndex = month - 1;

  // сетка всегда начинается с понедельника
  const first = new Date(year, monthIndex, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, monthIndex, 1 - offset);

  const byDay = new Map<string, Task[]>();
  visibleTasks().forEach((t) => {
    if (!t.due) return;
    const bucket = byDay.get(t.due);
    if (bucket) bucket.push(t);
    else byDay.set(t.due, [t]);
  });

  const today = todayISO();

  let html =
    '<div class="cal-bar">' +
      `<div class="cal-month">${MONTHS[monthIndex]} ${year}</div>` +
      '<button class="icon-btn" data-act="cal-prev" aria-label="Предыдущий месяц" style="transform:rotate(180deg)">' +
        `${svg("chevR", 14)}</button>` +
      `<button class="icon-btn" data-act="cal-next" aria-label="Следующий месяц">${svg("chevR", 14)}</button>` +
      '<button class="btn" data-act="cal-today">Сегодня</button>' +
      '<span style="flex:1"></span>' +
      '<span style="font-size:12.5px;color:var(--text-faint)">Карточки можно перетаскивать между днями</span>' +
    "</div>";

  html += `<div class="cal"><div class="cal-dow">${DOW.map((d) => `<span>${d}</span>`).join("")}</div><div class="cal-grid">`;

  for (let i = 0; i < 42; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const key = iso(day);
    const outside = day.getMonth() !== monthIndex;
    const items = byDay.get(key) ?? [];

    html +=
      `<div class="day${outside ? " is-out" : ""}${key === today ? " is-today" : ""}" data-day="${key}">` +
        `<div class="day-num"><b>${day.getDate()}</b>` +
        `<button class="day-add" data-act="day-add" data-day="${key}" aria-label="Добавить задачу">+</button></div>`;

    items.slice(0, 4).forEach((t) => {
      const project = projectOf(t.project);
      const color = project ? project.color : t.status === "done" ? "green" : "gray";
      html +=
        `<div class="ev${t.status === "done" ? " is-done" : ""}" data-id="${t.id}" draggable="true">` +
          `<i class="ev-dot" style="color:var(--c-${color}-fg)"></i>` +
          `<span>${esc(t.title || "Без названия")}</span></div>`;
    });

    if (items.length > 4) {
      html += `<button class="ev-more" data-act="day-more" data-day="${key}">ещё ${items.length - 4}</button>`;
    }
    html += "</div>";
  }

  return `${html}</div></div>`;
}
