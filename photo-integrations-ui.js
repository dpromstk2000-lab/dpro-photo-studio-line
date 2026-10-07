(() => {
  "use strict";

  const C = window.DPRO_STUDIO || window.DPRO_PHOTO_STUDIO_CONFIG;
  if (!C) return;

  const VERSION = "DPRO-PHOTO-INTEGRATIONS-UI-V1.1-PAYMENT-CANCEL-20261007";
  const API = C.INTEGRATIONS_API_BASE_URL || "https://cbknucemarcpbscirzyv.supabase.co/functions/v1/dpro-photo-integrations-v1";
  const OAUTH_ORIGIN = "https://cbknucemarcpbscirzyv.supabase.co";
  const $ = (id) => document.getElementById(id);
  const esc = (v) => C.escapeHtml(v ?? "");
  const token = () => String(C.getSessionToken("owner") || "").trim();

  let state = null;
  let currentReservationId = "";
  let loading = false;

  async function request(path, options = {}) {
    const headers = {
      Accept: "application/json",
      "X-Owner-Session": token(),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    };
    const response = await fetch(`${API}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.ok === false) {
      const error = new Error(payload?.error || payload?.message || `HTTP ${response.status}`);
      error.code = payload?.code || "";
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function addStyle() {
    if ($("dproPhotoIntegrationsStyle")) return;
    const style = document.createElement("style");
    style.id = "dproPhotoIntegrationsStyle";
    style.textContent = `
      .pi-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .pi-card{border:1px solid var(--line,#dce7e4);border-radius:15px;background:#fff;padding:15px}
      .pi-card-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      .pi-card h4{margin:0;font-size:15px}
      .pi-card p{margin:6px 0 0;color:var(--muted,#607773);font-size:11px;line-height:1.65}
      .pi-status{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:#eef3f2;color:#5b6d69;font-size:9px;font-weight:900;white-space:nowrap}
      .pi-status.ok{background:#e8f7ef;color:#176349}
      .pi-status.wait{background:#fff4df;color:#875b17}
      .pi-status.off{background:#f1f3f2;color:#707a77}
      .pi-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
      .pi-select{margin-top:10px;width:100%}
      .pi-note{margin-top:10px;padding:9px 10px;border-radius:10px;background:#f5f9f8;color:#4e6e68;font-size:10px;line-height:1.6}
      .pi-note.warn{background:#fff8ea;color:#7b5b25}
      .pi-payment-list{display:grid;gap:7px;margin-top:10px}
      .pi-payment-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px;border:1px solid var(--line,#dce7e4);border-radius:11px}
      .pi-payment-row strong{font-size:11px}
      .pi-payment-row small{display:block;margin-top:3px;color:var(--muted,#607773);font-size:9px}
      .pi-res-card{margin-top:12px;padding:14px;border:1px solid #cfe0dc;border-radius:14px;background:#f8fbfa}
      .pi-res-card h4{margin:0 0 5px;font-size:14px}
      .pi-res-grid{display:grid;grid-template-columns:160px 160px minmax(0,1fr);gap:8px;align-items:end;margin-top:10px}
      .pi-res-grid label{font-size:10px;font-weight:850;color:#41645e}
      .pi-res-grid input,.pi-res-grid select{width:100%;margin-top:4px}
      .pi-res-result{margin-top:9px;font-size:11px;line-height:1.65}
      .pi-link-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}
      .pi-toast{position:fixed;right:18px;bottom:18px;z-index:260;padding:12px 14px;border-radius:12px;background:#0f7562;color:#fff;font-size:12px;font-weight:800;box-shadow:0 12px 35px rgba(0,0,0,.16)}
      .pi-toast.err{background:#9b3636}
      @media(max-width:800px){.pi-grid{grid-template-columns:1fr}.pi-res-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function flash(message, error = false) {
    const el = document.createElement("div");
    el.className = `pi-toast${error ? " err" : ""}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3800);
  }

  function ensurePanel() {
    addStyle();
    let panel = $("ownerIntegrationsPanel");
    if (panel) return panel;
    const content = $("settingsV2Content");
    if (!content) return null;

    panel = document.createElement("section");
    panel.id = "ownerIntegrationsPanel";
    panel.className = "panel";
    panel.dataset.settingsGroup = "automation";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="panel-head">
        <div>
          <h3>外部連携</h3>
          <p>「使う機能」でONにしたサービスだけを接続します。秘密情報は画面に保存しません。</p>
        </div>
        <div class="page-actions">
          <button id="piReload" class="btn btn-secondary btn-small" type="button">再読込</button>
        </div>
      </div>
      <div id="piCards" class="pi-grid"></div>
      <div id="piPaymentHistory" style="margin-top:14px;"></div>
      <div id="piMessage" class="auth-note" style="margin-top:12px;"></div>
    `;
    content.appendChild(panel);
    $("piReload").addEventListener("click", () => load(true));
    return panel;
  }

  function badge(label, tone = "") {
    return `<span class="pi-status ${tone}">${esc(label)}</span>`;
  }

  function renderSquare() {
    const sq = state.square || {};
    const enabled = state.feature_flags?.online_payment === true;
    if (!enabled) return "";

    let status = badge("未接続", "off");
    if (!sq.app_configured) status = badge("DPRO側準備待ち", "wait");
    else if (sq.connection_status === "connected") status = badge("接続済み", "ok");

    let body = "";
    if (!sq.app_configured) {
      body = `<div class="pi-note warn">Square連携用のDPROアプリ設定がまだ未登録です。DPRO側の初期設定完了後に「接続する」が使えるようになります。</div>`;
    } else if (sq.connection_status !== "connected") {
      body = `<div class="pi-actions"><button class="btn btn-primary btn-small" type="button" data-pi-action="square-connect">Squareを接続</button></div>`;
    } else {
      const locations = Array.isArray(sq.locations) ? sq.locations : [];
      const selector = locations.length > 1
        ? `<select id="piSquareLocation" class="pi-select">${locations.map(x => `<option value="${esc(x.id)}" ${x.id === sq.location_id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>`
        : "";
      body = `
        <div class="pi-note">利用店舗：<strong>${esc(sq.location_name || "未選択")}</strong></div>
        ${selector}
        <div class="pi-actions">
          ${locations.length > 1 ? '<button class="btn btn-secondary btn-small" type="button" data-pi-action="square-location-save">利用店舗を保存</button>' : ""}
          <button class="btn btn-neutral btn-small" type="button" data-pi-action="square-connect">再接続</button>
        </div>`;
    }

    return `<article class="pi-card">
      <div class="pi-card-head"><div><h4>事前決済（Square）</h4><p>Squareの安全な決済ページを発行し、カード番号はDPROに保存しません。</p></div>${status}</div>
      ${body}
    </article>`;
  }

  function renderGoogle() {
    const gc = state.google || {};
    const enabled = state.feature_flags?.google_calendar === true;
    if (!enabled) return "";

    let status = badge("未接続", "off");
    if (!gc.app_configured) status = badge("DPRO側準備待ち", "wait");
    else if (gc.connection_status === "connected") status = badge("接続済み", "ok");

    let body = "";
    if (!gc.app_configured) {
      body = `<div class="pi-note warn">Google OAuthのDPROアプリ設定がまだ未登録です。DPRO側の初期設定完了後に接続できます。</div>`;
    } else if (gc.connection_status !== "connected") {
      body = `<div class="pi-actions"><button class="btn btn-primary btn-small" type="button" data-pi-action="google-connect">Googleを接続</button></div>`;
    } else {
      body = `
        <div class="pi-note">同期先：<strong>${esc(gc.calendar_name || "メインカレンダー")}</strong><br>予約の作成・変更・取消をDPROから自動同期します。</div>
        <div class="pi-actions">
          <button class="btn btn-secondary btn-small" type="button" data-pi-action="google-sync">今すぐ同期</button>
          <button class="btn btn-neutral btn-small" type="button" data-pi-action="google-connect">再接続</button>
        </div>`;
    }

    return `<article class="pi-card">
      <div class="pi-card-head"><div><h4>Googleカレンダー</h4><p>DPRO予約をGoogleカレンダーへ自動反映します。</p></div>${status}</div>
      ${body}
    </article>`;
  }

  function paymentStatusLabel(status) {
    const map = {
      creating: "作成中",
      ready: "支払待ち",
      pending: "支払待ち",
      paid: "支払済み",
      cancelled: "無効化済み",
      failed: "失敗",
    };
    return map[String(status || "")] || String(status || "—");
  }

  function renderPaymentHistory() {
    const box = $("piPaymentHistory");
    if (!box) return;
    if (state.feature_flags?.online_payment !== true) {
      box.innerHTML = "";
      return;
    }

    const rows = Array.isArray(state.recent_payments) ? state.recent_payments : [];
    if (!rows.length) {
      box.innerHTML = `<div class="pi-note">決済リンクの発行履歴はまだありません。</div>`;
      return;
    }

    box.innerHTML = `
      <h4 style="margin:0 0 8px;">最近の決済</h4>
      <div class="pi-payment-list">
        ${rows.slice(0, 8).map(row => `
          <div class="pi-payment-row">
            <div>
              <strong>¥${Number(row.amount || 0).toLocaleString("ja-JP")}｜${esc(paymentStatusLabel(row.status))}</strong>
              <small>${esc(String(row.created_at || "").replace("T", " ").slice(0,16))}</small>
            </div>
            <div class="pi-link-actions">
              ${row.checkout_url && ["ready","pending"].includes(String(row.status || ""))
                ? `<button class="btn btn-neutral btn-small" data-pi-url="${esc(row.checkout_url)}" type="button">開く</button>`
                : ""}
              ${["ready","pending"].includes(String(row.status || ""))
                ? `<button class="btn btn-secondary btn-small" data-pi-action="payment-cancel" data-payment-request-id="${esc(row.id)}" type="button">無効化</button>`
                : ""}
            </div>
          </div>`).join("")}
      </div>`;
  }

  function render() {
    const panel = ensurePanel();
    if (!panel || !state) return;

    const enabled = state.feature_flags?.online_payment === true || state.feature_flags?.google_calendar === true;
    panel.hidden = !enabled;

    const cards = [renderSquare(), renderGoogle()].filter(Boolean).join("");
    $("piCards").innerHTML = cards;
    renderPaymentHistory();
    $("piMessage").textContent = enabled ? `外部連携を読み込みました。｜${VERSION}` : "";
    renderReservationPayment();
  }

  async function load(force = false) {
    if (loading && !force) return;
    ensurePanel();
    if (!token()) return;
    loading = true;
    try {
      state = await request("/api/admin/status");
      render();
    } catch (error) {
      if ($("piMessage")) $("piMessage").textContent = error.message || "外部連携を読み込めませんでした。";
    } finally {
      loading = false;
    }
  }

  async function startOAuth(provider) {
    const popup = window.open("about:blank", `dpro_${provider}_oauth`, "width=720,height=760,resizable=yes,scrollbars=yes");
    try {
      const path = provider === "square" ? "/api/admin/square/start" : "/api/admin/google/start";
      const result = await request(`${path}?return_origin=${encodeURIComponent(location.origin)}`);
      if (popup) popup.location.href = result.authorize_url;
      else location.href = result.authorize_url;
    } catch (error) {
      if (popup) popup.close();
      flash(error.message || "接続を開始できませんでした。", true);
    }
  }

  async function saveSquareLocation() {
    const select = $("piSquareLocation");
    if (!select?.value) return;
    await request("/api/admin/square/location", {
      method: "POST",
      body: { location_id: select.value },
    });
    flash("Squareの利用店舗を保存しました。");
    await load(true);
  }

  async function syncGoogle() {
    const button = document.querySelector('[data-pi-action="google-sync"]');
    if (button) button.disabled = true;
    try {
      const result = await request("/api/admin/google/sync-now", { method: "POST", body: {} });
      flash(`Googleカレンダー同期：${Number(result.processed || 0)}件を処理しました。`);
      await load(true);
    } catch (error) {
      flash(error.message || "同期できませんでした。", true);
    } finally {
      if (button) button.disabled = false;
    }
  }

  function ensureReservationCard() {
    let card = $("photoPaymentReservationCard");
    if (card) return card;
    const overview = $("reservationOverview");
    if (!overview) return null;

    card = document.createElement("div");
    card.id = "photoPaymentReservationCard";
    card.className = "pi-res-card";
    card.hidden = true;
    overview.insertAdjacentElement("afterend", card);
    return card;
  }

  function paymentRowsForReservation(id) {
    const rows = Array.isArray(state?.recent_payments) ? state.recent_payments : [];
    return rows.filter(x => String(x.reservation_id || "") === String(id || ""));
  }

  function renderReservationPayment() {
    const card = ensureReservationCard();
    if (!card) return;

    const enabled = state?.feature_flags?.online_payment === true;
    card.hidden = !enabled || !currentReservationId;
    if (card.hidden) return;

    const sq = state.square || {};
    const recent = paymentRowsForReservation(currentReservationId)[0] || null;

    if (!sq.app_configured) {
      card.innerHTML = `<h4>事前決済</h4><div class="pi-note warn">SquareのDPRO接続準備がまだ完了していません。</div>`;
      return;
    }
    if (sq.connection_status !== "connected") {
      card.innerHTML = `<h4>事前決済</h4><div class="pi-note">店舗設定 → 予約自動化 からSquareを接続してください。</div>`;
      return;
    }

    const recentHtml = recent
      ? `<div class="pi-res-result">最新：<strong>¥${Number(recent.amount || 0).toLocaleString("ja-JP")}</strong>｜${esc(paymentStatusLabel(recent.status))}
          ${recent.checkout_url && ["ready","pending"].includes(String(recent.status || ""))
            ? `<div class="pi-link-actions">
                <button class="btn btn-secondary btn-small" data-pi-copy="${esc(recent.checkout_url)}" type="button">リンクをコピー</button>
                <button class="btn btn-neutral btn-small" data-pi-url="${esc(recent.checkout_url)}" type="button">決済ページを開く</button>
                <button class="btn btn-secondary btn-small" data-pi-action="payment-cancel" data-payment-request-id="${esc(recent.id)}" type="button">リンクを無効化</button>
              </div>`
            : ""}
        </div>` : "";

    card.innerHTML = `
      <h4>事前決済（Square）</h4>
      <p style="margin:5px 0 0;color:#607773;font-size:11px;line-height:1.6;">この予約専用のSquare決済ページを発行します。</p>
      <div class="pi-res-grid">
        <label>決済種別
          <select id="piPaymentType"><option value="deposit">内金</option><option value="full">全額</option><option value="other">その他</option></select>
        </label>
        <label>金額（税込）
          <input id="piPaymentAmount" class="input" type="number" min="1" step="100" placeholder="金額を入力">
        </label>
        <button class="btn btn-primary" data-pi-action="payment-create" type="button">決済リンクを発行</button>
      </div>
      ${recentHtml}
      <div id="piReservationPaymentMessage" class="pi-res-result"></div>`;
  }

  async function createPaymentLink() {
    const amount = Number($("piPaymentAmount")?.value || 0);
    if (!Number.isInteger(amount) || amount <= 0) {
      flash("決済金額を入力してください。", true);
      return;
    }
    const button = document.querySelector('[data-pi-action="payment-create"]');
    if (button) button.disabled = true;
    try {
      const result = await request("/api/admin/payment-links/create", {
        method: "POST",
        body: {
          reservation_id: currentReservationId,
          amount,
          request_type: $("piPaymentType")?.value || "deposit",
        },
      });
      const msg = $("piReservationPaymentMessage");
      if (msg) {
        msg.innerHTML = `決済リンクを発行しました。
          <div class="pi-link-actions"><button class="btn btn-secondary btn-small" data-pi-copy="${esc(result.checkout_url)}" type="button">リンクをコピー</button><button class="btn btn-neutral btn-small" data-pi-url="${esc(result.checkout_url)}" type="button">決済ページを開く</button></div>`;
      }
      flash("Square決済リンクを発行しました。");
      await load(true);
    } catch (error) {
      flash(error.message || "決済リンクを発行できませんでした。", true);
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function cancelPaymentLink(paymentRequestId) {
    const id = String(paymentRequestId || "").trim();
    if (!id) return;
    if (!window.confirm("この決済リンクを無効化しますか？\n無効化すると、このリンクからは支払えなくなります。")) return;

    const buttons = document.querySelectorAll('[data-pi-action="payment-cancel"]');
    buttons.forEach(button => {
      if (button.dataset.paymentRequestId === id) button.disabled = true;
    });

    try {
      await request("/api/admin/payment-links/cancel", {
        method: "POST",
        body: { payment_request_id: id },
      });
      flash("決済リンクを無効化しました。");
      await load(true);
    } catch (error) {
      flash(error.message || "決済リンクを無効化できませんでした。", true);
    } finally {
      buttons.forEach(button => {
        if (button.dataset.paymentRequestId === id) button.disabled = false;
      });
    }
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const action = event.target.closest("[data-pi-action]")?.dataset.piAction;
      if (action === "square-connect") startOAuth("square");
      if (action === "google-connect") startOAuth("google");
      if (action === "square-location-save") saveSquareLocation().catch(e => flash(e.message, true));
      if (action === "google-sync") syncGoogle();
      if (action === "payment-create") createPaymentLink();
      if (action === "payment-cancel") cancelPaymentLink(event.target.closest("[data-payment-request-id]")?.dataset.paymentRequestId);

      const urlButton = event.target.closest("[data-pi-url]");
      if (urlButton?.dataset.piUrl) window.open(urlButton.dataset.piUrl, "_blank", "noopener");

      const copyButton = event.target.closest("[data-pi-copy]");
      if (copyButton?.dataset.piCopy) {
        C.copyText(copyButton.dataset.piCopy)
          .then(() => flash("決済リンクをコピーしました。"))
          .catch(() => flash("コピーできませんでした。", true));
      }

      if (event.target.closest("#settingsSaveBtn")) {
        setTimeout(() => load(true), 1200);
      }
    });

    window.addEventListener("message", (event) => {
      if (event.origin !== OAUTH_ORIGIN) return;
      if (event.data?.type !== "dpro-photo-oauth") return;
      flash(event.data.message || (event.data.ok ? "接続しました。" : "接続できませんでした。"), !event.data.ok);
      load(true);
    });

    window.addEventListener("dpro:photo-reservation-opened", (event) => {
      currentReservationId = String(event.detail?.reservation_id || "");
      renderReservationPayment();
    });

    window.addEventListener("dpro:photo-settings-rendered", () => {
      setTimeout(() => load(true), 0);
    });
  }

  function boot() {
    ensurePanel();
    ensureReservationCard();
    bindEvents();
    if (token()) load(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  window.DPRO_PHOTO_INTEGRATIONS_UI = Object.freeze({ version: VERSION, load });
})();