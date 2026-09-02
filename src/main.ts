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
import { bindPalette } from "./ui/command";
import { bindTooltip } from "./ui/tooltip";

boot();
wireBus();
bindEvents();
bindPalette();
bindTooltip();
bindDnd();
render();
