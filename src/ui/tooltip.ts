import { $ } from "../util";

/**
 * Подсказка для графиков. Значения приходят через data-атрибуты и вставляются
 * как текст — данные пользователя никогда не попадают в innerHTML.
 */
let tip: HTMLElement | null = null;

function ensure(): HTMLElement {
  if (tip) return tip;
  tip = document.createElement("div");
  tip.className = "tip";
  tip.innerHTML = '<div class="tip-val"></div><div class="tip-lbl"><i class="tip-key"></i><span></span></div>';
  document.body.appendChild(tip);
  return tip;
}

function show(node: HTMLElement): void {
  const box = ensure();
  $(".tip-val", box)!.textContent = node.dataset.tipv ?? "";
  $(".tip-lbl span", box)!.textContent = node.dataset.tipl ?? "";

  const key = $(".tip-key", box)!;
  key.style.background = node.dataset.tipc ?? "var(--text-faint)";
  key.style.display = node.dataset.tipc ? "" : "none";

  box.classList.add("is-on");

  const anchor = node.getBoundingClientRect();
  const self = box.getBoundingClientRect();
  const left = Math.min(
    Math.max(8, anchor.left + anchor.width / 2 - self.width / 2),
    window.innerWidth - self.width - 8,
  );
  let top = anchor.top - self.height - 8;
  if (top < 8) top = anchor.bottom + 8;
  box.style.left = `${left}px`;
  box.style.top = `${top}px`;
}

function hide(): void {
  tip?.classList.remove("is-on");
}

/** Атрибуты для элемента-метки графика. */
export function tipAttr(value: string, label: string, color?: string): string {
  const esc = (s: string): string => s.replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return (
    ` tabindex="0" data-tipv="${esc(value)}" data-tipl="${esc(label)}"` +
    (color ? ` data-tipc="${esc(color)}"` : "")
  );
}

export function bindTooltip(): void {
  const find = (e: Event): HTMLElement | null =>
    (e.target as Element)?.closest?.<HTMLElement>("[data-tipv]") ?? null;

  document.addEventListener("mouseover", (e) => {
    const node = find(e);
    if (node) show(node);
  });
  document.addEventListener("mouseout", (e) => {
    if (find(e)) hide();
  });
  document.addEventListener("focusin", (e) => {
    const node = find(e);
    if (node) show(node);
  });
  document.addEventListener("focusout", (e) => {
    if (find(e)) hide();
  });
  window.addEventListener("scroll", hide, true);
}
