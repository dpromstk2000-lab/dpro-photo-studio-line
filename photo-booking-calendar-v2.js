(() => {
  "use strict";

  const VERSION = "DPRO-PHOTO-RESERVATION-CALENDAR-V2-BRUSHUP-8-3-UI-20260919";
  const FALLBACK_API_BASE = "https://cbknucemarcpbscirzyv.supabase.co/functions/v1/dpro-photo-product-ready-gateway-v8";
  const C = window.DPRO_STUDIO || window.DPRO_PHOTO_STUDIO_CONFIG || null;
  if (!C) return;

  const state = {
    enabled: false,
    mounted: false,
    view: "month",
    anchor: "",
    days: [],
    loading: false,
    requestSeq: 0,
    config: null,
    abort: null,
  };

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch]);

  function apiBase() {
    return String(C.CALENDAR_API_BASE_URL || FALLBACK_API_BASE).replace(/\/+$/, "");
  }

  async function publicGet(path, query = {}) {
    const url = new URL(`${apiBase()}${path}`);
    Object.entries(query).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) url.searchParams.set(key, String(value));
    });
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: state.abort?.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok === false) {
      const error = new Error(data?.error || data?.message || `HTTP ${response.status}`);
      error.code = data?.code || `HTTP_${response.status}`;
      throw error;
    }
    return data;
  }

  function dateObj(ymd) {
    return new Date(`${ymd}T00:00:00Z`);
  }

  function ymd(date) {
    return date.toISOString().slice(0, 10);
  }

  function addDays(ymdValue, amount) {
    const d = dateObj(ymdValue);
    d.setUTCDate(d.getUTCDate() + amount);
    return ymd(d);
  }

  function monthShift(ymdValue, amount) {
    const d = dateObj(ymdValue);
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + amount);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, last));
    return ymd(d);
  }

  function startOfWeek(ymdValue) {
    const d = dateObj(ymdValue);
    d.setUTCDate(d.getUTCDate() - d.getUTCDay());
    return ymd(d);
  }

  function formatMonth(ymdValue) {
    const d = dateObj(ymdValue);
    return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月`;
  }

  function formatDay(ymdValue, withYear = false) {
    const d = dateObj(ymdValue);
    const w = ["日", "月", "火", "水", "木", "金", "土"][d.getUTCDay()];
    return `${withYear ? `${d.getUTCFullYear()}年` : ""}${d.getUTCMonth() + 1}月${d.getUTCDate()}日（${w}）`;
  }

  function nativeDate() {
    return $("reservationDate");
  }

  function selectedPlanId() {
    return document.querySelector("#planGrid [data-plan-id].is-selected")?.dataset?.planId || "";
  }

  function selectedStaffId() {
    return document.querySelector('#staffGrid input[name="staffChoice"]:checked')?.value || "";
  }

  function limits() {
    const input = nativeDate();
    return { min: input?.min || "", max: input?.max || "" };
  }

  function clampAnchor(value) {
    const { min, max } = limits();
    let v = value || min || C.todayYmd?.() || new Date().toISOString().slice(0, 10);
    if (min && v < min) v = min;
    if (max && v > max) v = max;
    return v;
  }

  function viewRange() {
    const a = clampAnchor(state.anchor);
    if (state.view === "month") {
      const d = dateObj(a);
      d.setUTCDate(1);
      const first = ymd(d);
      const from = startOfWeek(first);
      return { from, to: addDays(from, 41) };
    }
    if (state.view === "week") {
      const from = startOfWeek(a);
      return { from, to: addDays(from, 6) };
    }
    if (state.view === "day") return { from: a, to: a };
    return { from: a, to: addDays(a, 27) };
  }

  function statusMeta(status) {
    return ({
      available: { mark: "○", label: "空きあり", cls: "available" },
      limited: { mark: "△", label: "残りわずか", cls: "limited" },
      full: { mark: "×", label: "受付終了", cls: "full" },
      closed: { mark: "休", label: "受付なし", cls: "closed" },
      out_of_range: { mark: "—", label: "受付期間外", cls: "out" },
    })[status] || { mark: "—", label: "確認中", cls: "out" };
  }

  function canSelect(day) {
    return day && (day.status === "available" || day.status === "limited");
  }

  function currentMonthKey() {
    return clampAnchor(state.anchor).slice(0, 7);
  }

  function panelHtml() {
    return `
      <section id="dproCalendarV2" class="dpro-cal" aria-label="撮影日カレンダー">
        <div class="dpro-cal-head">
          <div>
            <span class="dpro-cal-kicker">予約カレンダー</span>
            <h3 id="dproCalendarCaption">撮影日を選択</h3>
          </div>
          <div class="dpro-cal-nav" aria-label="カレンダー移動">
            <button id="dproCalendarPrev" type="button" class="dpro-cal-icon" aria-label="前へ">‹</button>
            <button id="dproCalendarToday" type="button" class="dpro-cal-today">今日</button>
            <button id="dproCalendarNext" type="button" class="dpro-cal-icon" aria-label="次へ">›</button>
          </div>
        </div>

        <div id="dproCalendarViews" class="dpro-cal-views" aria-label="表示切替"></div>

        <div class="dpro-cal-legend" aria-label="空き状況の凡例">
          <span><b class="is-available">○</b>空きあり</span>
          <span><b class="is-limited">△</b>残りわずか</span>
          <span><b class="is-full">×</b>受付終了</span>
          <span><b class="is-closed">休</b>受付なし</span>
        </div>

        <div id="dproCalendarBody" class="dpro-cal-body">
          <div class="dpro-cal-empty">撮影プランを選択するとカレンダーが表示されます。</div>
        </div>

        <div id="dproCalendarFoot" class="dpro-cal-foot">
          日付を選択すると、その日の正確な空き時間を確認します。
        </div>
      </section>`;
  }

  function enabledViews() {
    const configured = state.config?.settings?.ui_settings?.booking_v2?.enabled_views;
    const allowed = ["month", "week", "day", "list"];
    const views = Array.isArray(configured) ? configured.filter((x) => allowed.includes(x)) : allowed;
    return views.length ? views : ["month"];
  }

  function viewLabel(view) {
    return ({ month: "月", week: "週", day: "日", list: "一覧" })[view] || view;
  }

  function renderViewButtons() {
    const root = $("dproCalendarViews");
    if (!root) return;
    const views = enabledViews();
    if (!views.includes(state.view)) state.view = views[0];
    root.innerHTML = views.map((view) =>
      `<button type="button" class="dpro-cal-view ${state.view === view ? "is-active" : ""}" data-calendar-view="${view}" aria-pressed="${state.view === view}">${viewLabel(view)}</button>`
    ).join("");
  }

  function renderLoading() {
    const body = $("dproCalendarBody");
    if (body) body.innerHTML = `<div class="dpro-cal-empty"><span class="dpro-cal-spinner"></span>空き状況を確認しています</div>`;
  }

  function captionText() {
    const a = clampAnchor(state.anchor);
    if (state.view === "month") return formatMonth(a);
    if (state.view === "week") {
      const from = startOfWeek(a);
      return `${formatDay(from)} 〜 ${formatDay(addDays(from, 6))}`;
    }
    if (state.view === "day") return formatDay(a, true);
    return `${formatDay(a)} から28日間`;
  }

  function dayInner(day, compact = false) {
    const meta = statusMeta(day.status);
    const d = dateObj(day.date);
    const selected = nativeDate()?.value === day.date;
    const monthOutside = state.view === "month" && day.date.slice(0, 7) !== currentMonthKey();
    const firstTime = day.first_available_time && state.config?.settings?.ui_settings?.booking_v2?.show_first_available_time_in_month !== false
      ? `${day.first_available_time}〜`
      : "";
    const event = day.event?.title ? `<span class="dpro-cal-event">${esc(day.event.title)}</span>` : "";
    const reason = day.reason && !compact ? `<small class="dpro-cal-reason">${esc(day.reason)}</small>` : "";
    return `
      <button type="button"
        class="dpro-cal-day is-${meta.cls} ${selected ? "is-selected" : ""} ${monthOutside ? "is-outside" : ""}"
        data-calendar-date="${esc(day.date)}"
        ${canSelect(day) ? "" : "disabled"}
        aria-label="${esc(`${formatDay(day.date)} ${meta.label}${day.available_slot_count ? ` ${day.available_slot_count}枠` : ""}`)}">
        <span class="dpro-cal-date">${d.getUTCDate()}</span>
        <span class="dpro-cal-status"><b>${meta.mark}</b><em>${meta.label}</em></span>
        ${day.available_slot_count > 0 ? `<span class="dpro-cal-count">${day.available_slot_count}枠</span>` : ""}
        ${firstTime ? `<span class="dpro-cal-first">${esc(firstTime)}</span>` : ""}
        ${event}
        ${reason}
      </button>`;
  }

  function renderMonth() {
    const body = $("dproCalendarBody");
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    body.innerHTML = `
      <div class="dpro-cal-weekdays">${weekdays.map((x) => `<span>${x}</span>`).join("")}</div>
      <div class="dpro-cal-month-grid">${state.days.map((day) => dayInner(day, true)).join("")}</div>`;
  }

  function renderWeek() {
    $("dproCalendarBody").innerHTML = `<div class="dpro-cal-week-grid">${state.days.map((day) => {
      const meta = statusMeta(day.status);
      return `<article class="dpro-cal-row is-${meta.cls}">
        <div class="dpro-cal-row-date"><strong>${esc(formatDay(day.date))}</strong>${day.event?.title ? `<span>${esc(day.event.title)}</span>` : ""}</div>
        <div class="dpro-cal-row-state"><b>${meta.mark}</b><span>${meta.label}</span>${day.available_slot_count ? `<small>${day.available_slot_count}枠</small>` : ""}</div>
        <button type="button" data-calendar-date="${esc(day.date)}" ${canSelect(day) ? "" : "disabled"}>${canSelect(day) ? "この日を選ぶ" : "選択不可"}</button>
      </article>`;
    }).join("")}</div>`;
  }

  function renderDay() {
    const day = state.days[0];
    if (!day) return;
    const meta = statusMeta(day.status);
    $("dproCalendarBody").innerHTML = `<div class="dpro-cal-focus is-${meta.cls}">
      <div class="dpro-cal-focus-mark">${meta.mark}</div>
      <div>
        <h4>${esc(formatDay(day.date, true))}</h4>
        <p>${esc(meta.label)}${day.available_slot_count ? `｜${day.available_slot_count}枠` : ""}</p>
        ${day.first_available_time ? `<p class="dpro-cal-focus-time">最初の空き ${esc(day.first_available_time)}〜</p>` : ""}
        ${day.event?.title ? `<p class="dpro-cal-focus-event">${esc(day.event.title)}</p>` : ""}
        ${day.reason ? `<small>${esc(day.reason)}</small>` : ""}
      </div>
      <button type="button" data-calendar-date="${esc(day.date)}" ${canSelect(day) ? "" : "disabled"}>${canSelect(day) ? "この日を選ぶ" : "選択できません"}</button>
    </div>`;
  }

  function renderList() {
    $("dproCalendarBody").innerHTML = `<div class="dpro-cal-list">${state.days.map((day) => {
      const meta = statusMeta(day.status);
      return `<button type="button" class="dpro-cal-list-item is-${meta.cls}" data-calendar-date="${esc(day.date)}" ${canSelect(day) ? "" : "disabled"}>
        <span class="dpro-cal-list-date">${esc(formatDay(day.date))}</span>
        <span class="dpro-cal-list-status"><b>${meta.mark}</b>${meta.label}</span>
        <span class="dpro-cal-list-count">${day.available_slot_count ? `${day.available_slot_count}枠` : ""}</span>
        <span class="dpro-cal-list-time">${day.first_available_time ? `${esc(day.first_available_time)}〜` : ""}</span>
      </button>`;
    }).join("")}</div>`;
  }

  function renderBody() {
    const caption = $("dproCalendarCaption");
    if (caption) caption.textContent = captionText();
    renderViewButtons();
    if (state.view === "month") renderMonth();
    else if (state.view === "week") renderWeek();
    else if (state.view === "day") renderDay();
    else renderList();
  }

  function showLegacyFallback(message) {
    const dateCard = document.querySelector('[data-step="3"] .date-card');
    if (dateCard) dateCard.hidden = false;
    const body = $("dproCalendarBody");
    if (body) body.innerHTML = `<div class="dpro-cal-error"><strong>カレンダーを読み込めませんでした。</strong><span>${esc(message || "従来の日付選択をご利用ください。")}</span></div>`;
  }

  async function refresh({ preserveAnchor = true } = {}) {
    if (!state.enabled || !state.mounted) return;
    const planId = selectedPlanId();
    if (!planId) {
      state.days = [];
      $("dproCalendarBody").innerHTML = `<div class="dpro-cal-empty">先に撮影プランを選択してください。</div>`;
      return;
    }

    const { min } = limits();
    if (!preserveAnchor || !state.anchor) state.anchor = clampAnchor(nativeDate()?.value || min || "");
    else state.anchor = clampAnchor(state.anchor);

    const range = viewRange();
    const seq = ++state.requestSeq;
    if (state.abort) state.abort.abort();
    state.abort = new AbortController();
    renderLoading();

    try {
      const data = await publicGet("/api/public/calendar-summary", {
        from: range.from,
        to: range.to,
        plan_id: planId,
        staff_id: selectedStaffId(),
      });
      if (seq !== state.requestSeq) return;
      state.days = Array.isArray(data.days) ? data.days : [];
      const dateCard = document.querySelector('[data-step="3"] .date-card');
      if (dateCard) dateCard.hidden = true;
      renderBody();
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.warn("DPRO Calendar V2 summary failed", error);
      showLegacyFallback(error.message);
    }
  }

  function chooseDate(date) {
    const day = state.days.find((x) => x.date === date);
    if (!canSelect(day)) return;
    const input = nativeDate();
    if (!input) return;
    input.value = date;
    state.anchor = date;
    renderBody();
    input.dispatchEvent(new Event("change", { bubbles: true }));
    $("availabilityState")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function move(direction) {
    if (state.view === "month") state.anchor = monthShift(clampAnchor(state.anchor), direction);
    else if (state.view === "week") state.anchor = addDays(clampAnchor(state.anchor), direction * 7);
    else if (state.view === "day") state.anchor = addDays(clampAnchor(state.anchor), direction);
    else state.anchor = addDays(clampAnchor(state.anchor), direction * 28);
    state.anchor = clampAnchor(state.anchor);
    refresh();
  }

  function goToday() {
    state.anchor = clampAnchor(C.todayYmd?.() || new Date().toISOString().slice(0, 10));
    refresh();
  }

  function bind() {
    $("dproCalendarPrev")?.addEventListener("click", () => move(-1));
    $("dproCalendarNext")?.addEventListener("click", () => move(1));
    $("dproCalendarToday")?.addEventListener("click", goToday);

    $("dproCalendarViews")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-calendar-view]");
      if (!button) return;
      state.view = button.dataset.calendarView;
      localStorage.setItem("dpro-photo-calendar-v2-view", state.view);
      refresh();
    });

    $("dproCalendarBody")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-calendar-date]");
      if (!button || button.disabled) return;
      chooseDate(button.dataset.calendarDate);
    });

    $("planGrid")?.addEventListener("click", () => {
      window.setTimeout(() => {
        state.anchor = clampAnchor(nativeDate()?.value || limits().min || "");
        refresh({ preserveAnchor: false });
      }, 0);
    });

    $("staffGrid")?.addEventListener("change", (event) => {
      if (event.target?.name === "staffChoice") window.setTimeout(() => refresh(), 0);
    });

    nativeDate()?.addEventListener("change", () => {
      if (!state.enabled) return;
      if (nativeDate().value) state.anchor = nativeDate().value;
      if (state.days.length) renderBody();
    });
  }

  function mount() {
    if (state.mounted) return;
    const dateCard = document.querySelector('[data-step="3"] .date-card');
    if (!dateCard) return;
    state.mounted = true;
    const wrap = document.createElement("div");
    wrap.innerHTML = panelHtml();
    const root = wrap.firstElementChild;
    dateCard.parentNode.insertBefore(root, dateCard);
    dateCard.hidden = true;

    const saved = localStorage.getItem("dpro-photo-calendar-v2-view");
    const defaults = state.config?.settings?.ui_settings?.booking_v2?.default_view || "month";
    state.view = ["month", "week", "day", "list"].includes(saved) ? saved : defaults;
    state.anchor = clampAnchor(nativeDate()?.value || limits().min || "");
    bind();
    refresh({ preserveAnchor: false });
  }

  async function boot() {
    try {
      const config = await publicGet("/api/public/config");
      state.config = config || null;
      state.enabled = config?.settings?.feature_flags?.reservation_calendar_v2 === true;
      if (!state.enabled) return;
      mount();
    } catch (error) {
      console.warn("DPRO Calendar V2 boot skipped", error);
    }
  }

  function start() {
    const timer = window.setInterval(() => {
      if (nativeDate() && $("planGrid")) {
        window.clearInterval(timer);
        boot();
      }
    }, 100);
    window.setTimeout(() => window.clearInterval(timer), 15000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.DPRO_PHOTO_BOOKING_CALENDAR_V2 = Object.freeze({
    version: VERSION,
    refresh: () => refresh(),
  });
})();
