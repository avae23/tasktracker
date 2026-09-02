/**
 * Слабая связь между модулями: представления и меню зовут перерисовку,
 * не импортируя app.ts (иначе получается цикл импортов).
 * app.ts подставляет сюда настоящие функции при старте.
 */
export const bus = {
  render: (): void => {},
  renderSidebar: (): void => {},
  renderPeek: (): void => {},
  openPeek: (_id: string): void => {},
};
