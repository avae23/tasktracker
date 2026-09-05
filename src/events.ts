import { closeSidebar, newTaskFlow, render, toggleSidebar } from "./app";
import { GROUP_LABELS, SORT_LABELS } from "./constants";
import { importClaudeSync, keepOnlySynced } from "./claude-sync";
import { copyMarkdown, exportJSON, importJSON } from "./exporters";
import { persist, state } from "./state";
import {
  duplicateTask, patchFromGroupKey, removeTask, toggleDone, visibleTasks,
} from "./tasks";
import {
  closeMenu, dueMenu, isMenuNode, newProject, openMenu, prioMenu, projMenu, rowMenu, statusMenu, tagsMenu,
} from "./ui/menu";
import { closePalette, isPaletteOpen, openPalette } from "./ui/command";
import {
  addSubtask, autoGrow, closePeek, openPeek, removeSubtask, renderPeek, toggleSubtask,
} from "./ui/peek";
import { renderSidebar } from "./ui/chrome";
import { $, debounce, fmtDue, iso, must } from "./util";
import type { GroupBy, SortBy, ViewId } from "./types";

/** id задачи, к которой относится кликнутый элемент. */
function hostId(target: Element): string | null {
  return target.closest<HTMLElement>("[data-id]")?.dataset.id ?? null;
}

function bindClicks(): void {
  document.addEventListener("click", (e) => {
    const target = e.target as Element;
    if (!isMenuNode(target) && !target.closest("[data-act]")) closeMenu();

    const action = target.closest<HTMLElement>("[data-act]");
    if (!action) return;
    const act = action.dataset.act;
    const id = hostId(target);

    switch (act) {
      /* --- навигация --- */
      case "view":
        state.ui.view = action.dataset.view as ViewId;
        state.ui.project = null;
        closeSidebar();
        render();
        return;
      case "project": {
        const next = action.dataset.id ?? null;
        state.ui.project = state.ui.project === next ? null : next;
        if (state.ui.view === "today") state.ui.view = "table";
        closeSidebar();
        render();
        return;
      }
      case "toggle-done":
        state.ui.showDone = !state.ui.showDone;
        render();
        return;
      case "new-project":
        newProject();
        return;
      case "copy-md":
        copyMarkdown(action);
        return;
      case "export-json":
        exportJSON();
        return;
      case "import-json":
        importJSON();
        return;
      case "sync-claude":
        importClaudeSync();
        return;
      case "keep-synced":
        keepOnlySynced();
        return;
      case "period":
        state.ui.period = Number(action.dataset.n);
        render();
        return;
      case "vtab": {
        const key = action.dataset.key;
        if (key) state.ui.vtab[key] = !state.ui.vtab[key];
        render();
        return;
      }
      case "group":
        openMenu(
          action,
          (Object.keys(GROUP_LABELS) as GroupBy[]).map((key) => ({
            label: GROUP_LABELS[key]!,
            checked: state.ui.group === key,
            onPick: () => {
              state.ui.group = key;
              render();
            },
          })),
          { label: "Группировать по" },
        );
        return;
      case "sort":
        openMenu(
          action,
          (Object.keys(SORT_LABELS) as SortBy[]).map((key) => ({
            label: SORT_LABELS[key]!,
            checked: state.ui.sort === key,
            onPick: () => {
              state.ui.sort = key;
              render();
            },
          })),
          { label: "Сортировать по" },
        );
        return;

      /* --- календарь --- */
      case "cal-prev":
      case "cal-next": {
        const [y, m] = state.ui.month.split("-").map(Number) as [number, number];
        const shifted = new Date(y, m - 1 + (act === "cal-next" ? 1 : -1), 1);
        state.ui.month = iso(shifted).slice(0, 7);
        render();
        return;
      }
      case "cal-today":
        state.ui.month = iso(new Date()).slice(0, 7);
        render();
        return;
      case "day-add":
        newTaskFlow({ due: action.dataset.day ?? null });
        return;
      case "day-more": {
        const day = action.dataset.day;
        if (!day) return;
        openMenu(
          action,
          visibleTasks()
            .filter((t) => t.due === day)
            .map((t) => ({ label: t.title || "Без названия", onPick: () => openPeek(t.id) })),
          { label: fmtDue(day) },
        );
        return;
      }

      /* --- строка задачи --- */
      case "check":
        e.stopPropagation();
        if (id) {
          toggleDone(id);
          render();
        }
        return;
      case "open":
        e.stopPropagation();
        if (id) openPeek(id);
        return;
      case "menu":
        e.stopPropagation();
        if (id) rowMenu(action, id);
        return;
      case "status":
      case "prio":
      case "proj":
      case "due":
      case "tags": {
        e.stopPropagation();
        const taskId = id ?? state.ui.peek;
        if (!taskId) return;
        if (act === "status") statusMenu(action, taskId);
        else if (act === "prio") prioMenu(action, taskId);
        else if (act === "proj") projMenu(action, taskId);
        else if (act === "due") dueMenu(action, taskId);
        else tagsMenu(action, taskId);
        return;
      }
      case "add-in-group":
        newTaskFlow(patchFromGroupKey(action.dataset.group));
        return;

      /* --- панель задачи --- */
      case "close":
        closePeek();
        render();
        return;
      case "del":
        if (state.ui.peek) {
          removeTask(state.ui.peek);
          closePeek();
          render();
        }
        return;
      case "dup":
        if (state.ui.peek) {
          duplicateTask(state.ui.peek);
          render();
        }
        return;
      case "add-sub":
        addSubtask();
        return;
      case "sub-check":
      case "sub-del": {
        const sid = target.closest<HTMLElement>("[data-sid]")?.dataset.sid;
        if (!sid) return;
        if (act === "sub-check") toggleSubtask(sid);
        else removeSubtask(sid);
        renderSidebar();
        return;
      }
      default:
        return;
    }
  });

  // клик по карточке, строке списка или событию календаря открывает задачу
  document.addEventListener("click", (e) => {
    const target = e.target as Element;
    if (target.closest("[data-act]")) return;
    const host = target.closest<HTMLElement>(".card,.item,.ev,.dl-item");
    if (host?.dataset.id) openPeek(host.dataset.id);
  });
}

