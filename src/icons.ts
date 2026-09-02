/** Однотонные 16×16 иконки: рисуются обводкой, цвет берут от currentColor. */
const ICONS = {
  chart: '<path d="M2 13.6h12"/><path d="M4.4 13.6V7.2M8 13.6V3.4M11.6 13.6V9.6"/>',
  alert: '<path d="M8 2.6l6 10.8H2L8 2.6z"/><path d="M8 6.6v3.1M8 11.7v.02"/>',
  sun: '<circle cx="8" cy="8" r="3.1"/><path d="M8 1.2v1.6M8 13.2v1.6M1.2 8h1.6M13.2 8h1.6M3.3 3.3l1.1 1.1M11.6 11.6l1.1 1.1M12.7 3.3l-1.1 1.1M4.4 11.6l-1.1 1.1"/>',
  table: '<rect x="1.8" y="2.6" width="12.4" height="10.8" rx="1.6"/><path d="M1.8 6.2h12.4M6.4 6.2v7.2"/>',
  board: '<rect x="1.8" y="2.6" width="4.4" height="10.8" rx="1.4"/><rect x="9" y="2.6" width="5.2" height="7" rx="1.4"/>',
  cal: '<rect x="1.8" y="3.2" width="12.4" height="11" rx="1.6"/><path d="M1.8 6.6h12.4M5.2 1.8v2.6M10.8 1.8v2.6"/>',
  hash: '<path d="M5.6 2.2L4.2 13.8M11.4 2.2L10 13.8M2.4 5.6h11.2M2.2 10.4h11.2"/>',
  inbox: '<path d="M1.8 8.4h3.4l1 2h3.6l1-2h3.4"/><path d="M3.4 3h9.2l1.6 5.4v4a1.4 1.4 0 01-1.4 1.4H3.2a1.4 1.4 0 01-1.4-1.4v-4L3.4 3z"/>',
  check: '<path d="M3 8.4l3.2 3.2L13 4.6"/>',
  chevR: '<path d="M6 3.5L10.5 8 6 12.5"/>',
  dots: '<circle cx="8" cy="3.2" r="1.3" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none"/><circle cx="8" cy="12.8" r="1.3" fill="currentColor" stroke="none"/>',
  grip: '<circle cx="6" cy="4" r="1.1" fill="currentColor" stroke="none"/><circle cx="10" cy="4" r="1.1" fill="currentColor" stroke="none"/><circle cx="6" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="10" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="6" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="10" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
  plus: '<path d="M8 3v10M3 8h10"/>',
  x: '<path d="M4 4l8 8M12 4l-8 8"/>',
  trash: '<path d="M2.8 4.2h10.4M6.2 4.2V2.8h3.6v1.4M4.2 4.2l.7 9.2h6.2l.7-9.2"/>',
  copy: '<rect x="5.2" y="5.2" width="8.6" height="8.6" rx="1.5"/><path d="M10.8 5.2V3.7a1.5 1.5 0 00-1.5-1.5H3.7a1.5 1.5 0 00-1.5 1.5v5.6a1.5 1.5 0 001.5 1.5h1.5"/>',
  open: '<path d="M9 2.4h4.6V7"/><path d="M13.6 2.4L7.8 8.2"/><path d="M12.4 9.6v3a1.6 1.6 0 01-1.6 1.6H3.4a1.6 1.6 0 01-1.6-1.6V5.2a1.6 1.6 0 011.6-1.6h3"/>',
  flag: '<path d="M3.6 14V2.4M3.6 3.2h8l-1.6 2.8 1.6 2.8h-8"/>',
  cal2: '<rect x="2" y="3.4" width="12" height="10.6" rx="1.5"/><path d="M2 6.6h12M5.2 2v2.6M10.8 2v2.6"/>',
  tag: '<path d="M2.4 7.2V3a.9.9 0 01.9-.9h4.2l6.2 6.2a1.2 1.2 0 010 1.7l-3.5 3.5a1.2 1.2 0 01-1.7 0L2.4 7.2z"/><circle cx="5.4" cy="5.4" r="1"/>',
  folder: '<path d="M1.9 4.2a1.4 1.4 0 011.4-1.4h2.6l1.4 1.8h5a1.4 1.4 0 011.4 1.4v5.8a1.4 1.4 0 01-1.4 1.4H3.3a1.4 1.4 0 01-1.4-1.4V4.2z"/>',
  sort: '<path d="M4 3v10M4 13l-2-2M4 13l2-2M12 13V3M12 3l-2 2M12 3l2 2"/>',
  layers: '<path d="M8 1.8l6 3.2-6 3.2-6-3.2 6-3.2z"/><path d="M2 10.8l6 3.2 6-3.2"/>',
  eye: '<path d="M1.5 8S4 3.4 8 3.4 14.5 8 14.5 8 12 12.6 8 12.6 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/>',
  note: '<path d="M4 3h8M4 6.4h8M4 9.8h5.6M4 13.2h3.4"/>',
  download: '<path d="M8 2.4v7.8M8 10.2L4.8 7M8 10.2L11.2 7"/><path d="M2.4 11.6v1.2a1 1 0 001 1h9.2a1 1 0 001-1v-1.2"/>',
  upload: '<path d="M8 10.2V2.4M8 2.4L4.8 5.6M8 2.4l3.2 3.2"/><path d="M2.4 11.6v1.2a1 1 0 001 1h9.2a1 1 0 001-1v-1.2"/>',
} as const;

export type IconName = keyof typeof ICONS;

/** Инлайновая SVG-иконка. */
export function svg(name: IconName, size = 15): string {
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" ` +
    'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    ICONS[name] +
    "</svg>"
  );
}
