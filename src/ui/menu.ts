import { bus } from "../bus";
import { COLORS, PRIO, STATUS } from "../constants";
import { persist, state } from "../state";
import { allTasks, chipHTML, duplicateTask, patchTask, removeTask, toggleDone } from "../tasks";
import { $, el, esc, iso, todayISO, uid } from "../util";
import { svg } from "../icons";
import type { ColorName, Project } from "../types";

export interface MenuItem {
  label?: string;
  html?: string;
  checked?: boolean;
  danger?: boolean;
  /** не закрывать меню после клика — для мультивыбора вроде тегов */
  keepOpen?: boolean;
  sep?: boolean;
  onPick?: (inputValue: string | null) => void;
}

export interface MenuOptions {
  label?: string;
  /** если задано — сверху появляется поле ввода с этим значением */
  input?: string;
  placeholder?: string;
  onSubmit?: (value: string) => void;
}

let menuEl: HTMLElement | null = null;

export function closeMenu(): void {
  menuEl?.remove();
  menuEl = null;
}

export function isMenuNode(node: Node): boolean {
  return !!menuEl && menuEl.contains(node);
}

export function openMenu(anchor: Element, items: MenuItem[], opts: MenuOptions = {}): HTMLElement {
  closeMenu();

  const menu = document.createElement("div");
  menu.className = "menu";

  let html = "";
  if (opts.label) html += `<div class="menu-lbl">${esc(opts.label)}</div>`;
  if (opts.input != null) {
    html += `<input class="menu-inp" type="text" placeholder="${esc(opts.placeholder ?? "")}" value="${esc(opts.input)}">`;
  }
  items.forEach((item, i) => {
    if (item.sep) {
      html += '<div class="menu-sep"></div>';
      return;
    }
    html +=
      `<button class="menu-item${item.danger ? " is-danger" : ""}" data-i="${i}">` +
      (item.html ?? `<span>${esc(item.label ?? "")}</span>`) +
      (item.checked ? `<span class="tick">${svg("check", 12)}</span>` : "") +
      "</button>";
  });
  menu.innerHTML = html;
  document.body.appendChild(menu);

  const rect = anchor.getBoundingClientRect();
  const left = Math.min(rect.left, window.innerWidth - menu.offsetWidth - 10);
  let top = rect.bottom + 5;
  if (top + menu.offsetHeight > window.innerHeight - 10) {
    top = Math.max(10, rect.top - menu.offsetHeight - 5);
  }
  menu.style.left = `${Math.max(8, left)}px`;
  menu.style.top = `${top}px`;
  menuEl = menu;

  menu.addEventListener("click", (e) => {
    const btn = (e.target as Element).closest<HTMLElement>(".menu-item");
    if (!btn) return;
    const item = items[Number(btn.dataset.i)];
    if (item?.onPick) {
      const input = $<HTMLInputElement>(".menu-inp", menu);
      item.onPick(input ? input.value : null);
    }
    if (!item?.keepOpen) closeMenu();
  });

  const input = $<HTMLInputElement>(".menu-inp", menu);
  if (input) {
    input.focus();
    input.select();
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        opts.onSubmit?.(input.value);
        closeMenu();
      }
      if (e.key === "Escape") closeMenu();
    });
  }
  return menu;
}

/* ---------------- меню свойств задачи ---------------- */

export function statusMenu(anchor: Element, id: string): void {
  const task = state.tasks[id];
  if (!task) return;
  openMenu(
    anchor,
    STATUS.map((s) => ({
      html: chipHTML(s.label, s.color),
      checked: task.status === s.id,
      onPick: () => {
        patchTask(id, { status: s.id });
        bus.render();
      },
    })),
    { label: "Статус" },
  );
}

export function prioMenu(anchor: Element, id: string): void {
  const task = state.tasks[id];
  if (!task) return;
  const items: MenuItem[] = PRIO.map((p) => ({
    html: `<span class="chip" data-c="${p.color}"><i class="pdot"></i>${esc(p.label)}</span>`,
    checked: task.priority === p.id,
    onPick: () => {
      patchTask(id, { priority: p.id });
      bus.render();
    },
  }));
  items.push({ sep: true });
  items.push({
    label: "Очистить",
    onPick: () => {
      patchTask(id, { priority: null });
      bus.render();
    },
  });
  openMenu(anchor, items, { label: "Приоритет" });
}

export function projMenu(anchor: Element, id: string): void {
  const task = state.tasks[id];
  if (!task) return;
  const items: MenuItem[] = state.projects.map((p) => ({
    html: chipHTML(p.name, p.color),
    checked: task.project === p.id,
    onPick: () => {
      patchTask(id, { project: p.id });
      bus.render();
    },
  }));
  items.push({ sep: true });
  items.push({
    label: "Без проекта",
    onPick: () => {
      patchTask(id, { project: null });
      bus.render();
    },
  });
  items.push({
    label: "+ Новый проект",
    onPick: () => {
      newProject((p) => {
        patchTask(id, { project: p.id });
        bus.render();
      });
    },
  });
  openMenu(anchor, items, { label: "Проект" });
}

