import { bus } from "./bus";
import { state } from "./state";
import { patchFromGroupKey, patchTask } from "./tasks";
import { $$ } from "./util";

let dragId: string | null = null;

/** Куда встанет карточка: индекс среди соседей по вертикали. */
function dropIndex(container: Element, y: number, selector: string): number {
  const nodes = $$(selector, container).filter((n) => n.dataset.id !== dragId);
  for (let i = 0; i < nodes.length; i++) {
    const rect = nodes[i]!.getBoundingClientRect();
    if (y < rect.top + rect.height / 2) return i;
  }
  return nodes.length;
}

/** Ставим order между соседями — так порядок переживает перезагрузку. */
function reorderInto(id: string, container: Element, index: number, selector: string): void {
  const nodes = $$(selector, container).filter((n) => n.dataset.id !== id);
  const before = index > 0 ? state.tasks[nodes[index - 1]!.dataset.id!] : undefined;
  const after = index < nodes.length ? state.tasks[nodes[index]!.dataset.id!] : undefined;

  const low = before ? before.order : after ? after.order - 200 : 0;
  const high = after ? after.order : before ? before.order + 200 : 100;

  const task = state.tasks[id];
  if (!task) return;
  const next = (low + high) / 2;
  task.order = Number.isFinite(next) ? next : high + 100;
}

export function bindDnd(): void {
  document.addEventListener("dragstart", (e) => {
    const node = (e.target as Element).closest<HTMLElement>(".card,.ev,.grip");
    if (!node) return;
    const host = node.classList.contains("grip") ? node.closest<HTMLElement>("[data-id]") : node;
    if (!host?.dataset.id) return;

    dragId = host.dataset.id;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", dragId);
    }
    if (node.classList.contains("card")) node.classList.add("is-drag");
  });

  document.addEventListener("dragend", () => {
    dragId = null;
    $$(".is-drag").forEach((n) => n.classList.remove("is-drag"));
    $$(".is-over").forEach((n) => n.classList.remove("is-over"));
  });

  document.addEventListener("dragover", (e) => {
    const target = e.target as Element;
    const col = target.closest<HTMLElement>(".col");
    const day = target.closest<HTMLElement>(".day");
    const row = target.closest<HTMLElement>(".row");

    if (col || day || row) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    }
    $$(".is-over").forEach((n) => {
      if (n !== col && n !== day && n !== row) n.classList.remove("is-over");
    });
    col?.classList.add("is-over");
    day?.classList.add("is-over");
    if (row && !col && !day) row.classList.add("is-over");
  });

  document.addEventListener("drop", (e) => {
    if (!dragId) return;
    const target = e.target as Element;
    const col = target.closest<HTMLElement>(".col");
    const day = target.closest<HTMLElement>(".day");
    const row = target.closest<HTMLElement>(".row");

    if (col) {
      e.preventDefault();
      const body = col.querySelector(".col-body");
      if (body) reorderInto(dragId, body, dropIndex(body, e.clientY, ".card"), ".card");
      patchTask(dragId, patchFromGroupKey(col.dataset.group));
      bus.render();
    } else if (day?.dataset.day) {
      e.preventDefault();
      patchTask(dragId, { due: day.dataset.day });
      bus.render();
    } else if (row && row.dataset.id !== dragId) {
      e.preventDefault();
      const body = row.parentElement as HTMLElement | null;
      if (body) {
        reorderInto(dragId, body, dropIndex(body, e.clientY, ".row"), ".row");
        // перетащили в другую группу — задача принимает её значение
        if (body.dataset.group) patchTask(dragId, patchFromGroupKey(body.dataset.group));
      }
      bus.render();
    }
    dragId = null;
  });
}