/** Правки в полях: пишем в состояние сразу, на диск — с задержкой, без перерисовки. */
function bindInputs(): void {
  document.addEventListener("input", (e) => {
    const field = (e.target as Element).closest<HTMLElement>("[data-act]");
    if (!field) return;
    const act = field.dataset.act;
    const value = (field as HTMLInputElement | HTMLTextAreaElement).value;

    if (act === "title") {
      const id = hostId(field) ?? state.ui.peek;
      const task = id ? state.tasks[id] : undefined;
      if (!task) return;
      task.title = value;
      persist();
      if (field instanceof HTMLTextAreaElement) autoGrow(field);
    } else if (act === "notes") {
      const task = state.ui.peek ? state.tasks[state.ui.peek] : undefined;
      if (!task) return;
      task.notes = value;
      persist();
    } else if (act === "sub-text") {
      const task = state.ui.peek ? state.tasks[state.ui.peek] : undefined;
      const sid = field.closest<HTMLElement>("[data-sid]")?.dataset.sid;
      if (!task || !sid) return;
      task.subtasks = task.subtasks.map((s) => (s.id === sid ? { ...s, text: value } : s));
      persist();
    }
  });

  // счётчики в сайдбаре обновляем, когда пользователь ушёл из поля
  document.addEventListener("focusout", (e) => {
    const act = (e.target as HTMLElement).dataset?.act;
    if (act === "title" || act === "notes" || act === "sub-text") {
      window.setTimeout(() => {
        if (!(document.activeElement as HTMLElement | null)?.dataset?.act) renderSidebar();
      }, 0);
    }
  });
}

function bindKeys(): void {
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openPalette();
      return;
    }
    if (e.key === "Escape") {
      if (isPaletteOpen()) return closePalette();
      closeMenu();
      if (state.ui.peek) {
        closePeek();
        render();
      }
      return;
    }

    const field = (e.target as Element).closest<HTMLElement>("[data-act]");
    if (!field || e.key !== "Enter") return;

    if (field.dataset.act === "title" && field instanceof HTMLInputElement) {
      e.preventDefault();
      field.blur();
    }
    if (field.dataset.act === "sub-text") {
      e.preventDefault();
      addSubtask();
    }
  });
}

function bindChrome(): void {
  must("#newBtn").addEventListener("click", () => newTaskFlow());
  must("#cmdBtn").addEventListener("click", openPalette);
  must("#burger").addEventListener("click", toggleSidebar);

  must("#scrim").addEventListener("click", () => {
    closePeek();
    closeSidebar();
    renderPeek();
  });

  const search = must<HTMLInputElement>("#search");
  search.value = state.ui.search;
  search.addEventListener(
    "input",
    debounce(() => {
      state.ui.search = search.value;
      render();
    }, 160),
  );

  window.addEventListener("resize", closeMenu);
}

export function bindEvents(): void {
  bindClicks();
  bindInputs();
  bindKeys();
  bindChrome();
  // подсказка «⌘K» на Windows/Linux читается как Ctrl
  if (!navigator.platform.toLowerCase().includes("mac")) {
    const hint = $("#cmdBtn kbd");
    if (hint) hint.textContent = "Ctrl K";
  }
}
