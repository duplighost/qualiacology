document.documentElement.classList.add("js");

const progress = document.querySelector("[data-scroll-progress]");
const header = document.querySelector(".site-header");

if (progress) {
  let scheduled = false;
  let maxScroll = 1;
  let needsMeasure = true;
  // Where the browser can drive the filament off a scroll timeline it already does
  // (see @keyframes filament). Writing transform here as well would scale it twice.
  const cssDrivesFilament = CSS.supports("animation-timeline", "scroll(root)");

  const paint = () => {
    if (!cssDrivesFilament) {
      if (needsMeasure) {
        maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        needsMeasure = false;
      }
      const ratio = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      progress.style.transform = `scaleX(${ratio})`;
    }
    header?.classList.toggle("is-top", window.scrollY < 8);
    scheduled = false;
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(paint);
  };

  const markForRemeasure = () => {
    needsMeasure = true;
    if (window.scrollY > 0) schedule();
  };

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", markForRemeasure, { passive: true });
  schedule();
}

// Which room are you standing in? The stylesheet asserts that the lit pilot light and
// the filament's colour both mean exactly this, so it has to be measured, not guessed
// from scroll percentages that go stale every time the seams change.
const rooms = [...document.querySelectorAll("#community, #game, #music, #connect")];

if (rooms.length && "IntersectionObserver" in window) {
  const seen = new Map();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => seen.set(entry.target.id, entry.isIntersecting));
    const here = rooms.find((room) => seen.get(room.id));
    if (here) document.body.dataset.here = here.id;
    else delete document.body.dataset.here;
  }, { rootMargin: "-45% 0px -45% 0px" });

  rooms.forEach((room) => observer.observe(room));
}

const menuButton = document.querySelector("[data-menu-open]");
const menuDialog = document.querySelector("[data-menu-dialog]");

