import "./styles/tokens.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/views.css";
import "./styles/dashboard.css";
import "./styles/responsive.css";

import { render, wireBus } from "./app";
import { bindDnd } from "./dnd";
import { bindEvents } from "./events";
import { boot } from "./state";
import { storageAvailable } from "./storage";
import { bindPalette } from "./ui/command";
import { bindTooltip } from "./ui/tooltip";

boot();
wireBus();
bindEvents();
bindPalette();
bindTooltip();
bindDnd();
render();

if (!storageAvailable()) {
  const bar = document.createElement("div");
  bar.className = "warn-bar";
  bar.innerHTML =
    "<span>Браузер не даёт сохранять данные — задачи пропадут при перезагрузке. " +
    "Проверьте настройки хранилища сайта или откройте трекер через <code>npm run dev</code>.</span>" +
    '<button type="button" aria-label="Скрыть">×</button>';
  bar.querySelector("button")?.addEventListener("click", () => bar.remove());
  document.body.appendChild(bar);
}