export function dueMenu(anchor: Element, id: string): void {
  const task = state.tasks[id];
  if (!task) return;

  const set = (value: string | null): void => {
    patchTask(id, { due: value });
    bus.render();
  };
  const relative = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return iso(d);
  };

  const menu = openMenu(
    anchor,
    [
      { label: "Сегодня", onPick: () => set(todayISO()) },
      { label: "Завтра", onPick: () => set(relative(1)) },
      { label: "Через неделю", onPick: () => set(relative(7)) },
      { sep: true },
    ],
    { label: "Срок" },
  );

  const picker = el(
    '<div style="padding:5px 7px 3px"><input type="date" style="width:100%;font-size:13px;padding:4px 6px;' +
      `border:1px solid var(--border-mid);border-radius:5px;background:var(--bg)" value="${task.due ?? ""}"></div>`,
  );
  menu.appendChild(picker);
  const input = $<HTMLInputElement>("input", picker)!;
  input.addEventListener("change", () => {
    set(input.value || null);
    closeMenu();
  });

  if (task.due) {
    const clear = el('<button class="menu-item is-danger">Очистить срок</button>');
    clear.addEventListener("click", () => {
      set(null);
      closeMenu();
    });
    menu.appendChild(clear);
  }
}

export function tagsMenu(anchor: Element, id: string): void {
  const task = state.tasks[id];
  if (!task) return;

  const pool = new Set<string>();
  allTasks().forEach((t) => t.tags.forEach((tag) => pool.add(tag)));

  const items: MenuItem[] = [...pool].sort().map((tag) => {
    const on = task.tags.includes(tag);
    return {
      html: chipHTML(tag, "gray"),
      checked: on,
      keepOpen: true,
      onPick: () => {
        const tags = on ? task.tags.filter((x) => x !== tag) : [...task.tags, tag];
        patchTask(id, { tags });
        bus.render();
        // меню пересобираем, чтобы галочки совпадали с новым состоянием
        const next =
          $(`[data-id="${id}"] [data-act="tags"]`) ?? $('.peek [data-act="tags"]');
        if (next) tagsMenu(next, id);
        else closeMenu();
      },
    };
  });

  openMenu(anchor, items, {
    label: "Теги",
    input: "",
    placeholder: "Новый тег + Enter",
    onSubmit: (value) => {
      const tag = value.trim();
      if (!tag || task.tags.includes(tag)) return;
      patchTask(id, { tags: [...task.tags, tag] });
      bus.render();
    },
  });
}

export function rowMenu(anchor: Element, id: string): void {
  const task = state.tasks[id];
  if (!task) return;
  openMenu(anchor, [
    { html: `${svg("open", 13)}<span>Открыть</span>`, onPick: () => bus.openPeek(id) },
    {
      html: `${svg("copy", 13)}<span>Дублировать</span>`,
      onPick: () => {
        duplicateTask(id);
        bus.render();
      },
    },
    { sep: true },
    {
      html: `${svg("check", 13)}<span>${task.status === "done" ? "Вернуть в работу" : "Отметить готовой"}</span>`,
      onPick: () => {
        toggleDone(id);
        bus.render();
      },
    },
    { sep: true },
    {
      html: `${svg("trash", 13)}<span>Удалить</span>`,
      danger: true,
      onPick: () => {
        removeTask(id);
        bus.render();
      },
    },
  ]);
}

export function newProject(after?: (project: Project) => void): void {
  const anchor = $('[data-act="new-project"]') ?? $("#sideScroll")!;

  const add = (name: string, color: ColorName): void => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const project: Project = { id: uid(), name: trimmed, color };
    state.projects.push(project);
    persist();
    bus.render();
    after?.(project);
  };

  openMenu(
    anchor,
    COLORS.map((color) => ({
      html: `<i class="dot" style="background:var(--c-${color}-fg)"></i><span>${color}</span>`,
      onPick: (value) => add(value ?? "", color),
    })),
    {
      label: "Новый проект",
      input: "",
      placeholder: "Название проекта",
      onSubmit: (value) => add(value, COLORS[state.projects.length % COLORS.length]!),
    },
  );
}

/** Короткое уведомление в виде меню — используется после копирования. */
export function flash(anchor: Element, text: string): void {
  openMenu(anchor, [{ label: text, onPick: () => {} }]);
  window.setTimeout(closeMenu, 1600);
}
