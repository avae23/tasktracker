import { bus } from "./bus";
import { persistUI, state } from "./state";
import { createTask } from "./tasks";
import { renderHeader, renderSidebar } from "./ui/chrome";
import { openPeek, renderPeek } from "./ui/peek";
import { renderAgenda } from "./views/agenda";
import { renderBoard } from "./views/board";
import { renderCalendar } from "./views/calendar";
import { renderDashboard } from "./views/dashboard";
import { renderTable } from "./views/table";
import { $, must } from "./util";

function viewHTML(): string {
  switch (state.ui.view) {
    case "dash": return renderDashboard();
    case "table": return renderTable();
    case "board": return renderBoard();
    case "calendar": return renderCalendar();
    default: return renderAgenda();
  }
}

/** Полная перерисовка с сохранением фокуса и позиции курсора в поле ввода. */
export function render(): void {
  const active = document.activeElement as HTMLElement | null;
  const focusKey = active?.dataset?.["fk"];
  const caret = active instanceof HTMLInputElement ? active.selectionStart : null;

  renderSidebar();
  renderHeader();
  must("#view").innerHTML = viewHTML();

  if (focusKey) {
    const node = $<HTMLInputElement>(`[data-fk="${focusKey}"]`);
    if (node) {
      node.focus();
      if (caret != null) {
        try {
          node.setSelectionRange(caret, caret);
        } catch {
          /* у некоторых типов полей выделение недоступно */
        }
      }
    }
  }

  renderPeek();
  persistUI();
}

/** Новая задача: в таблице правим прямо в строке, иначе открываем карточку. */
export function newTaskFlow(patch: Parameters<typeof createTask>[0] = {}): void {
  const task = createTask(patch);
  render();

  if (state.ui.view === "table") {
    const input = $<HTMLInputElement>(`[data-fk="title:${task.id}"]`);
    if (input) {
      input.focus();
      return;
    }
  }
  openPeek(task.id);
  window.setTimeout(() => $<HTMLTextAreaElement>(".peek-title")?.focus(), 60);
}

export function closeSidebar(): void {
  const sidebar = must("#sidebar");
  if (!sidebar.classList.contains("is-open")) return;
  sidebar.classList.remove("is-open");
  if (!state.ui.peek) must("#scrim").classList.remove("is-open");
}

export function toggleSidebar(): void {
  const sidebar = must("#sidebar");
  sidebar.classList.toggle("is-open");
  must("#scrim").classList.toggle("is-open", sidebar.classList.contains("is-open"));
}

/** Связываем шину: модули зовут перерисовку, не импортируя app.ts. */
export function wireBus(): void {
  bus.render = render;
  bus.renderSidebar = renderSidebar;
  bus.renderPeek = renderPeek;
  bus.openPeek = (id: string) => {
    openPeek(id);
    window.setTimeout(() => $<HTMLTextAreaElement>(".peek-title")?.focus(), 60);
  };
}
