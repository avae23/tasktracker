import { PRIO, STATUS } from "../constants";
import { svg } from "../icons";
import { state } from "../state";
import { prioOf, projChip, projectOf, scopedTasks, statusChip } from "../tasks";
import { tipAttr } from "../ui/tooltip";
import {
  esc, fmtDue, fmtShortDay, iso, lastDays, localDay, plural, todayISO,
} from "../util";
import type { ColorName, PriorityId, StatusId, Task } from "../types";

/**
 * Цвета графиков живут отдельно от палитры чипов: они проверены валидатором
 * на различимость при дальтонизме и контраст к поверхности карточки.
 */
const STATUS_VIZ: Record<StatusId, string> = {
  todo: "var(--viz-todo)",
  doing: "var(--viz-doing)",
  done: "var(--viz-done)",
};

/** Порядковая шкала: чем выше приоритет, тем заметнее полоса. */
const PRIO_RAMP: Record<PriorityId, string> = {
  high: "var(--viz-r3)",
  mid: "var(--viz-r2)",
  low: "var(--viz-r1)",
};

interface DayPoint {
  day: string;
  n: number;
}

function doneByDay(days: string[]): DayPoint[] {
  const counts = new Map<string, number>(days.map((d) => [d, 0]));
  scopedTasks().forEach((t) => {
    if (t.status !== "done") return;
    const day = localDay(t.doneAt);
    if (day != null && counts.has(day)) counts.set(day, counts.get(day)! + 1);
  });
  return days.map((day) => ({ day, n: counts.get(day)! }));
}

/** Подписи оси: 0, середина, максимум — округлённые до целых. */
function niceTicks(top: number): number[] {
  if (top <= 2) return [0, top];
  if (top <= 4) return [0, 2, top];
  return [0, Math.round(top / 2), top];
}

export function renderDashboard(): string {
  const list = scopedTasks();
  const today = todayISO();
  const open = list.filter((t) => t.status !== "done");
  const doing = open.filter((t) => t.status === "doing");
  const late = open.filter((t) => t.due && t.due < today);
  const pct = list.length ? Math.round(((list.length - open.length) / list.length) * 100) : 0;
  const period = state.ui.period || 14;

  const series = doneByDay(lastDays(period));
  const doneInPeriod = series.reduce((sum, p) => sum + p.n, 0);

  const spark = series.slice(-14);
  const sparkMax = Math.max(1, ...spark.map((p) => p.n));

  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const dueSoon = open.filter((t) => t.due && t.due >= today && t.due <= iso(weekEnd)).length;
  const oldestLate = [...late].sort((a, b) => (a.due! < b.due! ? -1 : 1))[0];

  let html = '<div class="dash"><div class="tiles">';

  html +=
    '<div class="tile">' +
      '<div class="tile-label">Открыто задач</div>' +
      `<div class="hero-num">${open.length}</div>` +
      `<div class="tile-sub">из ${list.length} ${plural(list.length, "задачи", "задач", "задач")} · выполнено ${pct}%</div>` +
      `<div class="hero-meter"><i style="width:${pct}%"></i></div>` +
    "</div>";

  html +=
    '<div class="tile">' +
      '<div class="tile-label">Просрочено</div>' +
      `<div class="tile-val${late.length ? " is-crit" : ""}">${late.length}</div>` +
      (late.length && oldestLate?.due
        ? `<div class="tile-flag">${svg("alert", 13)}Нужно разобрать</div>` +
          `<div class="tile-sub">самая давняя — ${esc(fmtDue(oldestLate.due))}</div>`
        : '<div class="tile-sub">Все сроки соблюдены</div>') +
    "</div>";

  html +=
    '<div class="tile">' +
      `<div class="tile-label">Выполнено за ${period} ${plural(period, "день", "дня", "дней")}</div>` +
      `<div class="tile-val">${doneInPeriod}</div>` +
      '<div class="spark">' +
        spark
          .map((p, i) => {
            const height = Math.max(2, Math.round((p.n / sparkMax) * 26));
            return `<i class="${i === spark.length - 1 ? "is-now" : ""}" style="height:${height}px"></i>`;
          })
          .join("") +
      "</div>" +
    "</div>";

  html +=
    '<div class="tile">' +
      '<div class="tile-label">Сейчас в работе</div>' +
      `<div class="tile-val">${doing.length}</div>` +
      `<div class="tile-sub">${dueSoon} ${plural(dueSoon, "задача", "задачи", "задач")} со сроком на ближайшую неделю</div>` +
    "</div>";

  html += "</div>";
  html += `<div class="dash-row">${chartActivity(series)}${chartPriority(open)}</div>`;
  html += `<div class="dash-row">${chartProjects(list)}${cardDeadlines(open)}</div>`;
  return `${html}</div>`;
}

