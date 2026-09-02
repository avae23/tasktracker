import { LS_DATA, LS_SEEDED, LS_UI } from "./constants";
import type { Snapshot, UIState } from "./types";

/**
 * localStorage бросает исключение в приватных окнах, при отключённых cookies
 * и внутри data:-страниц. Читаем и пишем только через эти обёртки.
 */
export function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* хранилище недоступно — работаем в памяти до перезагрузки */
  }
}

/** Куда складываются задачи. Сейчас есть только браузерное хранилище. */
export interface StorageAdapter {
  readonly name: string;
  load(): Snapshot | null;
  save(snapshot: Snapshot): void;
}

export const localAdapter: StorageAdapter = {
  name: "localStorage",
  load() {
    const raw = lsGet(LS_DATA);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<Snapshot>;
      return {
        tasks: parsed.tasks ?? {},
        projects: parsed.projects ?? [],
      };
    } catch {
      return null;
    }
  },
  save(snapshot) {
    lsSet(LS_DATA, JSON.stringify(snapshot));
  },
};

export function loadUI(): Partial<UIState> | null {
  const raw = lsGet(LS_UI);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<UIState>;
  } catch {
    return null;
  }
}

export function saveUI(ui: UIState): void {
  const { peek: _peek, ...rest } = ui;
  lsSet(LS_UI, JSON.stringify(rest));
}

export function wasSeeded(): boolean {
  return lsGet(LS_SEEDED) === "1";
}

export function markSeeded(): void {
  lsSet(LS_SEEDED, "1");
}
