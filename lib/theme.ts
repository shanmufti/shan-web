export const THEME_STORAGE_KEY = "theme";

/**
 * Runs in <head> before first paint so dark mode never flashes.
 * Light is the default; dark only when the visitor chose it with the toggle.
 * Lives outside the "use client" toggle so the server layout gets the string,
 * not a client reference.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark";document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
