/** Call `router.refresh()` without jumping the viewport back to the top. */
export function refreshPreservingScroll(router: {
  refresh: () => void;
}): void {
  if (typeof window === "undefined") {
    router.refresh();
    return;
  }

  const x = window.scrollX;
  const y = window.scrollY;
  router.refresh();

  const restore = () => window.scrollTo(x, y);
  requestAnimationFrame(() => {
    restore();
    requestAnimationFrame(restore);
  });
  window.setTimeout(restore, 0);
  window.setTimeout(restore, 50);
  window.setTimeout(restore, 200);
}
