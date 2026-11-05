(function () {
  var preference = "system";
  try { preference = globalThis.localStorage.getItem("ptitgo-admin-theme") || "system"; } catch { /* Storage may be disabled. */ }
  var dark = preference === "dark" || (preference !== "light" && preference !== "dark" && globalThis.matchMedia("(prefers-color-scheme: dark)").matches);
  globalThis.document.documentElement.dataset.theme = dark ? "dark" : "light";
  globalThis.document.documentElement.style.colorScheme = dark ? "dark" : "light";
})();