function cardHead(title: string, note: string, tableKey: string, asTable: boolean): string {
  return (
    `<div class="vcard-head"><h3>${esc(title)}</h3><span class="sp"></span>` +
    `<button class="tbtn${asTable ? " is-on" : ""}" data-act="vtab" data-key="${tableKey}">` +
    `${asTable ? "График" : "Таблица"}</button></div>` +
    `<div class="vcard-note">${esc(note)}</div>`
  );
}

function chartActivity(series: DayPoint[]): string {
  const asTable = !!state.ui.vtab.activity;
  const max = Math.max(...series.map((p) => p.n));
  const top = Math.max(1, max);
  const total = series.reduce((sum, p) => sum + p.n, 0);
  const labelEvery = Math.ceil(series.length / 8);

  let html =
    '<div class="vcard wide">' +
    cardHead(
      "Выполнено по дням",
      `Задачи, закрытые за последние ${series.length} ${plural(series.length, "день", "дня", "дней")} · всего ${total}`,
      "activity",
      asTable,
    );

  if (asTable) {
    html += '<div class="vscroll"><table class="vtable"><thead><tr><th>Дата</th><th class="num">Выполнено</th></tr></thead><tbody>';
    [...series].reverse().forEach((p) => {
      html += `<tr><td>${esc(fmtShortDay(p.day))}</td><td class="num">${p.n}</td></tr>`;
    });
    return `${html}</tbody></table></div></div>`;
  }

  html += '<div class="plot"><div class="plot-grid">';
  niceTicks(top).forEach((value) => {
    html += `<i style="bottom:${(value / top) * 100}%"><b style="bottom:0">${value}</b></i>`;
  });
  html += '</div><div class="cols">';

  series.forEach((p) => {
    const height = (p.n / top) * 100;
    const isMax = max > 0 && p.n === max;
    html +=
      `<div class="slot"${tipAttr(`${p.n} ${plural(p.n, "задача", "задачи", "задач")}`, fmtShortDay(p.day), "var(--viz-doing)")}>` +
        (isMax ? `<span class="slot-cap" style="bottom:calc(${height}% + 5px)">${p.n}</span>` : "") +
        `<div class="bar-v${p.n ? "" : " is-zero"}" style="height:${p.n ? height : 0}%"></div>` +
      "</div>";
  });

  html += '</div></div><div class="xaxis">';
  series.forEach((p, i) => {
    const show = (series.length - 1 - i) % labelEvery === 0;
    html += `<span class="${i === series.length - 1 ? "is-now" : ""}">${show ? esc(fmtShortDay(p.day)) : ""}</span>`;
  });
  return `${html}</div></div>`;
}

function chartPriority(open: Task[]): string {
  const asTable = !!state.ui.vtab.prio;

  const rows: Array<{ key: PriorityId | ""; label: string; n: number }> = PRIO.map((p) => ({
    key: p.id,
    label: p.label,
    n: open.filter((t) => t.priority === p.id).length,
  }));
  const none = open.filter((t) => !prioOf(t.priority)).length;
  if (none) rows.push({ key: "", label: "Без приоритета", n: none });

  const max = Math.max(1, ...rows.map((r) => r.n));

  let html =
    '<div class="vcard">' +
    cardHead("Приоритет", `Открытые задачи, ${open.length} всего`, "prio", asTable);

  if (asTable) {
    html += '<table class="vtable"><thead><tr><th>Приоритет</th><th class="num">Задач</th></tr></thead><tbody>';
    rows.forEach((r) => {
      html += `<tr><td>${esc(r.label)}</td><td class="num">${r.n}</td></tr>`;
    });
    return `${html}</tbody></table></div>`;
  }

  html += '<div class="hbars hbars--stack">';
  rows.forEach((r) => {
    const color = r.key ? PRIO_RAMP[r.key] : "var(--viz-todo)";
    html +=
      `<div class="hbar-row"><div class="hbar-name">${esc(r.label)}</div><div class="hbar-track">` +
      (r.n
        ? `<div class="hbar-seg" style="width:${(r.n / max) * 100}%;background:${color}"` +
          `${tipAttr(`${r.n} ${plural(r.n, "задача", "задачи", "задач")}`, r.label, color)}></div>`
        : '<div class="hbar-empty" style="width:100%"></div>') +
      `</div><div class="hbar-val">${r.n}</div></div>`;
  });
  return `${html}</div></div>`;
}

