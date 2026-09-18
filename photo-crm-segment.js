(() => {
  "use strict";

  const VERSION = "DPRO-PHOTO-CRM-BRUSHUP-5-UI-POLISH1-20260918";
  const API_BASE = "https://cbknucemarcpbscirzyv.supabase.co/functions/v1/dpro-photo-product-ready-gateway-v5";
  const state = {
    selected: new Set(),
    preview: null,
    campaign: null,
    capability: null,
    mounted: false,
  };

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));

  function config() {
    return window.DPRO_STUDIO || window.DPRO_PHOTO_STUDIO_CONFIG || null;
  }

  function ownerToken() {
    const c = config();
    return c && typeof c.getSessionToken === "function" ? c.getSessionToken("owner") : "";
  }

  async function waitForToken(timeoutMs = 15000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const token = ownerToken();
      if (token) return token;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return "";
  }

  async function api(path, { method = "GET", body = null } = {}) {
    const token = ownerToken() || await waitForToken();
    if (!token) throw new Error("管理者認証が必要です。画面を再読み込みして管理コードを確認してください。");
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Owner-Session": token,
      },
      body: body === null ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.ok === false) {
      const err = new Error(payload?.error || payload?.message || `通信に失敗しました（HTTP ${response.status}）`);
      err.code = payload?.code || "";
      err.detail = payload?.detail || null;
      throw err;
    }
    return payload;
  }

  function linePanel() {
    return $("lineSegmentMount");
  }

  function currentRows() {
    return [...document.querySelectorAll("#followupResults .customer-row")];
  }

  function subjectIdFromRow(row) {
    return row.querySelector("[data-open-subject-history]")?.dataset?.openSubjectHistory || "";
  }

  function rowLineLinked(row) {
    return row.textContent.includes("LINE連携済み");
  }

  function injectSelectionControls() {
    const rows = currentRows();
    const visibleIds = new Set();

    rows.forEach((row) => {
      const subjectId = subjectIdFromRow(row);
      if (!subjectId) return;
      visibleIds.add(subjectId);

      let box = row.querySelector(`[data-segment-subject="${CSS.escape(subjectId)}"]`);
      if (!box) {
        const actions = row.querySelector(".page-actions") || row;
        const label = document.createElement("label");
        label.className = "btn btn-small btn-neutral";
        label.style.cursor = "pointer";
        label.style.display = "inline-flex";
        label.style.alignItems = "center";
        label.style.gap = "6px";
        label.innerHTML = `<input type="checkbox" data-segment-subject="${esc(subjectId)}" /> 配信対象`;
        actions.prepend(label);
        box = label.querySelector("input");
        box.addEventListener("change", () => {
          if (box.checked) state.selected.add(subjectId);
          else state.selected.delete(subjectId);
          updateSelectionMeta();
        });
      }

      const linked = rowLineLinked(row);
      box.disabled = !linked;
      box.checked = linked && state.selected.has(subjectId);
      const label = box.closest("label");
      if (label) {
        label.title = linked ? "LINEセグメント配信の対象に選択" : "LINE未連携のため配信対象にできません";
        if (!linked) label.style.opacity = "0.55";
      }
    });

    [...state.selected].forEach((id) => {
      if (!visibleIds.has(id)) state.selected.delete(id);
    });
    updateSelectionMeta();
  }

  function selectedIds() {
    return [...state.selected];
  }

  function updateSelectionMeta() {
    if ($("segmentSelectionMeta")) {
      const selected = selectedIds().length;
      const linkedRows = currentRows().filter(rowLineLinked).length;
      $("segmentSelectionMeta").textContent = `選択中 ${selected}名｜現在の検索結果でLINE連携済み ${linkedRows}名`;
    }
  }

  function selectAllLinked() {
    currentRows().forEach((row) => {
      if (!rowLineLinked(row)) return;
      const id = subjectIdFromRow(row);
      if (id) state.selected.add(id);
    });
    injectSelectionControls();
  }

  function clearSelection() {
    state.selected.clear();
    injectSelectionControls();
  }

  function studioName() {
    return document.getElementById("sideStudioName")?.textContent?.trim() || "フォトスタジオ";
  }

  const templates = {
    shichigosan: () =>
      `こんにちは。${studioName()}です。\n\n七五三の記念撮影をご検討の皆さまへご案内です。\nお子さまの成長の節目を、写真に残しませんか？\n\n撮影についてのご相談・ご予約はLINEからお気軽にご連絡ください。`,
    birthday: () =>
      `こんにちは。${studioName()}です。\n\nもうすぐお誕生日を迎えるお子さまへ、バースデーフォトのご案内です。\n今だけの表情や成長を、記念写真に残しませんか？\n\n撮影についてのご相談・ご予約はLINEからお気軽にご連絡ください。`,
    revisit: () =>
      `こんにちは。${studioName()}です。\n\n前回の撮影から少し時間が経ちましたので、記念撮影のご案内です。\nお子さまやご家族の今の姿を、また写真に残しませんか？\n\n撮影についてのご相談・ご予約はLINEからお気軽にご連絡ください。`,
  };

  function setTemplate(name) {
    const fn = templates[name];
    if (!fn || !$("segmentMessageBody")) return;
    $("segmentMessageBody").value = fn();
    updateCharCount();
  }

  function updateCharCount() {
    const body = $("segmentMessageBody")?.value || "";
    if ($("segmentCharCount")) $("segmentCharCount").textContent = `${body.length}/5000`;
  }

  function capabilityBadge(cap) {
    if (!cap) return '<span class="badge gray">確認中</span>';
    if (!cap.enabled) return '<span class="badge gray">OFF</span>';
    if (cap.demoMode) return '<span class="badge amber">デモ安全モード：LINE実送信なし</span>';
    if (cap.externalSendReady) return '<span class="badge green">LINE実送信可能</span>';
    return '<span class="badge red">本番LINEバインド未完了</span>';
  }

  function panelHtml() {
    return `
      <div class="page-actions" style="justify-content:flex-end;margin-bottom:10px;">
        <div id="segmentCapabilityBadge">${capabilityBadge(state.capability)}</div>
      </div>

      <div class="auth-note" style="margin:0 0 12px;">
        <strong>誤送信防止：</strong>
        撮影対象者を選択後、LINE連携済みだけを抽出し、兄弟・姉妹など同じご契約者は1通にまとめます。
        文面と配信人数を再確認しない限り送信されません。
      </div>

      <div class="page-actions" style="margin-bottom:12px;">
        <strong id="segmentSelectionMeta">選択中 0名</strong>
        <button id="segmentSelectAllBtn" class="btn btn-small btn-secondary" type="button">LINE連携済みを全選択</button>
        <button id="segmentClearBtn" class="btn btn-small btn-neutral" type="button">選択解除</button>
      </div>

      <div class="field">
        <label for="segmentMessageBody">配信文</label>
        <textarea id="segmentMessageBody" maxlength="5000" rows="7" placeholder="LINEで配信する文面を入力してください。"></textarea>
        <div class="page-actions" style="margin-top:8px;justify-content:space-between;">
          <div>
            <button class="btn btn-small btn-neutral" data-segment-template="shichigosan" type="button">七五三案内</button>
            <button class="btn btn-small btn-neutral" data-segment-template="birthday" type="button">誕生日案内</button>
            <button class="btn btn-small btn-neutral" data-segment-template="revisit" type="button">再来店案内</button>
          </div>
          <span id="segmentCharCount" class="item-meta">0/5000</span>
        </div>
      </div>

      <div class="page-actions" style="margin-top:14px;">
        <button id="segmentPreviewBtn" class="btn btn-primary" type="button">対象・文面を確認する</button>
      </div>

      <div class="section-divider"></div>
      <div class="panel-head">
        <div><h4 style="margin:0;">最近の配信履歴</h4><p style="margin:5px 0 0;">デモ記録を含む直近のセグメント配信です。</p></div>
        <button id="segmentRecentRefreshBtn" class="btn btn-small btn-neutral" type="button">更新</button>
      </div>
      <div id="segmentRecentList" class="simple-list"><div class="empty">読み込み中...</div></div>
    `;
  }

  function ensureModal() {
    if ($("segmentSafetyModal")) return;
    const wrap = document.createElement("div");
    wrap.id = "segmentSafetyModal";
    wrap.className = "modal-backdrop";
    wrap.hidden = true;
    wrap.innerHTML = `
      <section class="modal">
        <header class="modal-head">
          <div><h3 id="segmentModalTitle">LINE配信 最終確認</h3><p id="segmentModalMeta">対象と文面を確認してください。</p></div>
          <button id="segmentModalClose" class="icon-btn" type="button" aria-label="閉じる">×</button>
        </header>
        <div id="segmentModalBody" class="modal-body"></div>
        <footer id="segmentModalFoot" class="modal-foot"></footer>
      </section>`;
    document.body.appendChild(wrap);
    $("segmentModalClose").addEventListener("click", closeModal);
    wrap.addEventListener("click", (event) => {
      if (event.target === wrap) closeModal();
    });
  }

  function openModal() {
    ensureModal();
    $("segmentSafetyModal").hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if ($("segmentSafetyModal")) $("segmentSafetyModal").hidden = true;
    document.body.style.overflow = "";
  }

  function previewRecipientRows(recipients) {
    return recipients.map((r) => `
      <article class="simple-item" style="padding:10px 12px;">
        <strong>${esc(r.customer_name)} 様</strong>
        <div class="item-meta">${esc(r.customer_no || "")}｜対象：${esc((r.subject_names || []).join("、"))}</div>
        <div class="item-tags">
          ${r.line_linked ? '<span class="badge green">LINE連携済み</span>' : '<span class="badge amber">LINE未連携・除外</span>'}
        </div>
      </article>`).join("");
  }

  function currentCriteria() {
    return {
      target_year: $("followupTargetYear")?.value || null,
      ages: [3, 5, 7].filter((age) => $(`followupAge${age}`)?.checked),
      birthday_month: $("followupBirthdayMonth")?.value || null,
      inactive_months: $("followupInactiveMonths")?.value || null,
      line_status: $("followupLineStatus")?.value || "all",
      query: $("followupQuery")?.value?.trim() || null,
    };
  }

  async function showPreview() {
    const ids = selectedIds();
    const body = $("segmentMessageBody")?.value?.trim() || "";
    if (!ids.length) {
      alert("LINE配信する撮影対象者を1名以上選択してください。");
      return;
    }
    if (!body) {
      alert("配信文を入力してください。");
      return;
    }

    const button = $("segmentPreviewBtn");
    button.disabled = true;
    button.textContent = "確認しています...";
    try {
      const result = await api("/api/admin/segments/preview", {
        method: "POST",
        body: { subject_ids: ids, body, criteria: currentCriteria() },
      });
      state.preview = result.preview;
      renderPreviewModal();
    } catch (error) {
      alert(error.message || String(error));
    } finally {
      button.disabled = false;
      button.textContent = "対象・文面を確認する";
    }
  }

  function renderPreviewModal() {
    const p = state.preview;
    if (!p) return;
    openModal();
    $("segmentModalTitle").textContent = "LINE配信 対象確認";
    $("segmentModalMeta").textContent = "まだLINEには送信されません。対象と文面を確認してください。";
    $("segmentModalBody").innerHTML = `
      <div class="detail-summary">
        <div class="detail-box"><span>選択した撮影対象者</span><strong>${p.selected_subject_count}名</strong></div>
        <div class="detail-box"><span>顧客単位</span><strong>${p.unique_customer_count}名</strong></div>
        <div class="detail-box"><span>配信可能</span><strong>${p.deliverable_customer_count}名</strong></div>
        <div class="detail-box"><span>重複除外</span><strong>${p.duplicate_subject_count}件</strong></div>
        <div class="detail-box"><span>LINE未連携</span><strong>${p.unlinked_customer_count}名</strong></div>
      </div>
      <div class="auth-note" style="margin:12px 0;">${capabilityBadge(p.capability)} ${
        p.capability?.demoMode ? "このデモでは実際のLINEへは送信されません。" : ""
      }</div>
      <h4>配信文</h4>
      <div class="detail-box"><strong style="white-space:pre-wrap;">${esc(p.body)}</strong></div>
      <h4>対象顧客</h4>
      <div class="simple-list">${previewRecipientRows(p.recipients || [])}</div>`;
    $("segmentModalFoot").innerHTML = `
      <button id="segmentPreviewCancelBtn" class="btn btn-neutral" type="button">戻る</button>
      <button id="segmentPrepareBtn" class="btn btn-primary" type="button">この対象・文面で配信準備</button>`;
    $("segmentPreviewCancelBtn").addEventListener("click", closeModal);
    $("segmentPrepareBtn").addEventListener("click", prepareCampaign);
  }

  async function prepareCampaign() {
    const p = state.preview;
    if (!p) return;
    const button = $("segmentPrepareBtn");
    button.disabled = true;
    button.textContent = "配信準備を保存しています...";
    try {
      const result = await api("/api/admin/segments/prepare", {
        method: "POST",
        body: {
          subject_ids: selectedIds(),
          body: p.body,
          campaign_name: "顧客フォロー",
          criteria: currentCriteria(),
        },
      });
      state.campaign = result.campaign;
      renderFinalModal();
    } catch (error) {
      alert(error.message || String(error));
      button.disabled = false;
      button.textContent = "この対象・文面で配信準備";
    }
  }

  function renderFinalModal() {
    const c = state.campaign;
    if (!c) return;
    const demo = c.send_mode === "demo_record_only";
    $("segmentModalTitle").textContent = demo ? "デモ配信 最終確認" : "LINE配信 最終確認";
    $("segmentModalMeta").textContent = "ここが最終確認です。確定後は対象と文面を変更できません。";
    $("segmentModalBody").innerHTML = `
      <div class="auth-note" style="margin:0 0 12px;">
        ${demo
          ? "<strong>デモ安全モード：</strong>LINEへは実送信せず、配信記録だけ保存します。"
          : "<strong>本番配信：</strong>確定するとLINEへ実際に配信されます。"}
      </div>
      <div class="detail-summary">
        <div class="detail-box"><span>配信対象</span><strong>${c.deliverable_customer_count}名</strong></div>
        <div class="detail-box"><span>重複除外</span><strong>${c.duplicate_subject_count}件</strong></div>
        <div class="detail-box"><span>LINE未連携除外</span><strong>${c.unlinked_customer_count}名</strong></div>
        <div class="detail-box"><span>確認期限</span><strong>${esc(new Date(c.expires_at).toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"}))}</strong></div>
      </div>
      <h4>配信文</h4>
      <div class="detail-box"><strong style="white-space:pre-wrap;">${esc(c.body_snapshot)}</strong></div>
      <label class="auth-note" style="display:block;margin:14px 0 0;">
        <input id="segmentFinalConfirm" type="checkbox" />
        対象人数・除外数・配信文を確認しました
      </label>`;
    $("segmentModalFoot").innerHTML = `
      <button id="segmentFinalBackBtn" class="btn btn-neutral" type="button">キャンセル</button>
      <button id="segmentFinalSendBtn" class="btn btn-primary" type="button">${
        demo ? "デモ配信記録を保存（実送信なし）" : "LINEへ配信する"
      }</button>`;
    $("segmentFinalBackBtn").addEventListener("click", closeModal);
    $("segmentFinalSendBtn").addEventListener("click", finalSend);
  }

  async function finalSend() {
    const c = state.campaign;
    if (!c) return;
    if (!$("segmentFinalConfirm")?.checked) {
      alert("最終確認のチェックを入れてください。");
      return;
    }
    const demo = c.send_mode === "demo_record_only";
    const message = demo
      ? `デモ配信記録を${c.deliverable_customer_count}名分保存します。実際のLINEには送信されません。よろしいですか？`
      : `${c.deliverable_customer_count}名へLINEを実配信します。送信後は取り消せません。よろしいですか？`;
    if (!window.confirm(message)) return;

    const button = $("segmentFinalSendBtn");
    button.disabled = true;
    button.textContent = demo ? "記録しています..." : "配信しています...";
    try {
      const result = await api("/api/admin/segments/send", {
        method: "POST",
        body: {
          campaign_id: c.id,
          confirm: true,
          confirm_count: c.deliverable_customer_count,
          confirm_body_sha256: c.body_sha256,
        },
      });
      renderDoneModal(result);
      state.selected.clear();
      injectSelectionControls();
      await loadRecent();
    } catch (error) {
      alert(error.message || String(error));
      button.disabled = false;
      button.textContent = demo ? "デモ配信記録を保存（実送信なし）" : "LINEへ配信する";
    }
  }

  function renderDoneModal(result) {
    const demo = result.demo_recorded === true;
    $("segmentModalTitle").textContent = demo ? "デモ配信記録 完了" : "LINE配信 完了";
    $("segmentModalMeta").textContent = demo
      ? "LINEへは送信せず、安全に配信フローの記録だけ保存しました。"
      : "LINE配信処理が完了しました。";
    $("segmentModalBody").innerHTML = `
      <div class="detail-summary">
        <div class="detail-box"><span>${demo ? "記録対象" : "配信成功"}</span><strong>${
          result.recipients_recorded ?? result.recipients_sent ?? 0
        }名</strong></div>
        <div class="detail-box"><span>直前変更による除外</span><strong>${result.skipped_changed || 0}名</strong></div>
      </div>
      <div class="auth-note" style="margin-top:12px;">${esc(result.message || (demo ? "デモ記録を保存しました。" : "配信ログを保存しました。"))}</div>`;
    $("segmentModalFoot").innerHTML = '<button id="segmentDoneBtn" class="btn btn-primary" type="button">閉じる</button>';
    $("segmentDoneBtn").addEventListener("click", closeModal);
  }

  function statusBadge(status) {
    const labels = {
      prepared: ["確認待ち", "amber"],
      sending: ["配信中", "blue"],
      sent: ["配信完了", "green"],
      demo_recorded: ["デモ記録", "green"],
      partial_failed: ["一部失敗", "amber"],
      failed: ["失敗", "red"],
      expired: ["期限切れ", "gray"],
      cancelled: ["取消", "gray"],
    };
    const [label, tone] = labels[status] || [status || "-", "gray"];
    return `<span class="badge ${tone}">${esc(label)}</span>`;
  }

  async function loadRecent() {
    if (!$("segmentRecentList")) return;
    try {
      const result = await api("/api/admin/segments/recent?limit=10");
      const rows = result.campaigns || [];
      $("segmentRecentList").innerHTML = rows.length ? rows.map((c) => `
        <article class="simple-item" style="padding:10px 12px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;">
          <div>
            <strong>${esc(c.campaign_name || "顧客フォロー")}</strong>
            <div class="item-meta">${esc(c.campaign_no)}｜対象 ${c.deliverable_customer_count || 0}名｜重複除外 ${c.duplicate_subject_count || 0}件</div>
          </div>
          <div>${statusBadge(c.status)}</div>
        </article>`).join("") : '<div class="empty">配信履歴はまだありません。</div>';
    } catch (error) {
      $("segmentRecentList").innerHTML = `<div class="empty">配信履歴を読み込めませんでした：${esc(error.message || error)}</div>`;
    }
  }

  async function loadCapability() {
    try {
      const result = await api("/api/admin/segments/capability");
      state.capability = result.capability || null;
      if ($("segmentCapabilityBadge")) $("segmentCapabilityBadge").innerHTML = capabilityBadge(state.capability);
      const previewBtn = $("segmentPreviewBtn");
      if (previewBtn) {
        previewBtn.disabled = state.capability?.enabled !== true;
        if (state.capability?.enabled !== true) previewBtn.title = "店舗設定でLINEセグメント配信をONにしてください。";
      }
    } catch (error) {
      if ($("segmentCapabilityBadge")) $("segmentCapabilityBadge").innerHTML = '<span class="badge red">接続確認エラー</span>';
    }
  }

  function enableSettingsSwitch() {
    const box = $("featureLineSegment");
    if (box) {
      box.disabled = false;
      box.title = "LINEセグメント配信のON/OFF";
    }
  }

  function bindPanelEvents() {
    $("segmentSelectAllBtn")?.addEventListener("click", selectAllLinked);
    $("segmentClearBtn")?.addEventListener("click", clearSelection);
    $("segmentPreviewBtn")?.addEventListener("click", showPreview);
    $("segmentMessageBody")?.addEventListener("input", updateCharCount);
    $("segmentRecentRefreshBtn")?.addEventListener("click", loadRecent);

    const refreshSegmentSoon = () => setTimeout(() => {
      loadCapability();
      loadRecent();
    }, 350);

    $("refreshAllBtn")?.addEventListener("click", refreshSegmentSoon);
    $("followupRefreshBtn")?.addEventListener("click", refreshSegmentSoon);

    document.querySelectorAll("[data-segment-template]").forEach((button) => {
      button.addEventListener("click", () => setTemplate(button.dataset.segmentTemplate));
    });
  }

  function mount() {
    if (state.mounted) return;
    const mountNode = linePanel();
    if (!mountNode) return;
    state.mounted = true;
    mountNode.className = "";
    mountNode.style.margin = "0";
    mountNode.innerHTML = panelHtml();
    enableSettingsSwitch();
    bindPanelEvents();
    ensureModal();

    const results = $("followupResults");
    if (results) {
      const observer = new MutationObserver(() => injectSelectionControls());
      observer.observe(results, { childList: true, subtree: true });
      injectSelectionControls();
    }

    loadCapability();
    loadRecent();
    updateCharCount();
  }

  function boot() {
    const timer = setInterval(() => {
      if (linePanel()) {
        clearInterval(timer);
        mount();
      }
    }, 200);
    setTimeout(() => clearInterval(timer), 15000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  window.DPRO_PHOTO_SEGMENT = Object.freeze({
    version: VERSION,
    selectAllLinked,
    clearSelection,
    refresh: () => { injectSelectionControls(); loadCapability(); loadRecent(); },
  });
})();