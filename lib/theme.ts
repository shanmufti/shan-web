export const THEME_STORAGE_KEY = "theme";

/**
 * Runs in <head> before first paint so dark mode never flashes.
 * Explicit choice in localStorage wins; otherwise follow the OS setting.
 * Lives outside the "use client" toggle so the server layout gets the string,
 * not a client reference.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
