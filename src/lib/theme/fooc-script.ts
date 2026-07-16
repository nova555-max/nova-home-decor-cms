import { THEME_STORAGE_KEY } from "@/lib/theme/config";

export const themeFoocScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var r=t==="dark"||(t==="system"&&d)||(!t&&d);var e=document.documentElement;e.classList.toggle("dark",r);e.style.colorScheme=r?"dark":"light";}catch(x){}})();`;
