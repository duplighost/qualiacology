document.documentElement.classList.add("js");

const progress = document.querySelector("[data-scroll-progress]");
const header = document.querySelector(".site-header");

if (progress) {
  let scheduled = false;
  let maxScroll = 1;
  let needsMeasure = true;

  const paint = () => {
    if (needsMeasure) {
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      needsMeasure = false;
    }
    const ratio = Math.min(1, Math.max(0, window.scrollY / maxScroll));
    progress.style.transform = `scaleX(${ratio})`;
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

  const applyFilter = (filter, updateUrl = true) => {
    const nextFilter = allowed.has(filter) ? filter : "all";
    let visible = 0;

    filterButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.filter === nextFilter));
    });

    filterItems.forEach((item) => {
      const show = nextFilter === "all" || item.dataset.filterKind === nextFilter;
      item.hidden = !show;
      if (show) visible += 1;
    });

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

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => applyFilter(button.dataset.filter));
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
