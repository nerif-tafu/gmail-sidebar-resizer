(function () {
  "use strict";

  const STORAGE_KEY = "sidebarWidth";
  const DEFAULT_WIDTH = 287;
  const MIN_WIDTH = 180;
  const MAX_WIDTH = 720;
  const RESIZER_ID = "gmail-sidebar-resizer";
  const SIDEBAR_CLASS = "gmail-sidebar-resizable";

  /** @type {number | null} */
  let savedWidth = null;
  /** @type {number | null} */
  let activeWidth = null;
  /** @type {HTMLElement | null} */
  let sidebar = null;
  /** @type {HTMLElement | null} */
  let resizer = null;
  /** @type {MutationObserver | null} */
  let styleGuard = null;
  /** @type {MutationObserver | null} */
  let labelGuard = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let expandTimer = null;
  let isDragging = false;

  const api = typeof browser !== "undefined" ? browser : chrome;

  function findSidebar() {
    const nav = document.querySelector('div[role="navigation"].WR');
    if (nav) return nav;
    const panels = document.querySelectorAll('div[role="navigation"]');
    for (const el of panels) {
      if (el.querySelector(".z0, .T-I-KE, .aim")) return el;
    }
    return panels[0] || null;
  }

  function readDesiredWidth() {
    if (!sidebar) return null;
    const fromData = parseInt(sidebar.dataset.gmailSidebarWidth, 10);
    if (Number.isFinite(fromData)) return fromData;
    const fromStyle = parseInt(sidebar.style.width, 10);
    if (Number.isFinite(fromStyle)) return fromStyle;
    return null;
  }

  function applyWidth(width) {
    if (!sidebar) return null;
    const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width)));
    activeWidth = clamped;
    sidebar.classList.add(SIDEBAR_CLASS);
    sidebar.style.setProperty("--gmail-sidebar-width", `${clamped}px`);
    sidebar.style.setProperty("width", `${clamped}px`, "important");
    sidebar.style.setProperty("min-width", `${clamped}px`, "important");
    sidebar.style.setProperty("max-width", `${clamped}px`, "important");
    sidebar.style.setProperty("flex", `0 0 ${clamped}px`, "important");
    sidebar.style.setProperty("flex-basis", `${clamped}px`, "important");
    sidebar.dataset.gmailSidebarWidth = String(clamped);
    syncContentInsets();
    return clamped;
  }

  /** Full-width label column; nudge unread counts inward to line up with Labels "+". */
  function syncContentInsets() {
    if (!sidebar) return;
    const sb = sidebar.getBoundingClientRect();
    const plus = sidebar.querySelector(".aAw .aAu");
    let countMarginRight = 0;
    if (plus) {
      const pr = plus.getBoundingClientRect();
      countMarginRight = Math.max(0, Math.round(sb.right - pr.right));
    }
    sidebar.style.setProperty(
      "--gmail-sidebar-count-margin-right",
      `${countMarginRight}px`
    );

    sidebar.querySelectorAll(".wT").forEach((el) => {
      el.style.setProperty("max-width", "100%", "important");
      el.style.setProperty("min-width", "0", "important");
      el.style.setProperty("width", "100%", "important");
      el.style.removeProperty("padding-right");
    });

    fixNestedRowWidths();
    alignKebabMenus();
  }

  /** Let .TN fill the bubble (.TO) without overflowing past it. */
  function fixNestedRowWidths() {
    if (!sidebar) return;
    sidebar.querySelectorAll(".TN").forEach((tn) => {
      const ml = parseInt(tn.style.marginLeft, 10) || 0;
      tn.style.setProperty("width", "100%", "important");
      tn.style.setProperty("max-width", "100%", "important");
      if (ml > 0) {
        tn.style.setProperty("width", "auto", "important");
      }
    });
  }

  /** When .TN is wider than the bubble (.TO), shift kebab left to the bubble edge. */
  function alignKebabMenus() {
    if (!sidebar) return;
    sidebar.querySelectorAll(".TO").forEach((row) => {
      const kebab = row.querySelector(".nL.aig");
      const tn = row.querySelector(".TN");
      if (!kebab || !tn) return;
      const rowRect = row.getBoundingClientRect();
      const tnRect = tn.getBoundingClientRect();
      const overflow = Math.max(0, Math.round(tnRect.right - rowRect.right));
      kebab.style.setProperty("right", `${6 + overflow}px`, "important");
    });
  }

  function scheduleLayoutSync() {
    if (expandTimer) clearTimeout(expandTimer);
    expandTimer = setTimeout(syncContentInsets, 50);
  }

  function watchLabelList() {
    if (!sidebar || labelGuard) return;
    labelGuard = new MutationObserver(() => scheduleLayoutSync());
    labelGuard.observe(sidebar, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style"],
    });
  }

  function persistWidth(width) {
    savedWidth = width;
    api.storage.local.set({ [STORAGE_KEY]: width });
  }

  function loadSavedWidth() {
    return api.storage.local.get(STORAGE_KEY).then((data) => {
      const w = data[STORAGE_KEY];
      if (typeof w === "number" && w >= MIN_WIDTH && w <= MAX_WIDTH) {
        savedWidth = w;
      } else {
        savedWidth = DEFAULT_WIDTH;
      }
    });
  }

  function ensurePositioned(el) {
    const pos = getComputedStyle(el).position;
    if (pos === "static") {
      el.style.position = "relative";
    }
  }

  function attachResizer() {
    if (!sidebar || resizer) return;
    ensurePositioned(sidebar);
    resizer = document.createElement("div");
    resizer.id = RESIZER_ID;
    resizer.setAttribute("role", "separator");
    resizer.setAttribute("aria-orientation", "vertical");
    resizer.setAttribute("aria-label", "Resize Gmail sidebar");
    resizer.tabIndex = 0;
    sidebar.appendChild(resizer);

    resizer.addEventListener("pointerdown", onDragStart, true);
    resizer.addEventListener("keydown", onKeyResize);
  }

  function onDragStart(event) {
    if (!sidebar || !resizer || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    isDragging = true;
    resizer.setPointerCapture(event.pointerId);

    const startX = event.clientX;
    const startWidth =
      readDesiredWidth() ||
      sidebar.getBoundingClientRect().width ||
      savedWidth ||
      DEFAULT_WIDTH;

    resizer.classList.add("gmail-sidebar-resizer--active");
    document.body.classList.add("gmail-sidebar-resizing");

    function onMove(e) {
      if (!sidebar) return;
      const next = startWidth + (e.clientX - startX);
      applyWidth(next);
      syncContentInsets();
    }

    function onEnd(e) {
      isDragging = false;
      if (resizer.hasPointerCapture(e.pointerId)) {
        resizer.releasePointerCapture(e.pointerId);
      }
      resizer.classList.remove("gmail-sidebar-resizer--active");
      document.body.classList.remove("gmail-sidebar-resizing");
      resizer.removeEventListener("pointermove", onMove);
      resizer.removeEventListener("pointerup", onEnd);
      resizer.removeEventListener("pointercancel", onEnd);

      const finalWidth =
        readDesiredWidth() || sidebar.getBoundingClientRect().width;
      persistWidth(finalWidth);
    }

    resizer.addEventListener("pointermove", onMove);
    resizer.addEventListener("pointerup", onEnd);
    resizer.addEventListener("pointercancel", onEnd);
  }

  function onKeyResize(event) {
    if (!sidebar) return;
    const step = event.shiftKey ? 40 : 10;
    let delta = 0;
    if (event.key === "ArrowRight") delta = step;
    else if (event.key === "ArrowLeft") delta = -step;
    else return;

    event.preventDefault();
    const current =
      readDesiredWidth() ||
      sidebar.getBoundingClientRect().width ||
      DEFAULT_WIDTH;
    const next = applyWidth(current + delta);
    if (next != null) persistWidth(next);
  }

  function watchStyleReset() {
    if (!sidebar || styleGuard) return;
    styleGuard = new MutationObserver(() => {
      if (!sidebar || isDragging) return;
      const desired = readDesiredWidth();
      if (desired == null) return;
      const current = Math.round(sidebar.getBoundingClientRect().width);
      if (Math.abs(current - desired) > 2) {
        applyWidth(desired);
      }
    });
    styleGuard.observe(sidebar, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
  }

  function initSidebar(el) {
    if (sidebar === el && resizer) return;
    sidebar = el;
    const initial =
      savedWidth ??
      readDesiredWidth() ??
      sidebar.getBoundingClientRect().width ??
      DEFAULT_WIDTH;
    applyWidth(initial);
    persistWidth(initial);
    if (!resizer) attachResizer();
    watchStyleReset();
    watchLabelList();
    scheduleLayoutSync();
  }

  function tryInit() {
    const el = findSidebar();
    if (el && el.getBoundingClientRect().width > 40) {
      initSidebar(el);
      return true;
    }
    return false;
  }

  function observeDom() {
    const rootObserver = new MutationObserver(() => {
      if (!sidebar || !document.contains(sidebar)) {
        sidebar = null;
        resizer = null;
        activeWidth = null;
        if (styleGuard) {
          styleGuard.disconnect();
          styleGuard = null;
        }
        if (labelGuard) {
          labelGuard.disconnect();
          labelGuard = null;
        }
      }
      if (!sidebar) tryInit();
    });
    rootObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  loadSavedWidth().then(() => {
    tryInit();
    observeDom();
  });
})();