if (menuButton && menuDialog) {
  const unlock = () => {
    document.body.classList.remove("menu-open");
    menuButton.setAttribute("aria-expanded", "false");
  };

  const closeMenu = () => {
    if (typeof menuDialog.close === "function" && menuDialog.open) {
      menuDialog.close();
    } else {
      menuDialog.removeAttribute("open");
      unlock();
      menuButton.focus();
    }
  };

  menuButton.addEventListener("click", () => {
    document.body.classList.add("menu-open");
    menuButton.setAttribute("aria-expanded", "true");
    if (typeof menuDialog.showModal === "function") {
      menuDialog.showModal();
    } else {
      menuDialog.setAttribute("open", "");
    }
    menuDialog.querySelector("[data-menu-close]")?.focus();
  });

  menuDialog.querySelector("[data-menu-close]")?.addEventListener("click", closeMenu);
  menuDialog.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  menuDialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = [...menuDialog.querySelectorAll("a[href], button:not([disabled])")]
      .filter((element) => element.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  menuDialog.addEventListener("close", () => {
    unlock();
    menuButton.focus();
  });
  menuDialog.addEventListener("cancel", unlock);
  menuDialog.addEventListener("pointerdown", (event) => {
    if (event.target === menuDialog) closeMenu();
  });
}

const filterButtons = [...document.querySelectorAll("[data-filter]")];
const filterItems = [...document.querySelectorAll("[data-filter-kind]")];
const filterStatus = document.querySelector("[data-filter-status]");

if (filterButtons.length && filterItems.length) {
  const allowed = new Set(filterButtons.map((button) => button.dataset.filter));

  // Where the reader was standing BEFORE the browser's own focus-scroll moved them.
  // Clicking a filter focuses it, and because .filter-shell is position: sticky the
  // browser treats the button as off-screen and scrolls to its LAYOUT position - which
  // is near the top of the section, hundreds of pixels from where you were reading.
  // That, not the document collapsing, is what threw you up the page. It fires on
  // pointerdown, before any of this runs, so it has to be captured there.
  let restoreTo = null;

  const applyFilter = (filter, updateUrl = true) => {
    const nextFilter = allowed.has(filter) ? filter : "all";
    const rail = document.querySelector(".filter-shell");
    let visible = 0;

    filterButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.filter === nextFilter));
    });

    // Filtering collapses the document under you. Measured on production before this
    // existed: pressing Horror at scrollY 3000 shrank the page from 8933px to 3198px,
    // the browser clamped scroll, and the rail you had just clicked landed hundreds of
    // pixels further down the viewport than the cursor that clicked it.
    //
    // Do NOT measure .filter-shell to detect this: it is position: sticky, so while it
    // is stuck its rect is constant and the before/after delta is always 0 - the
    // correction silently never fires, and whether that looks fine depends only on
    // whether the page happens to stay tall enough to keep the rail stuck.
    const grid = document.querySelector(".catalog-grid");

    filterItems.forEach((item) => {
      const show = nextFilter === "all" || item.dataset.filterKind === nextFilter;
      item.hidden = !show;
      if (show) visible += 1;
    });

    if (grid && restoreTo !== null) {
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      if (restoreTo <= maxScroll) {
        // Nothing forced the reader to move, so put them back exactly where they were.
        window.scrollTo({ top: restoreTo, behavior: "instant" });
      } else {
        // The shelf is now shorter than where they were standing, so their position
        // cannot be kept. Land them at the top of the shelf rather than at whatever the
        // clamp happened to leave. "instant" is mandatory: scroll-behavior: smooth would
        // animate the correction into an unexplained slide.
        const header = document.querySelector(".site-header");
        const chrome = (header ? header.getBoundingClientRect().height : 0)
          + (rail ? rail.getBoundingClientRect().height : 0);
        const gridTop = grid.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: Math.max(0, gridTop - chrome - 16), behavior: "instant" });
      }
    }

    if (filterStatus) {
      filterStatus.textContent = `Showing ${visible} ${visible === 1 ? "world" : "worlds"}.`;
    }

    if (updateUrl && window.history?.replaceState) {
      const url = new URL(window.location.href);
      if (nextFilter === "all") url.searchParams.delete("filter");
      else url.searchParams.set("filter", nextFilter);
      history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
  };

  const grid = document.querySelector(".catalog-grid");

  filterButtons.forEach((button) => {
    // Keyboard focus SHOULD scroll - a reader tabbing to the rail wants to see it - so
    // only a pointer press arms the restore.
    button.addEventListener("pointerdown", () => { restoreTo = window.scrollY; });
    button.addEventListener("keydown", () => { restoreTo = null; });

    button.addEventListener("click", () => {
      applyFilter(button.dataset.filter);
      restoreTo = null;
      // A result beat, so the shelf reads as having answered. Its own keyframe on the
      // inner card, never `rise` on the <li> — that one is bound to a view timeline.
      if (grid) {
        grid.classList.remove("is-filtering");
        void grid.offsetWidth;
        grid.classList.add("is-filtering");
      }
    });
  });

  document.querySelector(".catalog-grid")?.addEventListener("animationend", (event) => {
    if (event.animationName === "settle") grid?.classList.remove("is-filtering");
  });

  const initial = new URLSearchParams(window.location.search).get("filter") || "all";
  applyFilter(initial, false);
}

const audioButton = document.querySelector("[data-audio-toggle]");

if (audioButton) {
  let audio;
  let playing = false;
  const label = audioButton.querySelector("[data-audio-label]");

  const renderAudioState = () => {
    audioButton.setAttribute("aria-pressed", String(playing));
    if (label) label.textContent = playing ? "Sound on" : "Sound off";
  };

  audioButton.addEventListener("click", async () => {
    if (!audio) {
      audio = new Audio();
      audio.src = audioButton.dataset.audioSrc;
      audio.loop = true;
      audio.volume = 0.22;
      audio.preload = "none";
      audio.addEventListener("pause", () => {
        if (!audio.ended) {
          playing = false;
          renderAudioState();
        }
      });
    }

    if (playing) {
      audio.pause();
      playing = false;
      renderAudioState();
      return;
    }

    try {
      await audio.play();
      playing = true;
      renderAudioState();
    } catch {
      playing = false;
      renderAudioState();
    }
  });

  renderAudioState();
}

document.querySelectorAll("[data-current-year]").forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});
