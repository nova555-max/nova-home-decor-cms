export const THEME_TRANSITION_MS = 300;

export function withThemeTransition(action: () => void) {
  if (typeof document === "undefined") {
    action();
    return;
  }

  const root = document.documentElement;
  root.classList.add("theme-transition");
  action();
  window.setTimeout(() => {
    root.classList.remove("theme-transition");
  }, THEME_TRANSITION_MS);
}
