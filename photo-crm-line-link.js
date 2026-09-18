(() => {
  "use strict";

  const VERSION = "DPRO-PHOTO-CRM-BRUSHUP-7-UI-20260918";
  const API_BASE = "https://cbknucemarcpbscirzyv.supabase.co/functions/v1/dpro-photo-product-ready-gateway-v7";

  const state = {
    capability: null,
    friends: [],
    customers: [],
    selectedFriend: null,
    selectedCustomer: null,
    prepared: null,
    confirmToken: "",
    mounted: false,
  };

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));

  function cfg() {
    return window.DPRO_STUDIO || window.DPRO_PHOTO_STUDIO_CONFIG || null;
  }

  function token() {
    const c = cfg();
    return c && typeof c.getSessionToken === "function" ? c.getSessionToken("owner") : "";
  }

  async function waitToken(timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const t = token();
      if (t) return t;
      await new Promise((r) => setTimeout(r, 250));
    }
    return "";
  }

  async function api(path, { method = "GET", body = null } = {}) {
    const t = token() || await waitToken();
    if (!t) throw new Error("管理者認証が必要です。画面を再読み込みしてください。");
    const r = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Owner-Session": t,
      },
      body: body === null ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    const data = await r.json().catch(() => null);
    if (!r.ok || data?.ok === false) {
      const err = new Error(data?.error || data?.message || `通信に失敗しました（HTTP ${r.status}）`);
      err.code = data?.code || "";
      err.detail = data?.detail || null;
      throw err;
    }
    return data;
  }

  function panelHtml() {
    return `
      <div class="panel-head">
        <div>
          <h3>LINE友だち・既存顧客の再紐付け</h3>
          <p>未紐付けのLINE友だちを、本人確認後に既存顧客へ安全に紐付けます。</p>
        </div>
        <span id="lineLinkCapabilityBadge" class="badge blue">${esc(VERSION)}</span>
      </div>

      <div class="auth-note" style="margin:0 0 14px;">
        <strong>安全ルール：</strong>
        LINE表示名だけでは自動紐付けしません。顧客番号＋登録電話番号下4桁などの本人確認根拠を確認し、
        既にLINE連携済みの顧客は「再紐付け」として明示確認してから置き換えます。
        別顧客に紐付いているLINE IDの横取りはサーバー側で拒否します。
      </div>

      <div id="lineCustomerLinkOffNote" class="empty" hidden>
        店舗設定の「既存顧客とLINE再紐付け」をONにして保存すると利用できます。
      </div>

      <div id="lineCustomerLinkBody">
        <section>
          <div class="panel-head">
            <div>
              <h4 style="margin:0;">1. 未紐付けLINE友だち</h4>
              <p style="margin:5px 0 0;">LINE側で確認できた友だちから対象を選択します。</p>
            </div>
            <button id="lineLinkRefreshBtn" class="btn btn-small btn-neutral" type="button">更新</button>
          </div>
          <div id="lineLinkFriendList" class="simple-list"><div class="empty">読み込み中...</div></div>
        </section>

        <section id="lineLinkCustomerSection" style="margin-top:18px;" hidden>
          <div class="panel-head">
            <div>
              <h4 style="margin:0;">2. 既存顧客を検索</h4>
              <p style="margin:5px 0 0;">顧客番号・氏名・電話番号で候補を検索します。</p>
            </div>
          </div>
          <div class="filters">
            <div class="field" style="flex:1;">
              <label for="lineLinkCustomerQuery">顧客番号・氏名・電話番号</label>
              <input id="lineLinkCustomerQuery" class="input" type="search" placeholder="例：PHOTO-DEMO-999、田中、090..." />
            </div>
            <button id="lineLinkCustomerSearchBtn" class="btn btn-primary" type="button">顧客を検索</button>
          </div>
          <div id="lineLinkCustomerResults" class="simple-list" style="margin-top:12px;"></div>
        </section>

        <section id="lineLinkEvidenceSection" style="margin-top:18px;" hidden>
          <div class="panel-head">
            <div>
              <h4 style="margin:0;">3. 本人確認・再紐付け確認</h4>
              <p style="margin:5px 0 0;">LINE上で本人から確認した情報と顧客台帳を照合します。</p>
            </div>
          </div>
          <div id="lineLinkSelectedSummary" class="auth-note"></div>

          <div id="lineLinkEvidenceFields" class="form-grid" style="margin-top:12px;">
            <div class="field">
              <label for="lineLinkConfirmCustomerNo">本人から確認した顧客番号</label>
              <input id="lineLinkConfirmCustomerNo" class="input" type="text" autocomplete="off" />
            </div>
            <div class="field">
              <label for="lineLinkConfirmPhone4">本人から確認した登録電話番号 下4桁</label>
              <input id="lineLinkConfirmPhone4" class="input" type="text" maxlength="4" inputmode="numeric" autocomplete="off" />
            </div>
          </div>

          <div id="lineLinkDemoEvidence" class="auth-note" style="margin-top:12px;" hidden>
            <strong>デモ本人確認済み：</strong>
            この合成LINE友だちはBRUSHUP-7のQA専用です。実在LINE IDには影響しません。
          </div>

          <label id="lineLinkReplaceWrap" class="auth-note" style="display:block;margin-top:12px;" hidden>
            <input id="lineLinkReplaceConfirm" type="checkbox" />
            現在のLINE紐付けを解除し、この新しいLINE友だちへ置き換えることを確認しました。
          </label>

          <div class="page-actions" style="margin-top:12px;">
            <button id="lineLinkPrepareBtn" class="btn btn-primary" type="button">紐付け内容を確認する</button>
          </div>
        </section>

        <section id="lineLinkFinalSection" style="margin-top:18px;" hidden>
          <div class="panel-head">
            <div>
              <h4 style="margin:0;">4. 最終確認</h4>
              <p style="margin:5px 0 0;">確認後はLINE IDが顧客台帳へ反映され、監査ログが保存されます。</p>
            </div>
          </div>
          <div id="lineLinkFinalSummary" class="auth-note"></div>
          <label class="auth-note" style="display:block;margin-top:12px;">
            <input id="lineLinkFinalConfirm" type="checkbox" />
            LINE友だち・顧客・現在のLINE状態・本人確認根拠を確認しました。
          </label>
          <div class="page-actions" style="margin-top:12px;">
            <button id="lineLinkCommitBtn" class="btn btn-primary" type="button">この内容で紐付けを確定</button>
            <button id="lineLinkCancelPreparedBtn" class="btn btn-neutral" type="button">戻る</button>
          </div>
        </section>

        <section style="margin-top:20px;">
          <div class="panel-head">
            <div>
              <h4 style="margin:0;">最近のLINE紐付け履歴</h4>
              <p style="margin:5px 0 0;">紐付け・再紐付け・解除の操作証跡です。</p>
            </div>
            <button id="lineLinkAuditRefreshBtn" class="btn btn-small btn-neutral" type="button">更新</button>
          </div>
          <div id="lineLinkAuditList" class="simple-list"><div class="empty">履歴はまだありません。</div></div>
        </section>
      </div>
    `;
  }

  function settingsView() {
    return $("view-settings");
  }

  function enabled() {
    return $("featureLineCustomerLink")?.checked === true;
  }

  function updateEnabledState() {
    const on = enabled();
    if ($("lineCustomerLinkOffNote")) $("lineCustomerLinkOffNote").hidden = on;
    if ($("lineCustomerLinkBody")) $("lineCustomerLinkBody").hidden = !on;
    if (on) {
      loadCapability();
      loadFriends();
      loadAudit();
    }
  }

  async function loadCapability() {
    if (!enabled()) return;
    try {
      const r = await api("/api/admin/line-links/capability");
      state.capability = r.capability || null;
      if ($("lineLinkCapabilityBadge")) {
        $("lineLinkCapabilityBadge").textContent = state.capability?.demo
          ? "デモ安全モード"
          : "本人確認必須";
      }
    } catch {
      if ($("lineLinkCapabilityBadge")) $("lineLinkCapabilityBadge").textContent = "確認エラー";
    }
  }

  function friendCard(friend) {
    return `<article class="simple-item" style="padding:12px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;">
      <div>
        <strong>${esc(friend.display_name || "LINE友だち")}</strong>
        <div class="item-meta">LINE：${esc(friend.line_hint || "-")}｜状態：${esc(friend.status || "-")}</div>
        <div class="item-tags" style="margin-top:6px;">
          <span class="badge ${friend.demo ? "amber" : "blue"}">${friend.demo ? "QAデモ" : "未紐付け"}</span>
        </div>
      </div>
      <button class="btn btn-small btn-secondary" data-select-line-friend="${esc(friend.id)}" type="button">このLINEを確認</button>
    </article>`;
  }

  async function loadFriends() {
    if (!enabled() || !$("lineLinkFriendList")) return;
    try {
      const r = await api("/api/admin/line-links/pending");
      state.friends = r.friends || [];
      $("lineLinkFriendList").innerHTML = state.friends.length
        ? state.friends.map(friendCard).join("")
        : '<div class="empty">未紐付けのLINE友だちはありません。</div>';
    } catch (error) {
      $("lineLinkFriendList").innerHTML = `<div class="empty">LINE友だちを読み込めませんでした：${esc(error.message || error)}</div>`;
    }
  }

  function selectFriend(id) {
    state.selectedFriend = state.friends.find((x) => x.id === id) || null;
    state.selectedCustomer = null;
    state.prepared = null;
    state.confirmToken = "";
    $("lineLinkCustomerSection").hidden = !state.selectedFriend;
    $("lineLinkEvidenceSection").hidden = true;
    $("lineLinkFinalSection").hidden = true;
    $("lineLinkCustomerResults").innerHTML = "";
    if (state.selectedFriend?.demo) {
      $("lineLinkCustomerQuery").value = "PHOTO-DEMO-999";
      searchCustomers();
    } else {
      $("lineLinkCustomerQuery").value = "";
      $("lineLinkCustomerQuery")?.focus();
    }
  }

  async function searchCustomers() {
    const q = $("lineLinkCustomerQuery")?.value?.trim() || "";
    if (q.length < 2) return alert("顧客番号・氏名・電話番号を2文字以上入力してください。");
    const btn = $("lineLinkCustomerSearchBtn");
    btn.disabled = true;
    btn.textContent = "検索中...";
    try {
      const r = await api(`/api/admin/line-links/customers?q=${encodeURIComponent(q)}`);
      state.customers = r.customers || [];
      $("lineLinkCustomerResults").innerHTML = state.customers.length
        ? state.customers.map((c) => `<article class="simple-item" style="padding:10px 12px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;">
            <div>
              <strong>${esc(c.customer_name)}</strong>
              <div class="item-meta">${esc(c.customer_no || "")}｜${esc(c.phone_masked || "電話なし")}</div>
              <div class="item-tags" style="margin-top:5px;">
                <span class="badge ${c.line_linked ? "blue" : "gray"}">${c.line_linked ? `LINE連携済み ${esc(c.line_user_hint || "")}` : "LINE未連携"}</span>
              </div>
            </div>
            <button class="btn btn-small btn-secondary" data-select-line-customer="${esc(c.id)}" type="button">この顧客を選択</button>
          </article>`).join("")
        : '<div class="empty">一致する顧客がありません。</div>';
      if (state.selectedFriend?.demo && state.customers.length === 1) {
        selectCustomer(state.customers[0].id);
      }
    } catch (error) {
      alert(error.message || String(error));
    } finally {
      btn.disabled = false;
      btn.textContent = "顧客を検索";
    }
  }

  function selectCustomer(id) {
    state.selectedCustomer = state.customers.find((x) => x.id === id) || null;
    state.prepared = null;
    state.confirmToken = "";
    $("lineLinkFinalSection").hidden = true;
    if (!state.selectedCustomer || !state.selectedFriend) {
      $("lineLinkEvidenceSection").hidden = true;
      return;
    }

    $("lineLinkEvidenceSection").hidden = false;
    $("lineLinkSelectedSummary").innerHTML = `
      <strong>LINE：</strong>${esc(state.selectedFriend.display_name)}（${esc(state.selectedFriend.line_hint)}）<br />
      <strong>顧客：</strong>${esc(state.selectedCustomer.customer_name)}｜${esc(state.selectedCustomer.customer_no)}
      ${state.selectedCustomer.line_linked ? `<br /><strong>現在のLINE：</strong>${esc(state.selectedCustomer.line_user_hint || "")}` : ""}
    `;

    const demo = state.selectedFriend.demo === true;
    $("lineLinkEvidenceFields").hidden = demo;
    $("lineLinkDemoEvidence").hidden = !demo;
    $("lineLinkConfirmCustomerNo").value = "";
    $("lineLinkConfirmPhone4").value = "";

    const replace = state.selectedCustomer.line_linked === true;
    $("lineLinkReplaceWrap").hidden = !replace;
    $("lineLinkReplaceConfirm").checked = false;
  }

  async function prepareLink() {
    if (!state.selectedFriend || !state.selectedCustomer) return alert("LINE友だちと顧客を選択してください。");
    const replace = state.selectedCustomer.line_linked === true;
    if (replace && !$("lineLinkReplaceConfirm")?.checked) {
      return alert("現在のLINEを置き換える確認チェックを入れてください。");
    }

    const body = {
      friend_id: state.selectedFriend.id,
      customer_id: state.selectedCustomer.id,
      replace_existing: replace,
      evidence_type: state.selectedFriend.demo ? "demo_verified" : "customer_no_phone",
      customer_no_confirmation: state.selectedFriend.demo ? undefined : $("lineLinkConfirmCustomerNo").value.trim(),
      phone_last4_confirmation: state.selectedFriend.demo ? undefined : $("lineLinkConfirmPhone4").value.trim(),
    };

    const btn = $("lineLinkPrepareBtn");
    btn.disabled = true;
    btn.textContent = "確認データを作成しています...";
    try {
      const r = await api("/api/admin/line-links/prepare", { method: "POST", body });
      state.prepared = r.request;
      state.confirmToken = r.confirm_token || "";
      renderFinal();
    } catch (error) {
      alert(error.message || String(error));
    } finally {
      btn.disabled = false;
      btn.textContent = "紐付け内容を確認する";
    }
  }

  function renderFinal() {
    const r = state.prepared;
    if (!r) return;
    $("lineLinkFinalSection").hidden = false;
    $("lineLinkFinalConfirm").checked = false;
    $("lineLinkFinalSummary").innerHTML = `
      <div class="detail-summary">
        <div class="detail-box"><span>LINE友だち</span><strong>${esc(r.friend.display_name)}</strong><small>${esc(r.friend.line_hint)}</small></div>
        <div class="detail-box"><span>既存顧客</span><strong>${esc(r.customer.customer_name)}</strong><small>${esc(r.customer.customer_no)}</small></div>
        <div class="detail-box"><span>操作</span><strong>${r.replace_existing ? "再紐付け" : "新規紐付け"}</strong></div>
        <div class="detail-box"><span>本人確認</span><strong>${r.evidence_type === "demo_verified" ? "QAデモ確認" : "顧客番号＋電話下4桁"}</strong></div>
      </div>
      ${r.replace_existing ? `<div class="auth-note" style="margin-top:10px;"><strong>置換：</strong>現在のLINE ${esc(r.customer.current_line_hint || "")} を解除し、新LINE ${esc(r.friend.line_hint)} に変更します。</div>` : ""}
      <div class="item-meta" style="margin-top:8px;">確認期限：${esc(new Date(r.expires_at).toLocaleString("ja-JP"))}</div>
    `;
    $("lineLinkFinalSection").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function commitLink() {
    if (!state.prepared || !state.confirmToken) return alert("紐付け確認データがありません。");
    if (!$("lineLinkFinalConfirm")?.checked) return alert("最終確認チェックを入れてください。");

    const btn = $("lineLinkCommitBtn");
    btn.disabled = true;
    btn.textContent = "紐付けています...";
    try {
      const r = await api("/api/admin/line-links/commit", {
        method: "POST",
        body: {
          request_id: state.prepared.id,
          confirm_token: state.confirmToken,
          confirm: true,
          confirm_customer_no: state.prepared.customer.customer_no,
        },
      });
      const action = r.result?.action === "relink" ? "再紐付け" : "紐付け";
      alert(`LINE ${action}が完了しました。`);
      state.selectedFriend = null;
      state.selectedCustomer = null;
      state.prepared = null;
      state.confirmToken = "";
      $("lineLinkCustomerSection").hidden = true;
      $("lineLinkEvidenceSection").hidden = true;
      $("lineLinkFinalSection").hidden = true;
      await Promise.all([loadFriends(), loadAudit()]);
      $("refreshAllBtn")?.click();
    } catch (error) {
      alert(error.message || String(error));
    } finally {
      btn.disabled = false;
      btn.textContent = "この内容で紐付けを確定";
    }
  }

  async function loadAudit() {
    if (!enabled() || !$("lineLinkAuditList")) return;
    try {
      const r = await api("/api/admin/line-links/audit");
      const rows = r.rows || [];
      $("lineLinkAuditList").innerHTML = rows.length
        ? rows.map((x) => `<article class="simple-item" style="padding:10px 12px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;">
            <div>
              <strong>${esc(x.customer?.customer_name || "顧客")}</strong>
              <div class="item-meta">${esc(x.customer?.customer_no || "")}｜${esc(x.action)}｜本人確認：${esc(x.evidence_type || "-")}</div>
              <div class="item-meta">${esc(x.previous_line_hint || "未連携")} → ${esc(x.new_line_hint || "未連携")}</div>
            </div>
            <div class="item-meta">${esc(new Date(x.created_at).toLocaleString("ja-JP"))}</div>
          </article>`).join("")
        : '<div class="empty">LINE紐付け履歴はまだありません。</div>';
    } catch (error) {
      $("lineLinkAuditList").innerHTML = `<div class="empty">履歴を読み込めませんでした：${esc(error.message || error)}</div>`;
    }
  }

  function bind() {
    $("lineLinkRefreshBtn")?.addEventListener("click", () => Promise.all([loadFriends(), loadAudit()]));
    $("lineLinkCustomerSearchBtn")?.addEventListener("click", searchCustomers);
    $("lineLinkCustomerQuery")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        searchCustomers();
      }
    });
    $("lineLinkPrepareBtn")?.addEventListener("click", prepareLink);
    $("lineLinkCommitBtn")?.addEventListener("click", commitLink);
    $("lineLinkCancelPreparedBtn")?.addEventListener("click", () => {
      state.prepared = null;
      state.confirmToken = "";
      $("lineLinkFinalSection").hidden = true;
    });
    $("lineLinkAuditRefreshBtn")?.addEventListener("click", loadAudit);

    document.addEventListener("click", (event) => {
      const friend = event.target.closest("[data-select-line-friend]");
      if (friend) selectFriend(friend.dataset.selectLineFriend);
      const customer = event.target.closest("[data-select-line-customer]");
      if (customer) selectCustomer(customer.dataset.selectLineCustomer);
    });

    $("featureLineCustomerLink")?.addEventListener("change", updateEnabledState);
    $("refreshAllBtn")?.addEventListener("click", () => setTimeout(() => {
      updateEnabledState();
      if (enabled()) Promise.all([loadFriends(), loadAudit()]);
    }, 350));

    window.addEventListener("dpro:photo-settings-rendered", (event) => {
      const flag = $("featureLineCustomerLink");
      if (flag) {
        flag.checked = event?.detail?.lineCustomerLink === true;
        flag.disabled = false;
      }
      updateEnabledState();
    });
  }

  function mount() {
    if (state.mounted || !settingsView()) return;
    state.mounted = true;

    const flag = $("featureLineCustomerLink");
    if (flag) {
      flag.disabled = false;
      flag.title = "既存顧客とLINE友だちの再紐付け";
    }

    const panel = document.createElement("section");
    panel.id = "lineCustomerLinkPanel";
    panel.className = "panel";
    panel.innerHTML = panelHtml();
    settingsView().appendChild(panel);

    bind();
    updateEnabledState();
  }

  function boot() {
    const timer = setInterval(() => {
      if (settingsView()) {
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

  window.DPRO_PHOTO_LINE_LINK = Object.freeze({
    version: VERSION,
    refresh: () => Promise.all([loadFriends(), loadAudit()]),
  });
})();
