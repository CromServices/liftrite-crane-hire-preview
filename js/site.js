(function () {
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const CRANES = {
    at20: { label: "AT20 Franna", title: "AT20 Terex Franna" },
    kobelco: { label: "RK160-2 Kobelco", title: "RK160-2 Kobelco" },
  };

  const themeBtn = document.querySelector(".theme-toggle");
  const dateGroup = document.getElementById("date-group");
  const timeGroup = document.getElementById("time-group");
  const craneGroup = document.getElementById("crane-group");
  const jobGroup = document.getElementById("job-group");
  const summaryEl = document.getElementById("book-summary");
  const form = document.getElementById("book-form");
  const errorEl = document.getElementById("form-error");
  const successEl = document.getElementById("book-success");
  const craneCards = document.querySelectorAll("[data-crane-card]");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const lightboxCount = document.getElementById("lightbox-count");
  const lightboxClose = lightbox && lightbox.querySelector(".lightbox-close");
  const lightboxPrev = lightbox && lightbox.querySelector(".lightbox-prev");
  const lightboxNext = lightbox && lightbox.querySelector(".lightbox-next");
  const galleryItems = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox]"));
  let lightboxIndex = 0;
  let lightboxReturn = null;
  let swipeX = 0;
  let swipeY = 0;

  function applyTheme(theme, persist) {
    document.documentElement.setAttribute("data-theme", theme);
    if (persist) {
      try {
        localStorage.setItem("theme", theme);
      } catch (e) {}
    }
  }

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      applyTheme(currentTheme() === "dark" ? "light" : "dark", true);
    });
  }

  function formatSummaryDate(iso) {
    const d = new Date(iso + "T00:00:00");
    return DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()];
  }

  function selected(group) {
    if (!group) return null;
    return group.querySelector('[role="radio"][aria-checked="true"]:not(:disabled)');
  }

  function enabledRadios(group) {
    return Array.prototype.filter.call(group.querySelectorAll('[role="radio"]'), function (el) {
      return !el.disabled && el.getAttribute("aria-disabled") !== "true";
    });
  }

  function selectRadio(btn, group, focus) {
    if (!btn || btn.disabled) return;
    group.querySelectorAll('[role="radio"]').forEach(function (el) {
      el.setAttribute("aria-checked", el === btn ? "true" : "false");
      el.classList.toggle("is-on", el === btn);
      el.tabIndex = el === btn ? 0 : -1;
    });
    if (focus) btn.focus();
    if (group === craneGroup) syncCraneCards(btn.getAttribute("data-crane"));
    updateSummary();
  }

  function syncCraneCards(key) {
    craneCards.forEach(function (card) {
      const on = card.getAttribute("data-crane-card") === key;
      card.classList.toggle("is-on", on);
      card.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function bindRadioGroup(group) {
    if (!group) return;
    group.addEventListener("click", function (e) {
      const btn = e.target.closest('[role="radio"]');
      if (!btn || !group.contains(btn) || btn.disabled) return;
      selectRadio(btn, group, false);
    });
    group.addEventListener("keydown", function (e) {
      const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
      if (!keys.includes(e.key)) return;
      const items = enabledRadios(group);
      if (!items.length) return;
      e.preventDefault();
      let current = items.indexOf(document.activeElement);
      if (current < 0) {
        const sel = selected(group);
        current = sel ? items.indexOf(sel) : 0;
      }
      let next = current;
      if (e.key === "Home") next = 0;
      else if (e.key === "End") next = items.length - 1;
      else if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (current + 1) % items.length;
      else next = (current - 1 + items.length) % items.length;
      selectRadio(items[next], group, true);
    });
  }

  function buildDates() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateGroup.innerHTML = "";
    let firstWeekday = null;
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const weekend = d.getDay() === 0 || d.getDay() === 6;
      const iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", "false");
      btn.dataset.iso = iso;
      btn.tabIndex = -1;
      if (weekend) {
        btn.disabled = true;
        btn.setAttribute("aria-disabled", "true");
        btn.setAttribute("aria-label", formatSummaryDate(iso) + ", weekend unavailable");
      } else {
        btn.setAttribute("aria-label", formatSummaryDate(iso));
        if (!firstWeekday) firstWeekday = btn;
      }
      btn.innerHTML =
        '<span class="dow">' + DAYS[d.getDay()] + "</span>" +
        '<span class="dom">' + d.getDate() + "</span>" +
        '<span class="mon">' + MONTHS[d.getMonth()] + "</span>";
      dateGroup.appendChild(btn);
    }
    if (firstWeekday) selectRadio(firstWeekday, dateGroup, false);
  }

  function updateSummary() {
    const dateBtn = selected(dateGroup);
    const timeBtn = selected(timeGroup);
    const craneBtn = selected(craneGroup);
    const parts = [];
    if (dateBtn) parts.push(formatSummaryDate(dateBtn.dataset.iso));
    if (timeBtn) parts.push(timeBtn.textContent.trim());
    if (craneBtn) parts.push(CRANES[craneBtn.dataset.crane].label);
    summaryEl.textContent = parts.join(", ");
  }

  function setCrane(key, scroll) {
    const btn = craneGroup.querySelector('[data-crane="' + key + '"]');
    if (btn) selectRadio(btn, craneGroup, false);
    if (scroll) {
      const book = document.getElementById("book");
      if (book) book.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  craneCards.forEach(function (card) {
    card.addEventListener("click", function () {
      setCrane(card.getAttribute("data-crane-card"), true);
    });
  });

  bindRadioGroup(dateGroup);
  bindRadioGroup(timeGroup);
  bindRadioGroup(craneGroup);
  bindRadioGroup(jobGroup);
  buildDates();
  const defaultTime = timeGroup.querySelector('[data-time="Afternoon"]') || enabledRadios(timeGroup)[0];
  if (defaultTime) selectRadio(defaultTime, timeGroup, false);
  setCrane("at20", false);
  updateSummary();

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    errorEl.textContent = "";
    const name = form.elements.name.value.trim();
    const phone = form.elements.phone.value.trim();
    const address = form.elements.address.value.trim();
    const dateBtn = selected(dateGroup);
    const timeBtn = selected(timeGroup);
    const craneBtn = selected(craneGroup);
    const missing = [];
    if (!craneBtn) missing.push("a crane");
    if (!dateBtn) missing.push("a weekday");
    if (!timeBtn) missing.push("a time window");
    if (!name) missing.push("your name");
    if (!phone) missing.push("a phone number");
    if (!address) missing.push("the site address");
    if (missing.length) {
      errorEl.textContent = "Please add " + missing.join(", ").replace(/, ([^,]*)$/, " and $1") + ".";
      return;
    }
    if (!/[0-9]{8,}/.test(phone.replace(/\s+/g, ""))) {
      errorEl.textContent = "Please enter a phone number we can call.";
      form.elements.phone.focus();
      return;
    }
    form.classList.add("is-sent");
    successEl.classList.add("is-on");
    successEl.focus();
  });

  function largestSrc(btn) {
    const source = btn.querySelector('source[type="image/webp"]');
    const srcset = source ? source.getAttribute("srcset") || "" : "";
    let best = "";
    let bestW = 0;
    srcset.split(",").forEach(function (part) {
      const bits = part.trim().split(/\s+/);
      const w = parseInt(bits[1], 10) || 0;
      if (bits[0] && w >= bestW) {
        bestW = w;
        best = bits[0];
      }
    });
    if (!best) {
      const img = btn.querySelector("img");
      best = img ? img.getAttribute("src") : "";
    }
    return best;
  }

  function fitLightboxImage() {
    if (!lightboxImg || !lightboxImg.naturalWidth) return;
    const maxW = window.innerWidth * 0.9;
    const maxH = window.innerWidth <= 800 ? window.innerHeight * 0.68 : window.innerHeight * 0.85;
    const scale = Math.min(maxW / lightboxImg.naturalWidth, maxH / lightboxImg.naturalHeight);
    lightboxImg.style.width = Math.round(lightboxImg.naturalWidth * scale) + "px";
    lightboxImg.style.height = Math.round(lightboxImg.naturalHeight * scale) + "px";
  }

  function renderLightbox() {
    const btn = galleryItems[lightboxIndex];
    if (!btn || !lightboxImg) return;
    const thumb = btn.querySelector("img");
    lightboxImg.removeAttribute("src");
    lightboxImg.alt = thumb ? thumb.alt : "";
    lightboxCaption.textContent = thumb ? thumb.alt : "";
    lightboxCount.textContent = lightboxIndex + 1 + " / " + galleryItems.length;
    lightboxImg.onload = fitLightboxImage;
    lightboxImg.src = largestSrc(btn);
    if (lightboxImg.complete) fitLightboxImage();
  }

  function lockScroll(lock) {
    document.documentElement.style.overflow = lock ? "hidden" : "";
    document.body.style.overflow = lock ? "hidden" : "";
  }

  function closeLightbox() {
    if (!lightbox) return;
    if (lightboxImg) {
      lightboxImg.removeAttribute("src");
      lightboxImg.removeAttribute("style");
    }
    lockScroll(false);
    if (typeof lightbox.close === "function" && lightbox.open) lightbox.close();
    else lightbox.removeAttribute("open");
    if (lightboxReturn && typeof lightboxReturn.focus === "function") lightboxReturn.focus();
    lightboxReturn = null;
  }

  function openLightbox(i) {
    if (!lightbox || !galleryItems.length) return;
    lightboxIndex = (i + galleryItems.length) % galleryItems.length;
    lightboxReturn = galleryItems[lightboxIndex];
    renderLightbox();
    lockScroll(true);
    if (typeof lightbox.showModal === "function") lightbox.showModal();
    else lightbox.setAttribute("open", "");
    if (lightboxClose) lightboxClose.focus();
  }

  function stepLightbox(dir) {
    lightboxIndex = (lightboxIndex + dir + galleryItems.length) % galleryItems.length;
    renderLightbox();
  }

  function lightboxFocusables() {
    return [lightboxClose, lightboxPrev, lightboxNext].filter(Boolean);
  }

  galleryItems.forEach(function (btn, i) {
    btn.addEventListener("click", function () {
      openLightbox(i);
    });
  });

  if (lightbox) {
    lightboxClose.addEventListener("click", function (e) {
      e.stopPropagation();
      closeLightbox();
    });
    lightboxPrev.addEventListener("click", function (e) {
      e.stopPropagation();
      stepLightbox(-1);
    });
    lightboxNext.addEventListener("click", function (e) {
      e.stopPropagation();
      stepLightbox(1);
    });
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox || e.target.classList.contains("lightbox-figure") || e.target.classList.contains("lightbox-meta")) {
        closeLightbox();
      }
    });
    lightbox.addEventListener("close", function () {
      if (lightboxImg && lightboxImg.getAttribute("src")) closeLightbox();
      else lockScroll(false);
    });
    lightbox.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeLightbox();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        stepLightbox(1);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepLightbox(-1);
        return;
      }
      if (e.key === "Tab") {
        const items = lightboxFocusables();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
    lightbox.addEventListener("touchstart", function (e) {
      const t = e.changedTouches[0];
      swipeX = t.clientX;
      swipeY = t.clientY;
    }, { passive: true });
    lightbox.addEventListener("touchend", function (e) {
      const t = e.changedTouches[0];
      const dx = t.clientX - swipeX;
      const dy = t.clientY - swipeY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        stepLightbox(dx < 0 ? 1 : -1);
      } else if (dy > 60 && Math.abs(dy) > Math.abs(dx)) {
        closeLightbox();
      }
    }, { passive: true });
    window.addEventListener("resize", function () {
      if (lightbox.open) fitLightboxImage();
    });
  }
})();
