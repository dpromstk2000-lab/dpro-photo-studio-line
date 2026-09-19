(() => {
  "use strict";

  const C = window.DPRO_STUDIO || window.DPRO_PHOTO_STUDIO_CONFIG;
  const VERSION = "DPRO-PHOTO-OWNER-OPERATIONS-BRUSHUP-9-4-SETUP-CHECKLIST-UI-20260919";
  if (!C || !document.getElementById("view-settings")) return;

  const esc = (v) => C.escapeHtml(v ?? "");
  const token = () => String(C.getSessionToken("owner") || "").trim();
  let loading = false;
  let lastPayload = null;

  const ITEM_TARGETS = {
    studio_profile: { group: "basic", heading: "店舗基本情報" },
    business_hours: { group: "basic", heading: "営業時間" },
    staff: { group: "staff", heading: "スタッフ管理" },
    plans: { group: "plans", heading: "撮影プラン管理" },
    booking: { group: "reservation", heading: "予約受付設定" },
    existing_site: { group: "public", heading: "予約画面・既存ホームページ連携" },
    line_booking: { group: "public", heading: "予約画面・既存ホームページ連携" },
  };

  async function request(path) {
    const response = await fetch(`${C.CALENDAR_API_BASE_URL}${path}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Owner-Session": token(),
      },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.ok === false) {
      throw new Error(payload?.error || payload?.message || `HTTP ${response.status}`);
    }
    return payload;
  }

  function injectStyle() {
    if (document.getElementById("photoOwnerSetupChecklistStyle")) return;
    const style = document.createElement("style");
    style.id = "photoOwnerSetupChecklistStyle";
    style.textContent = `
      .setup-v2-hero{
        display:grid;grid-template-columns:minmax(0,1.25fr) minmax(220px,.75fr);
        gap:14px;padding:16px;border:1px solid #cfe2de;border-radius:15px;
        background:linear-gradient(135deg,#f5fbf9,#eef8f5);
      }
      .setup-v2-hero.ready{border-color:#a9d8cb;background:linear-gradient(135deg,#edf9f5,#f7fcfa)}
      .setup-v2-kicker{font-size:11px;font-weight:900;letter-spacing:.08em;color:#337469}
      .setup-v2-title{margin:4px 0 0;font-size:20px;line-height:1.25}
      .setup-v2-copy{margin:6px 0 0;color:var(--muted,#647b78);font-size:12px;line-height:1.6}
      .setup-v2-meter{align-self:center}
      .setup-v2-meter-row{display:flex;justify-content:space-between;gap:10px;align-items:baseline;font-size:12px}
      .setup-v2-meter-row strong{font-size:19px}
      .setup-v2-progress{height:9px;margin-top:8px;border-radius:999px;overflow:hidden;background:#dbe9e6}
      .setup-v2-progress>span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#0f665a,#218b7b)}
      .setup-v2-groups{display:grid;grid-template-columns:1fr;gap:14px;margin-top:14px}
      .setup-v2-group{border-top:1px solid var(--line,#dfe7e5);padding-top:14px}
      .setup-v2-group-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:9px}
      .setup-v2-group-head h4{margin:0;font-size:14px}
      .setup-v2-group-head span{font-size:11px;color:var(--muted,#647b78)}
      .setup-v2-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      .setup-v2-item{
        display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;
        min-height:78px;padding:11px;border:1px solid var(--line,#dfe7e5);border-radius:12px;background:#fff;
      }
      .setup-v2-item.complete{border-color:#c7e2da;background:#fbfefd}
      .setup-v2-item.optional-missing{background:#fafcfc}
      .setup-v2-icon{
        display:grid;place-items:center;width:30px;height:30px;border-radius:50%;
        background:#e3f3ee;color:#0f665a;font-weight:950;font-size:14px;
      }
      .setup-v2-item.optional-missing .setup-v2-icon{background:#eef3f2;color:#718480}
      .setup-v2-item.incomplete .setup-v2-icon{background:#fff1e0;color:#9a6200}
      .setup-v2-item-title{font-size:13px;font-weight:900}
      .setup-v2-item-desc{margin-top:2px;color:var(--muted,#647b78);font-size:10px}
      .setup-v2-item-detail{margin-top:5px;color:#52716c;font-size:10px;line-height:1.45}
      .setup-v2-item-status{display:inline-flex;margin-left:5px;padding:1px 6px;border-radius:999px;font-size:9px;background:#e6f5f0;color:#0f665a}
      .setup-v2-item-status.optional{background:#eef3f2;color:#6d807d}
      .setup-v2-item-status.missing{background:#fff1e0;color:#8d5b12}
      .setup-v2-footer{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-top:13px}
      .setup-v2-checked{color:var(--muted,#647b78);font-size:10px}
      .setup-v2-nav-badge{display:inline-flex;padding:1px 6px;border-radius:999px;background:#dff2ed;color:#0f665a;font-size:9px;font-weight:900}
      @media(max-width:760px){
        .setup-v2-hero{grid-template-columns:1fr}
        .setup-v2-grid{grid-template-columns:1fr}
        .setup-v2-item{grid-template-columns:auto minmax(0,1fr)}
        .setup-v2-item .btn{grid-column:1/-1;width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function content() {
    return document.getElementById("settingsV2Content");
  }

  function ensurePanel() {
    const root = content();
    if (!root) return null;

    let panel = document.getElementById("ownerSetupChecklistPanel");
    if (panel) return panel;

    panel = document.createElement("section");
    panel.id = "ownerSetupChecklistPanel";
    panel.className = "panel";
    panel.dataset.settingsGroup = "basic";
    panel.innerHTML = `
      <div class="panel-head">
        <div>
          <h3>初期設定チェック</h3>
          <p>店舗を使い始めるための必須設定と、必要に応じて接続する外部連携を確認します。</p>
        </div>
        <div class="page-actions">
          <button id="setupV2Reload" class="btn btn-secondary btn-small" type="button">状態を再確認</button>
        </div>
      </div>
      <div id="setupV2Body">
        <div class="auth-note">初期設定の状態を確認しています…</div>
      </div>
    `;
    root.prepend(panel);
    panel.querySelector("#setupV2Reload").addEventListener("click", () => load(true));
    panel.addEventListener("click", onPanelClick);
    return panel;
  }

  function itemHtml(item) {
    const complete = item.complete === true;
    const optional = item.required === false;
    const cls = complete ? "complete" : (optional ? "optional-missing" : "incomplete");
    const icon = complete ? "✓" : (optional ? "○" : "!");
    const statusText = complete ? "完了" : (optional ? "任意・未接続" : "要設定");
    const statusClass = complete ? "" : (optional ? "optional" : "missing");
    return `
      <article class="setup-v2-item ${cls}">
        <div class="setup-v2-icon" aria-hidden="true">${icon}</div>
        <div>
          <div class="setup-v2-item-title">
            ${esc(item.label)}
            <span class="setup-v2-item-status ${statusClass}">${statusText}</span>
          </div>
          <div class="setup-v2-item-desc">${esc(item.description || "")}</div>
          <div class="setup-v2-item-detail">${esc(item.detail || "")}</div>
        </div>
        <button class="btn btn-neutral btn-small" type="button" data-setup-item="${esc(item.id)}">設定を見る</button>
      </article>
    `;
  }

  function render(payload) {
    lastPayload = payload;
    const body = document.getElementById("setupV2Body");
    if (!body) return;

    const req = payload.required || { complete: 0, total: 0, items: [] };
    const opt = payload.optional || { complete: 0, total: 0, items: [] };
    const percent = req.total ? Math.round((req.complete / req.total) * 100) : 0;
    const ready = payload.ready === true;
    const remaining = Math.max(0, Number(req.total || 0) - Number(req.complete || 0));
    const checked = payload.checked_at ? new Date(payload.checked_at) : null;
    const checkedText = checked && !Number.isNaN(checked.getTime())
      ? checked.toLocaleString("ja-JP", { hour12: false })
      : "確認済み";

    body.innerHTML = `
      <div class="setup-v2-hero ${ready ? "ready" : ""}">
        <div>
          <div class="setup-v2-kicker">利用開始の準備</div>
          <h4 class="setup-v2-title">${ready ? "✓ 利用開始できます" : `あと${remaining}項目で利用開始できます`}</h4>
          <p class="setup-v2-copy">
            必須設定が揃えばWEB予約を運用できます。既存HPとLINE予約は、店舗の運用に必要な場合だけ接続してください。
          </p>
        </div>
        <div class="setup-v2-meter">
          <div class="setup-v2-meter-row">
            <span>必須設定</span>
            <strong>${Number(req.complete || 0)} / ${Number(req.total || 0)}</strong>
          </div>
          <div class="setup-v2-progress" aria-label="必須設定の進捗">
            <span style="width:${Math.max(0, Math.min(100, percent))}%"></span>
          </div>
          <div class="setup-v2-meter-row" style="margin-top:8px;">
            <span>任意の外部連携</span>
            <strong style="font-size:14px;">${Number(opt.complete || 0)} / ${Number(opt.total || 0)}</strong>
          </div>
        </div>
      </div>

      <div class="setup-v2-groups">
        <section class="setup-v2-group">
          <div class="setup-v2-group-head">
            <h4>必須設定</h4>
            <span>${Number(req.complete || 0)} / ${Number(req.total || 0)} 完了</span>
          </div>
          <div class="setup-v2-grid">
            ${(Array.isArray(req.items) ? req.items : []).map(itemHtml).join("")}
          </div>
        </section>

        <section class="setup-v2-group">
          <div class="setup-v2-group-head">
            <h4>任意の外部連携</h4>
            <span>${Number(opt.complete || 0)} / ${Number(opt.total || 0)} 接続</span>
          </div>
          <div class="setup-v2-grid">
            ${(Array.isArray(opt.items) ? opt.items : []).map(itemHtml).join("")}
          </div>
        </section>
      </div>

      <div class="setup-v2-footer">
        <div class="setup-v2-checked">最終確認：${esc(checkedText)}｜${esc(VERSION)}</div>
        <button id="setupV2ReloadBottom" class="btn btn-secondary btn-small" type="button">状態を再確認</button>
      </div>
    `;

    document.getElementById("setupV2ReloadBottom")?.addEventListener("click", () => load(true));
    updateNavBadge(payload);
  }

  function updateNavBadge(payload) {
    const btn = document.querySelector('.settings-v2-nav-btn[data-settings-group="basic"]');
    const strong = btn?.querySelector("strong");
    if (!strong) return;

    let badge = strong.querySelector(".setup-v2-nav-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "setup-v2-nav-badge";
      strong.appendChild(badge);
    }
    const req = payload.required || { complete: 0, total: 0 };
    badge.textContent = payload.ready === true
      ? `✓ ${req.complete}/${req.total}`
      : `${req.complete}/${req.total}`;
  }

  function findHeading(text) {
    const root = content();
    if (!root || !text) return null;
    const headings = [...root.querySelectorAll("h3,h4")];
    return headings.find((x) => String(x.textContent || "").includes(text)) || null;
  }

  function goToItem(id) {
    const item = (lastPayload?.all_items || []).find((x) => x.id === id);
    const fallback = ITEM_TARGETS[id] || {};
    const group = item?.action_group || fallback.group || "basic";
    const heading = fallback.heading || "";

    const nav = document.querySelector(`.settings-v2-nav-btn[data-settings-group="${group}"]`);
    if (nav) nav.click();

    window.setTimeout(() => {
      const h = findHeading(heading);
      const panel = h?.closest("section.panel");
      (panel || h)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  function onPanelClick(event) {
    const btn = event.target.closest("[data-setup-item]");
    if (!btn) return;
    goToItem(btn.dataset.setupItem);
  }

  function showError(error) {
    const body = document.getElementById("setupV2Body");
    if (!body) return;
    body.innerHTML = `<div class="auth-note" style="color:#a53535;background:#fff1f1;border-color:#efcaca;">${esc(error?.message || "初期設定チェックに失敗しました。")}</div>`;
  }

  async function load(force = false) {
    if (!token()) {
      const body = document.getElementById("setupV2Body");
      if (body) body.innerHTML = '<div class="auth-note">管理画面の認証完了を待っています…</div>';
      return;
    }
    if (loading && !force) return;
    loading = true;

    const top = document.getElementById("setupV2Reload");
    if (top) {
      top.disabled = true;
      top.textContent = "確認中…";
    }

    try {
      const payload = await request("/api/admin/setup-checklist");
      render(payload);
    } catch (error) {
      showError(error);
    } finally {
      loading = false;
      if (top) {
        top.disabled = false;
        top.textContent = "状態を再確認";
      }
    }
  }

  function attachRefreshTriggers() {
    window.addEventListener("dpro:photo-settings-rendered", () => {
      window.setTimeout(() => load(true), 50);
    });
    window.addEventListener("dpro-studio:admin-code-changed", () => {
      window.setTimeout(() => load(true), 50);
    });
    document.addEventListener("click", (event) => {
      const basic = event.target.closest('.settings-v2-nav-btn[data-settings-group="basic"]');
      if (basic) window.setTimeout(() => load(true), 80);
    });
  }

  function init(attempt = 0) {
    injectStyle();
    if (!content()) {
      if (attempt < 40) window.setTimeout(() => init(attempt + 1), 100);
      return;
    }
    ensurePanel();
    attachRefreshTriggers();
    if (token()) load(false);
    else {
      const body = document.getElementById("setupV2Body");
      if (body) body.innerHTML = '<div class="auth-note">管理画面の認証完了を待っています…</div>';
    }
  }

  init();
})();