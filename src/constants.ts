import type { ColorName, PriorityDef, StatusDef, ViewDef } from "./types";

export const STATUS: StatusDef[] = [
  { id: "todo", label: "Не начато", color: "gray" },
  { id: "doing", label: "В работе", color: "blue" },
  { id: "done", label: "Готово", color: "green" },
];

export const PRIO: PriorityDef[] = [
  { id: "high", label: "Высокий", color: "red" },
  { id: "mid", label: "Средний", color: "yellow" },
  { id: "low", label: "Низкий", color: "gray" },
];

export const COLORS: ColorName[] = [
  "gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red",
];

export const VIEWS: ViewDef[] = [
  { id: "dash", label: "Обзор", icon: "chart" },
  { id: "today", label: "Сегодня", icon: "sun" },
  { id: "table", label: "Таблица", icon: "table" },
  { id: "board", label: "Доска", icon: "board" },
  { id: "calendar", label: "Календарь", icon: "cal" },
];

export const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

/** Родительный падеж — для дат вида «5 сен». */
export const MONTHS_SHORT = [
  "янв", "фев", "мар", "апр", "мая", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

export const DOW = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const GROUP_LABELS: Record<string, string> = {
  none: "Без групп",
  status: "Статус",
  project: "Проект",
  priority: "Приоритет",
};

export const SORT_LABELS: Record<string, string> = {
  manual: "Вручную",
  due: "Срок",
  priority: "Приоритет",
  title: "Название",
  created: "Дата создания",
};

export const LS_DATA = "tracker.data.v1";
export const LS_UI = "tracker.ui.v1";
export const LS_SEEDED = "tracker.seeded";
