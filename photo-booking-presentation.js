(() => {
  "use strict";
  const C = window.DPRO_STUDIO || window.DPRO_PHOTO_STUDIO_CONFIG;
  const VERSION = "DPRO-PHOTO-BOOKING-PRESENTATION-BRUSHUP-8-4-1-SAVE-FEEDBACK-20260919";
  if (!C || !document.getElementById("view-settings")) return;

  const esc = (v) => C.escapeHtml(v ?? "");
  const token = () => String(C.getSessionToken("owner") || "").trim();
  let loadPromise = null;
  let saveFeedbackTimer = null;

  async function request(path, options = {}) {
    const response = await fetch(`${C.CALENDAR_API_BASE_URL}${path}`, {
      method: options.method || "GET",
      headers: {
        "Accept": "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        "X-Owner-Session": token(),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.ok === false) {
      throw new Error(payload?.error || payload?.message || `HTTP ${response.status}`);
    }
    return payload;
  }

  function setStatus(message, error = false, success = false) {
    const el = document.getElementById("bookingPresentationStatus");
    if (!el) return;
    el.textContent = message;
    el.style.color = error ? "#b64040" : (success ? "#0b5e51" : "");
    el.style.background = error ? "#fff1f1" : (success ? "#eaf8f3" : "");
    el.style.border = error ? "1px solid #f1c7c7" : (success ? "1px solid #b9e4d5" : "");
    el.style.fontWeight = success ? "800" : "";
  }

  function setSaveButton(state = "idle") {
    const button = document.getElementById("bookingPresentationSave");
    if (!button) return;

    if (saveFeedbackTimer) {
      window.clearTimeout(saveFeedbackTimer);
      saveFeedbackTimer = null;
    }

    if (state === "saving") {
      button.disabled = true;
      button.textContent = "保存しています…";
      button.setAttribute("aria-busy", "true");
      return;
    }

    button.removeAttribute("aria-busy");

    if (state === "saved") {
      button.disabled = true;
      button.textContent = "✓ 保存済み";
      saveFeedbackTimer = window.setTimeout(() => {
        button.disabled = false;
        button.textContent = "この設定を保存";
        saveFeedbackTimer = null;
      }, 2200);
      return;
    }

    button.disabled = false;
    button.textContent = "この設定を保存";
  }

  function showError(error) {
    console.error(error);
    setSaveButton("idle");
    setStatus(error?.message || "予約画面設定の処理に失敗しました。", true);
  }

  function fill(p = {}) {
    document.getElementById("bookingExistingSiteMode").checked = p.existing_site_mode === true;
    document.getElementById("bookingWhiteLabel").checked = p.white_label === true;
    document.getElementById("bookingHideDproBrand").checked = p.hide_dpro_public_brand === true;
    document.getElementById("bookingHomeUrl").value = p.home_url || "";
    document.getElementById("bookingBrandName").value = p.brand_name || "";
    document.getElementById("bookingBrandColor").value = p.brand_primary || "";
    document.getElementById("bookingLogoUrl").value = p.logo_url || "";
    const channels = Array.isArray(p.booking_channels) ? p.booking_channels : ["web"];
    document.getElementById("bookingChannelWeb").checked = channels.includes("web");
    document.getElementById("bookingChannelLine").checked = channels.includes("line");
  }

  async function load() {
    if (!token()) throw new Error("オーナー認証が必要です。");
    const payload = await request("/api/admin/booking-presentation");
    fill(payload.presentation || {});
    setStatus(`読込済み｜${VERSION}`);
  }

  async function loadWhenReady() {
    if (!token()) {
      setStatus("管理画面の認証完了を待っています…");
      return false;
    }
    if (loadPromise) return loadPromise;
    const task = load()
      .then(() => true)
      .catch((error) => {
        showError(error);
        return false;
      })
      .finally(() => {
        if (loadPromise === task) loadPromise = null;
      });
    loadPromise = task;
    return task;
  }

  async function save() {
    if (!token()) throw new Error("オーナー認証が必要です。");
    const channels = [];
    if (document.getElementById("bookingChannelWeb").checked) channels.push("web");
    if (document.getElementById("bookingChannelLine").checked) channels.push("line");

    const body = {
      existing_site_mode: document.getElementById("bookingExistingSiteMode").checked,
      white_label: document.getElementById("bookingWhiteLabel").checked,
      hide_dpro_public_brand: document.getElementById("bookingHideDproBrand").checked,
      home_url: document.getElementById("bookingHomeUrl").value.trim() || null,
      brand_name: document.getElementById("bookingBrandName").value.trim() || null,
      brand_primary: document.getElementById("bookingBrandColor").value.trim() || null,
      logo_url: document.getElementById("bookingLogoUrl").value.trim() || null,
      booking_channels: channels.length ? channels : ["web"],
    };

    setSaveButton("saving");
    setStatus("保存しています…");
    const payload = await request("/api/admin/booking-presentation", { method: "POST", body });
    fill(payload.presentation || {});
    setSaveButton("saved");
    setStatus("✓ 保存しました。公開予約画面にも反映されています。", false, true);
  }

  function mount() {
    if (document.getElementById("bookingPresentationPanel")) return;
    const reservationPanel = document.getElementById("settingPublicNotice")?.closest("section.panel");
    if (!reservationPanel) return;

    const section = document.createElement("section");
    section.className = "panel";
    section.id = "bookingPresentationPanel";
    section.innerHTML = `
      <div class="panel-head">
        <div>
          <h3>予約画面・既存ホームページ連携</h3>
          <p>既存サイトからDPRO予約へ接続し、予約画面だけ店舗ブランドで表示できます。</p>
        </div>
        <div class="page-actions">
          <a id="bookingPresentationPreview" class="btn btn-secondary btn-small" href="${esc(C.buildPageUrl(C.PAGES.INDEX, C.isDemoMode() ? { demo: 1, v: "PHOTO-B8-4" } : { v: "PHOTO-B8-4" }))}" target="_blank" rel="noopener">予約画面を確認</a>
          <button id="bookingPresentationSave" class="btn btn-primary btn-small" type="button">この設定を保存</button>
        </div>
      </div>
      <div class="form-grid">
        <div class="field span-2">
          <label>利用モード</label>
          <div class="check-row">
            <label><input id="bookingExistingSiteMode" type="checkbox" /> 既存ホームページから予約画面へ接続</label>
            <label><input id="bookingWhiteLabel" type="checkbox" /> 予約画面を店舗ブランドにする</label>
            <label><input id="bookingHideDproBrand" type="checkbox" /> 公開画面のDPRO表記を隠す</label>
          </div>
          <div class="field-help">管理画面はDPROのままです。公開予約画面だけを店舗向けに変更します。</div>
        </div>
        <div class="field span-2">
          <label for="bookingHomeUrl">既存ホームページURL</label>
          <input id="bookingHomeUrl" class="input" type="url" placeholder="https://www.example.com/" />
          <div class="field-help">既存HPモードON時は「公式サイトへ戻る」を表示します。HTTPSのみ。</div>
        </div>
        <div class="field">
          <label for="bookingBrandName">公開ブランド名</label>
          <input id="bookingBrandName" class="input" type="text" maxlength="80" placeholder="例：○○写真館" />
        </div>
        <div class="field">
          <label for="bookingBrandColor">ブランドカラー</label>
          <input id="bookingBrandColor" class="input" type="text" maxlength="7" placeholder="#15584F" />
        </div>
        <div class="field span-2">
          <label for="bookingLogoUrl">公開ロゴ画像URL</label>
          <input id="bookingLogoUrl" class="input" type="url" placeholder="https://www.example.com/logo.png" />
          <div class="field-help">任意。HTTPS画像URLを指定します。</div>
        </div>
        <div class="field span-2">
          <label>予約入口</label>
          <div class="check-row">
            <label><input id="bookingChannelWeb" type="checkbox" checked /> WEB予約</label>
            <label><input id="bookingChannelLine" type="checkbox" /> LINEから予約</label>
          </div>
        </div>
      </div>
      <div id="bookingPresentationStatus" class="auth-note" style="margin-top:12px;">設定を読み込んでいます…</div>
    `;
    reservationPanel.insertAdjacentElement("afterend", section);
    document.getElementById("bookingPresentationSave").addEventListener("click", () => save().catch(showError));

    window.addEventListener("dpro:photo-settings-rendered", () => {
      loadWhenReady();
    });
    window.addEventListener("dpro-studio:admin-code-changed", () => {
      window.setTimeout(() => loadWhenReady(), 0);
    });

    if (token()) loadWhenReady();
    else setStatus("管理画面の認証完了を待っています…");
  }

  mount();
})();