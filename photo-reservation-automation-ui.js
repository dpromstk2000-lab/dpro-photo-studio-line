(() => {
  "use strict";

  const C = window.DPRO_STUDIO || window.DPRO_PHOTO_STUDIO_CONFIG;
  if (!C || !document.getElementById("view-settings")) return;

  const VERSION = "DPRO-PHOTO-RESERVATION-AUTOMATION-UI-PHASE1-20261006";
  const API = C.CALENDAR_API_BASE_URL;
  const esc = (v) => C.escapeHtml(v ?? "");
  const token = () => String(C.getSessionToken("owner") || "").trim();
  let state = null;
  let loading = false;

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        "X-Owner-Session": token(),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.ok === false) {
      const error = new Error(payload?.error || payload?.message || `HTTP ${response.status}`);
      error.code = payload?.code || "";
      throw error;
    }
    return payload;
  }

  function addStyle() {
    if (document.getElementById("photoReservationAutomationStyle")) return;
    const style = document.createElement("style");
    style.id = "photoReservationAutomationStyle";
    style.textContent = `
      .ra-note{margin:0 0 14px;padding:12px 14px;border:1px solid #cfe2dc;border-radius:12px;background:#f3faf7;color:#355f57;font-size:12px;line-height:1.7}
      .ra-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .ra-card{border:1px solid var(--line,#dfe7e5);border-radius:14px;background:#fff;padding:14px}
      .ra-card h4{margin:0;font-size:15px}
      .ra-card p{margin:5px 0 0;color:var(--muted,#647b78);font-size:11px;line-height:1.6}
      .ra-setting{display:grid;grid-template-columns:minmax(0,1fr) 180px;gap:12px;align-items:end;margin-top:12px}
      .ra-setting label{font-size:11px;font-weight:850;color:#355f57}
      .ra-setting select{width:100%;margin-top:5px}
      .ra-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:14px 0}
      .ra-stat{border:1px solid var(--line,#dfe7e5);border-radius:12px;background:#fbfcfc;padding:11px}
      .ra-stat span{display:block;color:var(--muted,#647b78);font-size:10px}
      .ra-stat strong{display:block;margin-top:3px;font-size:18px}
      .ra-section{margin-top:16px;padding-top:16px;border-top:1px solid var(--line,#dfe7e5)}
      .ra-section-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:9px}
      .ra-section-head h4{margin:0;font-size:14px}
      .ra-list{display:grid;gap:7px}
      .ra-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 11px;border:1px solid var(--line,#dfe7e5);border-radius:11px;background:#fff}
      .ra-row strong{font-size:12px}
      .ra-row small{display:block;margin-top:3px;color:var(--muted,#647b78);font-size:10px;line-height:1.5}
      .ra-badge{display:inline-flex;padding:3px 7px;border-radius:999px;background:#edf6f3;color:#275f55;font-size:9px;font-weight:900;white-space:nowrap}
      .ra-badge.warn{background:#fff4df;color:#8a5b14}
      .ra-badge.red{background:#f9eaea;color:#9a3f3f}
      .ra-badge.gray{background:#f1f3f2;color:#68736f}
      .ra-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
      .ra-empty{padding:18px;border:1px dashed var(--line,#dfe7e5);border-radius:12px;color:var(--muted,#647b78);text-align:center;font-size:11px}
      .ra-off{padding:14px;border:1px dashed #cfdad7;border-radius:12px;background:#fafcfc;color:#5c706c;font-size:12px;line-height:1.7}
      @media(max-width:800px){.ra-grid{grid-template-columns:1fr}.ra-stats{grid-template-columns:repeat(2,1fr)}.ra-setting{grid-template-columns:1fr}.ra-row{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    addStyle();
    let panel = document.getElementById("ownerReservationAutomationPanel");
    if (panel) return panel;

    const content = document.getElementById("settingsV2Content");
    if (!content) return null;

    panel = document.createElement("section");
    panel.id = "ownerReservationAutomationPanel";
    panel.className = "panel";
    panel.dataset.settingsGroup = "automation";
    panel.innerHTML = `
      <div class="panel-head">
        <div>
          <h3>予約自動化</h3>
          <p>「使う機能」でONにした予約機能だけを、ここで設定・確認します。</p>
        </div>
        <div class="page-actions">
          <button id="raReload" class="btn btn-secondary btn-small" type="button">再読込</button>
          <button id="raProcessNow" class="btn btn-neutral btn-small" type="button">今すぐ確認</button>
          <button id="raSave" class="btn btn-primary btn-small" type="button">設定を保存</button>
        </div>
      </div>
      <p class="ra-note">自動処理は15分ごとに確認します。デモ環境ではLINEへ外部送信せず、送信予定文面と履歴だけを安全に記録します。</p>
      <div id="raSettings"></div>
      <div id="raStats" class="ra-stats"></div>
      <div class="ra-section">
        <div class="ra-section-head"><h4>来店前リマインド履歴</h4><span id="raReminderCount" class="ra-badge gray">0件</span></div>
        <div id="raReminderList" class="ra-list"></div>
      </div>
      <div class="ra-section">
        <div class="ra-section-head"><h4>キャンセル待ち</h4><span id="raWaitCount" class="ra-badge gray">0件</span></div>
        <div id="raWaitList" class="ra-list"></div>
      </div>
      <div id="raMessage" class="auth-note" style="margin-top:12px;"></div>
    `;
    content.appendChild(panel);

    panel.querySelector("#raReload").addEventListener("click", () => load(true));
    panel.querySelector("#raProcessNow").addEventListener("click", processNow);
    panel.querySelector("#raSave").addEventListener("click", saveDetails);
    panel.querySelector("#raWaitList").addEventListener("click", onWaitlistAction);
    return panel;
  }

  function jpDateTime(v) {
    if (!v) return "—";
    try {
      return new Intl.DateTimeFormat("ja-JP", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23"
      }).format(new Date(v));
    } catch { return String(v); }
  }

  function reminderStatus(v) {
    return ({
      pending:["送信待ち","warn"],
      processing:["処理中","warn"],
      sent:["完了",""],
      needs_manual:["要確認","warn"],
      failed:["失敗","red"],
      skipped:["対象外","gray"],
    })[v] || [v || "—","gray"];
  }

  function waitStatus(v) {
    return ({
      waiting:["待機中","warn"],
      offered:["空き案内済み",""],
      contacted:["連絡済み",""],
      converted:["予約化",""],
      cancelled:["取消","gray"],
      expired:["期限切れ","gray"],
    })[v] || [v || "—","gray"];
  }

  function syncNav() {
    const btn = document.querySelector('.settings-v2-nav-btn[data-settings-group="automation"]');
    if (!btn) return;
    const cfg = state?.settings || {};
    const enabled = cfg.auto_reminder === true || cfg.waitlist === true;
    btn.hidden = !enabled;
  }

  function renderSettings() {
    const box = document.getElementById("raSettings");
    if (!box || !state) return;
    const cfg = state.settings || {};
    const cards = [];

    if (cfg.auto_reminder) {
      cards.push(`
        <article class="ra-card">
          <h4>来店前リマインド</h4>
          <p>予約日時から逆算して自動で送信候補を作ります。LINE未連携時はスタッフ確認タスクへ切り替わります。</p>
          <div class="ra-setting">
            <div><strong>現在：ON</strong><p>文面は「詳細設定 → 来店前リマインド」で編集できます。</p></div>
            <label>何時間前に案内
              <select id="raReminderHours">
                ${[6,12,24,48,72].map(v=>`<option value="${v}" ${Number(cfg.reminder_hours_before||24)===v?"selected":""}>${v}時間前</option>`).join("")}
              </select>
            </label>
          </div>
        </article>
      `);
    }

    if (cfg.waitlist) {
      cards.push(`
        <article class="ra-card">
          <h4>キャンセル待ち</h4>
          <p>希望期間・時間帯を記録し、空きが出た時の案内状況を一元管理します。</p>
          <div class="ra-setting">
            <div><strong>現在：ON</strong><p>空き案内の有効時間を設定できます。</p></div>
            <label>案内後の確保目安
              <select id="raWaitMinutes">
                ${[15,30,60,120,180].map(v=>`<option value="${v}" ${Number(cfg.waitlist_offer_minutes||30)===v?"selected":""}>${v}分</option>`).join("")}
              </select>
            </label>
          </div>
        </article>
      `);
    }

    box.innerHTML = cards.length
      ? `<div class="ra-grid">${cards.join("")}</div>`
      : `<div class="ra-off">予約自動化は現在OFFです。<br>「使う機能」で <strong>来店前リマインド</strong> または <strong>キャンセル待ち</strong> をONにすると、ここへ必要な設定だけ表示されます。</div>`;

    document.getElementById("raSave").hidden = !cards.length;
    document.getElementById("raProcessNow").hidden = !cfg.auto_reminder;
  }

  function renderStats() {
    const box = document.getElementById("raStats");
    if (!box || !state) return;
    const r = state.counts?.reminders || {};
    const w = state.counts?.waitlist || {};
    box.innerHTML = [
      ["自動処理","15分ごと","Cron稼働中"],
      ["送信待ち",Number(r.pending||0),"件"],
      ["要確認",Number(r.needs_manual||0)+Number(r.failed||0),"件"],
      ["キャンセル待ち",Number(w.waiting||0)+Number(w.offered||0),"件"],
    ].map(([a,b,c])=>`<div class="ra-stat"><span>${esc(a)}</span><strong>${esc(b)}</strong><span>${esc(c)}</span></div>`).join("");
  }

  function renderReminders() {
    const rows = state?.recent_reminders || [];
    const box = document.getElementById("raReminderList");
    document.getElementById("raReminderCount").textContent = `${rows.length}件`;
    if (!rows.length) {
      box.innerHTML = '<div class="ra-empty">まだリマインド対象はありません。</div>';
      return;
    }
    box.innerHTML = rows.slice(0,12).map(row => {
      const [label,tone] = reminderStatus(row.status);
      return `<article class="ra-row">
        <div>
          <strong>${esc(row.customer_name || "お客様")}｜${esc(row.plan_name || "撮影予約")}</strong>
          <small>${esc(row.reservation_no || "")}｜予定 ${esc(jpDateTime(row.reservation_start_at || row.scheduled_for))}<br>自動処理 ${esc(jpDateTime(row.scheduled_for))}${row.error_message?`｜${esc(row.error_message)}`:""}</small>
        </div>
        <span class="ra-badge ${tone}">${esc(label)}</span>
      </article>`;
    }).join("");
  }

  function renderWaitlist() {
    const rows = state?.waitlist || [];
    const box = document.getElementById("raWaitList");
    const active = rows.filter(x=>["waiting","offered","contacted"].includes(x.status));
    document.getElementById("raWaitCount").textContent = `${active.length}件`;
    if (!rows.length) {
      box.innerHTML = '<div class="ra-empty">現在、キャンセル待ちの登録はありません。</div>';
      return;
    }
    box.innerHTML = rows.slice(0,20).map(row => {
      const [label,tone] = waitStatus(row.status);
      const canContact = row.status === "waiting" || row.status === "offered";
      const canCancel = !["converted","cancelled","expired"].includes(row.status);
      return `<article class="ra-row" data-wait-id="${esc(row.id)}">
        <div>
          <strong>${esc(row.customer_name || row.customer_no || "お客様")}｜${esc(row.plan_name || "プラン未指定")}</strong>
          <small>希望 ${esc(row.preferred_date_from)}〜${esc(row.preferred_date_to)}${row.preferred_time_from?`｜${esc(String(row.preferred_time_from).slice(0,5))}〜${esc(String(row.preferred_time_to||"").slice(0,5))}`:""}${row.note?`<br>${esc(row.note)}`:""}</small>
        </div>
        <div class="ra-actions">
          <span class="ra-badge ${tone}">${esc(label)}</span>
          ${canContact?'<button class="btn btn-secondary btn-small" type="button" data-wait-action="contacted">連絡済み</button>':""}
          ${canCancel?'<button class="btn btn-neutral btn-small" type="button" data-wait-action="cancelled">取消</button>':""}
        </div>
      </article>`;
    }).join("");
  }

  function render() {
    ensurePanel();
    syncNav();
    renderSettings();
    renderStats();
    renderReminders();
    renderWaitlist();
  }

  async function load(force=false) {
    if (loading && !force) return;
    ensurePanel();
    if (!token()) {
      document.getElementById("raMessage").textContent = "オーナー認証完了後に予約自動化を読み込みます。";
      return;
    }
    loading = true;
    document.getElementById("raMessage").textContent = "予約自動化を読み込んでいます…";
    try {
      state = await request("/api/admin/reservation-automation");
      render();
      document.getElementById("raMessage").textContent = `予約自動化を読み込みました。｜${VERSION}`;
    } catch (e) {
      document.getElementById("raMessage").textContent = e?.message || "読み込みに失敗しました。";
    } finally {
      loading = false;
    }
  }

  async function saveDetails() {
    if (!state) return;
    const body = {};
    const hours = document.getElementById("raReminderHours");
    const mins = document.getElementById("raWaitMinutes");
    if (hours) body.reminder_hours_before = Number(hours.value);
    if (mins) body.waitlist_offer_minutes = Number(mins.value);
    const btn = document.getElementById("raSave");
    btn.disabled = true;
    document.getElementById("raMessage").textContent = "設定を保存しています…";
    try {
      await request("/api/admin/reservation-automation/settings",{method:"POST",body});
      await load(true);
      document.getElementById("raMessage").textContent = "予約自動化の設定を保存しました。";
    } catch (e) {
      document.getElementById("raMessage").textContent = e?.message || "保存に失敗しました。";
    } finally {
      btn.disabled = false;
    }
  }

  async function processNow() {
    const btn = document.getElementById("raProcessNow");
    btn.disabled = true;
    document.getElementById("raMessage").textContent = "送信対象を確認しています…";
    try {
      const result = await request("/api/admin/reservation-automation/process-now",{method:"POST",body:{}});
      await load(true);
      document.getElementById("raMessage").textContent = `確認完了：${Number(result.processed||0)}件を処理しました。`;
    } catch (e) {
      document.getElementById("raMessage").textContent = e?.message || "確認に失敗しました。";
    } finally {
      btn.disabled = false;
    }
  }

  async function onWaitlistAction(event) {
    const button = event.target.closest("[data-wait-action]");
    if (!button) return;
    const row = button.closest("[data-wait-id]");
    if (!row) return;
    button.disabled = true;
    try {
      await request("/api/admin/waitlist/status",{
        method:"POST",
        body:{id:row.dataset.waitId,status:button.dataset.waitAction}
      });
      await load(true);
    } catch (e) {
      document.getElementById("raMessage").textContent = e?.message || "更新に失敗しました。";
    } finally {
      button.disabled = false;
    }
  }

  function boot() {
    ensurePanel();

    document.addEventListener("click", (event) => {
      const btn = event.target.closest('.settings-v2-nav-btn[data-settings-group="automation"]');
      if (btn) setTimeout(() => load(false), 0);
    });

    window.addEventListener("dpro:photo-settings-rendered", () => {
      setTimeout(() => load(true), 0);
    });

    window.addEventListener("dpro-studio:admin-code-changed", () => {
      setTimeout(() => load(true), 0);
    });

    if (token()) load(false);
  }

  boot();
  window.DPRO_PHOTO_RESERVATION_AUTOMATION_UI = Object.freeze({version:VERSION,load});
})();