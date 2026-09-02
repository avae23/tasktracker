import { GROUP_LABELS, SORT_LABELS, VIEWS } from "../constants";
import { svg } from "../icons";
import type { IconName } from "../icons";
import { state } from "../state";
import { allTasks, projectOf, visibleTasks } from "../tasks";
import { dayDelta, esc, must, plural, todayISO } from "../util";

/** Сайдбар: навигация, проекты, счётчики, прогресс. */
export function renderSidebar(): void {
  const today = todayISO();
  const counts = { all: 0, due: 0, open: 0, doing: 0, done: 0 };
  const perProject = new Map<string, number>();

  allTasks().forEach((t) => {
    counts.all++;
    if (t.status === "done") {
      counts.done++;
    } else {
      counts.open++;
      if (t.status === "doing") counts.doing++;
      if (t.due && t.due <= today) counts.due++;
    }
    if (t.project && t.status !== "done") {
      perProject.set(t.project, (perProject.get(t.project) ?? 0) + 1);
    }
  });

  let html = "";
  html += navHTML("dash", "chart", "Обзор", 0);
  html += navHTML("today", "sun", "Сегодня", counts.due);
  html += navHTML("table", "table", "Все задачи", counts.open);
  html += navHTML("board", "board", "Доска", 0);
  html += navHTML("calendar", "cal", "Календарь", 0);

  html +=
    '<div class="side-label"><span>Проекты</span>' +
    '<button class="icon-btn" data-act="new-project" title="Новый проект" style="width:20px;height:20px">' +
    `${svg("plus", 12)}</button></div>`;

  if (!state.projects.length) {
    html += '<div style="padding:4px 8px;font-size:12.5px;color:var(--text-faint)">Пока нет проектов</div>';
  }
  state.projects.forEach((p) => {
    const on = state.ui.project === p.id;
    const count = perProject.get(p.id) ?? 0;
    html +=
      `<button class="nav${on ? " is-on" : ""}" data-act="project" data-id="${p.id}">` +
        `<span class="ic"><i class="dot" style="background:var(--c-${p.color}-fg)"></i></span>` +
        `<span class="lbl">${esc(p.name)}</span>` +
        `<span class="cnt">${count || ""}</span></button>`;
  });

  html += '<div class="side-label">Вид</div>';
  html +=
    `<button class="nav" data-act="toggle-done"><span class="ic">${svg("eye", 15)}</span>` +
    `<span class="lbl">${state.ui.showDone ? "Скрыть выполненные" : "Показать выполненные"}</span></button>`;
  html +=
    `<button class="nav" data-act="copy-md"><span class="ic">${svg("copy", 15)}</span>` +
    '<span class="lbl">Скопировать как Markdown</span></button>';
  html +=
    `<button class="nav" data-act="sync-claude"><span class="ic">${svg("chart", 15)}</span>` +
    '<span class="lbl">Подтянуть из Claude Code</span></button>';
  html +=
    `<button class="nav" data-act="export-json"><span class="ic">${svg("download", 15)}</span>` +
    '<span class="lbl">Сохранить резервную копию</span></button>';
  html +=
    `<button class="nav" data-act="import-json"><span class="ic">${svg("upload", 15)}</span>` +
    '<span class="lbl">Загрузить из копии</span></button>';

  must("#sideScroll").innerHTML = html;

  const pct = counts.all ? Math.round((counts.done / counts.all) * 100) : 0;
  must("#pctTxt").textContent = `${pct}%`;
  (must("#meterFill") as HTMLElement).style.width = `${pct}%`;
  must("#cOpen").textContent = String(counts.open);
  must("#cDoing").textContent = String(counts.doing);
  must("#cDone").textContent = String(counts.done);
  must("#wsSub").textContent = `${counts.all} ${plural(counts.all, "задача", "задачи", "задач")}`;
}

function navHTML(view: string, icon: IconName, label: string, count: number): string {
  const on = state.ui.view === view && !state.ui.project;
  return (
    `<button class="nav${on ? " is-on" : ""}" data-act="view" data-view="${view}">` +
    `<span class="ic">${svg(icon, 15)}</span><span class="lbl">${esc(label)}</span>` +
    (count ? `<span class="cnt">${count}</span>` : "") +
    "</button>"
  );
}

/** Шапка: хлебные крошки, заголовок, вкладки представлений и их настройки. */
export function renderHeader(): void {
  const project = state.ui.project ? projectOf(state.ui.project) : null;
  const view = VIEWS.find((v) => v.id === state.ui.view) ?? VIEWS[0]!;

  must("#crumb").innerHTML =
    `<b>${esc(project ? project.name : "Личное пространство")}</b>` +
    `<span class="sep">/</span><span>${esc(view.label)}</span>`;

  must("#pageTitle").textContent = project
    ? project.name
    : state.ui.view === "today"
      ? "Сегодня"
      : state.ui.view === "dash"
        ? "Обзор"
        : "Все задачи";

  const list = visibleTasks();
  const open = list.filter((t) => t.status !== "done").length;
  const late = list.filter((t) => t.status !== "done" && t.due && dayDelta(t.due) < 0).length;
  let sub = `${open} ${plural(open, "открытая задача", "открытые задачи", "открытых задач")}`;
  if (late) sub += ` · ${late} ${plural(late, "просрочена", "просрочены", "просрочено")}`;
  must("#pageSub").textContent = sub;

  let html = VIEWS.map(
    (v) =>
      `<button class="tab${state.ui.view === v.id ? " is-on" : ""}" data-act="view" data-view="${v.id}">` +
      `${svg(v.icon, 14)}${esc(v.label)}</button>`,
  ).join("");

  html += '<span class="spacer"></span>';

  if (state.ui.view === "dash") {
    html +=
      '<div class="seg">' +
      [7, 14, 30]
        .map(
          (n) =>
            `<button data-act="period" data-n="${n}"${state.ui.period === n ? ' class="is-on"' : ""}>${n} дн.</button>`,
        )
        .join("") +
      "</div>";
  }
  if (state.ui.view === "table" || state.ui.view === "board") {
    html += `<button class="btn" data-act="group">${svg("layers", 13)}Группировка: ${GROUP_LABELS[state.ui.group]}</button>`;
  }
  if (state.ui.view === "table" || state.ui.view === "today") {
    html += `<button class="btn" data-act="sort">${svg("sort", 13)}Сортировка: ${SORT_LABELS[state.ui.sort]}</button>`;
  }

  must("#tabs").innerHTML = html;
}
