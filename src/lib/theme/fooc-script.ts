import { THEME_STORAGE_KEY } from "@/lib/theme/config";

/**
 * Runs before React / next-themes.
 * 1) Polyfill esbuild `__name` on the global object (Wrangler keep-names + next-themes).
 * 2) Apply saved theme to avoid flash.
 */
export const themeFoocScript = `(function(){try{var g=typeof globalThis!=="undefined"?globalThis:window;if(typeof g.__name!=="function"){g.__name=function(t,n){try{Object.defineProperty(t,"name",{value:n,configurable:!0})}catch(e){}return t}}var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var r=t==="dark"||(t==="system"&&d)||(!t&&d);var e=document.documentElement;e.classList.toggle("dark",r);e.style.colorScheme=r?"dark":"light"}catch(x){}})();`;
