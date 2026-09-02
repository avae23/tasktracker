import { bus } from "../bus";
import { VIEWS } from "../constants";
import { svg } from "../icons";
import type { IconName } from "../icons";
import { state } from "../state";
import { allTasks, createTask, projectOf, statusOf } from "../tasks";
import { esc, must } from "../util";

interface PaletteItem {
  icon: IconName;
  text: string;
  hint: string;
  run: () => void;
}

let items: PaletteItem[] = [];
let cursor = 0;

export function openPalette(): void {
  must("#palWrap").classList.add("is-open");
  const input = must<HTMLInputElement>("#palInp");
  input.value = "";
  input.focus();
  fill("");
}

export function closePalette(): void {
  must("#palWrap").classList.remove("is-open");
}

export function isPaletteOpen(): boolean {
  return must("#palWrap").classList.contains("is-open");
}

function fill(raw: string): void {
  const query = raw.trim().toLowerCase();
  const next: PaletteItem[] = [];

  if (!query) {
    VIEWS.forEach((v) => {
      next.push({
        icon: v.icon,
        text: `Перейти: ${v.label}`,
        hint: "вид",
        run: () => {
          state.ui.view = v.id;
          bus.render();
        },
      });
    });
    next.push({
      icon: "plus",
      text: "Новая задача",
      hint: "создать",
      run: () => {
        const task = createTask();
        bus.render();
        bus.openPeek(task.id);
      },
    });
  } else {
    allTasks()
      .filter((t) => `${t.title} ${t.tags.join(" ")} ${t.notes}`.toLowerCase().includes(query))
      .sort((a, b) => Number(a.status === "done") - Number(b.status === "done"))
      .slice(0, 8)
      .forEach((t) => {
        const project = projectOf(t.project);
        next.push({
          icon: t.status === "done" ? "check" : "hash",
          text: t.title || "Без названия",
          hint: project ? project.name : statusOf(t.status).label,
          run: () => bus.openPeek(t.id),
        });
      });

    const typed = must<HTMLInputElement>("#palInp").value.trim();
    next.push({
      icon: "plus",
      text: `Создать «${typed}»`,
      hint: "новая задача",
      run: () => {
        const task = createTask({ title: typed });
        bus.render();
        bus.openPeek(task.id);
      },
    });
  }

  items = next;
  cursor = 0;
  paint();
}

function paint(): void {
  const list = must("#palList");
  if (!items.length) {
    list.innerHTML = '<div style="padding:14px;color:var(--text-faint);font-size:13px">Ничего не найдено</div>';
    return;
  }
  list.innerHTML = items
    .map(
      (item, i) =>
        `<button class="pal-item${i === cursor ? " is-cursor" : ""}" data-i="${i}">` +
        `<span class="ic">${svg(item.icon, 14)}</span><span class="tx">${esc(item.text)}</span>` +
        (item.hint ? `<span class="hint">${esc(item.hint)}</span>` : "") +
        "</button>",
    )
    .join("");
}

function run(index: number): void {
  const item = items[index];
  if (!item) return;
  closePalette();
  item.run();
}

export function bindPalette(): void {
  const input = must<HTMLInputElement>("#palInp");

  input.addEventListener("input", () => fill(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      cursor = Math.min(items.length - 1, cursor + 1);
      paint();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      cursor = Math.max(0, cursor - 1);
      paint();
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(cursor);
    }
  });

  must("#palList").addEventListener("click", (e) => {
    const btn = (e.target as Element).closest<HTMLElement>(".pal-item");
    if (btn) run(Number(btn.dataset.i));
  });

  const wrap = must("#palWrap");
  wrap.addEventListener("mousedown", (e) => {
    if (e.target === wrap) closePalette();
  });
}
