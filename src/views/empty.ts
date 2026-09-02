import { svg } from "../icons";
import { state } from "../state";

export function emptyHTML(): string {
  const searching = state.ui.search.trim().length > 0;
  return (
    '<div class="empty">' +
    svg("inbox", 26) +
    `<b>${searching ? "Ничего не нашлось" : "Здесь пока пусто"}</b>` +
    `<p>${
      searching
        ? "Попробуйте другой запрос или сбросьте поиск."
        : "Нажмите «Задача» вверху справа или ⌘K, чтобы добавить первую запись."
    }</p></div>`
  );
}
