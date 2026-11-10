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
  const lightboxStage = lightbox && lightbox.querySelector(".stage");
  let lightboxHome = null;

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

  document.querySelectorAll("[data-lightbox]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const picture = btn.querySelector("picture") || btn.querySelector("img");
      if (!picture || !lightbox) return;
      lightboxHome = { parent: picture.parentNode, next: picture.nextSibling };
      lightboxStage.appendChild(picture);
      if (typeof lightbox.showModal === "function") lightbox.showModal();
      else lightbox.setAttribute("open", "");
    });
  });

  function closeLightbox() {
    if (!lightboxHome) return;
    const node = lightboxStage.firstElementChild;
    if (node) {
      if (lightboxHome.next) lightboxHome.parent.insertBefore(node, lightboxHome.next);
      else lightboxHome.parent.appendChild(node);
    }
    lightboxHome = null;
    if (typeof lightbox.close === "function" && lightbox.open) lightbox.close();
    else lightbox.removeAttribute("open");
  }

  if (lightbox) {
    lightbox.querySelector(".close").addEventListener("click", closeLightbox);
    lightbox.addEventListener("close", function () {
      if (lightboxHome) closeLightbox();
    });
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }
})();