function chartProjects(list: Task[]): string {
  const asTable = !!state.ui.vtab.projects;

  interface Row {
    name: string;
    color: ColorName;
    counts: number[];
    total: number;
  }

  const build = (name: string, color: ColorName, items: Task[]): Row => ({
    name,
    color,
    counts: STATUS.map((s) => items.filter((t) => t.status === s.id).length),
    total: items.length,
  });

  const rows: Row[] = state.projects
    .map((p) => build(p.name, p.color, list.filter((t) => t.project === p.id)))
    .filter((r) => r.total > 0);

  const orphan = list.filter((t) => !projectOf(t.project));
  if (orphan.length) rows.push(build("Без проекта", "gray", orphan));
  rows.sort((a, b) => b.total - a.total);

  const max = Math.max(1, ...rows.map((r) => r.total));

  let html =
    '<div class="vcard wide">' +
    cardHead("Задачи по проектам", "Длина полосы — сколько всего задач в проекте", "projects", asTable);

  if (!rows.length) {
    return `${html}<div class="tile-sub">Пока нет задач с проектом.</div></div>`;
  }

  if (asTable) {
    html +=
      '<table class="vtable"><thead><tr><th>Проект</th>' +
      STATUS.map((s) => `<th class="num">${esc(s.label)}</th>`).join("") +
      '<th class="num">Всего</th></tr></thead><tbody>';
    rows.forEach((r) => {
      html +=
        `<tr><td>${esc(r.name)}</td>` +
        r.counts.map((n) => `<td class="num">${n}</td>`).join("") +
        `<td class="num">${r.total}</td></tr>`;
    });
    return `${html}</tbody></table></div>`;
  }

  html += '<div class="hbars">';
  rows.forEach((r) => {
    html +=
      '<div class="hbar-row"><div class="hbar-name">' +
      `<i class="dot" style="background:var(--c-${r.color}-fg)"></i>${esc(r.name)}</div>` +
      '<div class="hbar-track">';
    STATUS.forEach((s, i) => {
      const n = r.counts[i]!;
      if (!n) return;
      const color = STATUS_VIZ[s.id];
      html +=
        `<div class="hbar-seg" style="width:${(n / max) * 100}%;background:${color}"` +
        `${tipAttr(`${n} ${plural(n, "задача", "задачи", "задач")}`, `${s.label} · ${r.name}`, color)}></div>`;
    });
    html += `</div><div class="hbar-val">${r.total}</div></div>`;
  });

  html +=
    '</div><div class="legend">' +
    STATUS.map((s) => `<span><i style="background:${STATUS_VIZ[s.id]}"></i>${esc(s.label)}</span>`).join("") +
    "</div>";
  return `${html}</div>`;
}

function cardDeadlines(open: Task[]): string {
  const soon = open
    .filter((t) => t.due)
    .sort((a, b) => (a.due! < b.due! ? -1 : a.due! > b.due! ? 1 : 0))
    .slice(0, 6);

  let html =
    '<div class="vcard"><div class="vcard-head"><h3>Ближайшие сроки</h3></div>' +
    '<div class="vcard-note">Что подходит по времени</div>';

  if (!soon.length) {
    return `${html}<div class="tile-sub">Ни у одной открытой задачи нет срока.</div></div>`;
  }

  html += '<div class="dl">';
  soon.forEach((t) => {
    const today = todayISO();
    const cls = t.due! < today ? " is-late" : t.due === today ? " is-today" : "";
    html +=
      `<div class="dl-item" data-id="${t.id}">` +
        `<div class="dl-when${cls}">${esc(fmtDue(t.due!))}</div>` +
        `<div class="dl-body"><div class="dl-title">${esc(t.title || "Без названия")}</div>` +
        `<div class="dl-meta">${statusChip(t.status)}${projChip(t.project)}</div></div>` +
      "</div>";
  });
  return `${html}</div></div>`;
}
