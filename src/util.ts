import { MONTHS_SHORT } from "./constants";

/* ---------- DOM ---------- */

export function $<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(sel);
}

/** Как `$`, но бросает исключение — для узлов из index.html, которые обязаны существовать. */
export function must<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T {
  const node = root.querySelector<T>(sel);
  if (!node) throw new Error(`Не найден элемент: ${sel}`);
  return node;
}

export function $$<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(sel));
}

export function el(html: string): HTMLElement {
  const box = document.createElement("div");
  box.innerHTML = html.trim();
  return box.firstElementChild as HTMLElement;
}

/** Экранирование перед вставкой в HTML-строку. */
export function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}

/* ---------- прочее ---------- */

export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
}

export function byId<T extends { id: string }>(list: T[], id: string | null | undefined): T | null {
  if (id == null) return null;
  return list.find((x) => x.id === id) ?? null;
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let timer: number | undefined;
  return (...args: A) => {
    if (timer !== undefined) clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), ms);
  };
}

/** Русское склонение: plural(2, "задача", "задачи", "задач") → "задачи". */
export function plural(n: number, one: string, few: string, many: string): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
  return many;
}

/* ---------- даты ---------- */

/** Локальная дата в формате YYYY-MM-DD (не UTC — иначе вечерние задачи уезжают на день назад). */
export function iso(d: Date): string {
  return (
    d.getFullYear() +
    "-" + String(d.getMonth() + 1).padStart(2, "0") +
    "-" + String(d.getDate()).padStart(2, "0")
  );
}

export function todayISO(): string {
  return iso(new Date());
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

/** Сколько дней от сегодня до даты: отрицательное — в прошлом. */
export function dayDelta(isoDate: string): number {
  const target = parseISO(isoDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}

/** Человекочитаемый срок: «Сегодня», «Завтра», «5 сен». */
export function fmtDue(isoDate: string): string {
  const delta = dayDelta(isoDate);
  if (delta === 0) return "Сегодня";
  if (delta === 1) return "Завтра";
  if (delta === -1) return "Вчера";
  const d = parseISO(isoDate);
  let out = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  if (d.getFullYear() !== new Date().getFullYear()) out += ` ${d.getFullYear()}`;
  return out;
}

export function fmtDateTime(stamp: string | null): string {
  if (!stamp) return "—";
  const d = new Date(stamp);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}, ` +
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  );
}

/** Короткая дата для оси графика: 05.09 */
export function fmtShortDay(isoDate: string): string {
  const d = parseISO(isoDate);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Последние n дней, включая сегодня, по возрастанию. */
export function lastDays(n: number): string[] {
  const out: string[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push(iso(d));
  }
  return out;
}

/** Локальный день ISO-времени, или null. */
export function localDay(stamp: string | null): string | null {
  if (!stamp) return null;
  const d = new Date(stamp);
  return Number.isNaN(d.getTime()) ? null : iso(d);
}
