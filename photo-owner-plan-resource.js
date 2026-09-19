(() => {
  "use strict";

  const C = window.DPRO_STUDIO || window.DPRO_PHOTO_STUDIO_CONFIG;
  const VERSION = "DPRO-PHOTO-OWNER-OPERATIONS-BRUSHUP-9-3-1-PRICE-LABEL-20260919";
  if (!C || !document.getElementById("view-settings")) return;

  const esc = (v) => C.escapeHtml(v ?? "");
  const token = () => String(C.getSessionToken("owner") || "").trim();
  const WEEKDAYS = [
    { v: 0, l: "日" }, { v: 1, l: "月" }, { v: 2, l: "火" },
    { v: 3, l: "水" }, { v: 4, l: "木" }, { v: 5, l: "金" }, { v: 6, l: "土" },
  ];
  const RESOURCE_TYPES = {
    studio_room: "スタジオ",
    profile_booth: "プロフィールブース",
    dressing_room: "着付け・更衣室",
    outdoor: "屋外",
    mobile: "出張・移動",
    other: "その他",
  };

  let data = { plans: [], resources: [], categories: [] };
  let loading = false;

  async function request(path, options = {}) {
    const response = await fetch(`${C.CALENDAR_API_BASE_URL}${path}`, {
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
      error.detail = payload?.detail || null;
      throw error;
    }
    return payload;
  }

  function injectStyle() {
    if (document.getElementById("photoOwnerPlanResourceStyle")) return;
    const style = document.createElement("style");
    style.id = "photoOwnerPlanResourceStyle";
    style.textContent = `
      .pr-v2-summary{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 14px}
      .pr-v2-summary span{display:inline-flex;padding:5px 9px;border-radius:999px;background:#edf6f3;font-size:11px}
      .pr-v2-section{border-top:1px solid var(--line,#dfe7e5);padding-top:16px;margin-top:16px}
      .pr-v2-section-head{display:flex;gap:12px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;margin-bottom:10px}
      .pr-v2-section-head h4{margin:0;font-size:15px}
      .pr-v2-section-head p{margin:4px 0 0;color:var(--muted,#647b78);font-size:11px;line-height:1.5}
      .pr-v2-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .pr-v2-card{border:1px solid var(--line,#dfe7e5);border-radius:12px;padding:13px;background:#fff}
      .pr-v2-card.is-stopped{background:#f7f8f8;opacity:.8}
      .pr-v2-card-head{display:flex;gap:10px;justify-content:space-between;align-items:flex-start}
      .pr-v2-card h5{margin:0;font-size:15px}
      .pr-v2-meta{margin-top:5px;color:var(--muted,#647b78);font-size:11px;line-height:1.6}
      .pr-v2-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}
      .pr-v2-tag{display:inline-flex;border-radius:999px;padding:3px 7px;background:#edf6f3;font-size:10px}
      .pr-v2-tag.warn{background:#fff4df;color:#8a5b14}
      .pr-v2-tag.stop{background:#f7ecec;color:#9a3f3f}
      .pr-v2-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
      .pr-v2-empty{padding:18px;border:1px dashed var(--line,#dfe7e5);border-radius:12px;color:var(--muted,#647b78);text-align:center}
      .pr-v2-modal-backdrop{position:fixed;inset:0;background:rgba(10,30,27,.45);display:flex;align-items:center;justify-content:center;padding:18px;z-index:10000}
      .pr-v2-modal{width:min(820px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.22)}
      .pr-v2-modal-head,.pr-v2-modal-foot{display:flex;gap:10px;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid var(--line,#dfe7e5)}
      .pr-v2-modal-foot{border-top:1px solid var(--line,#dfe7e5);border-bottom:0;justify-content:flex-end}
      .pr-v2-modal-body{padding:18px}
      .pr-v2-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .pr-v2-form .wide{grid-column:1/-1}
      .pr-v2-weekdays{display:flex;gap:6px;flex-wrap:wrap}
      .pr-v2-weekdays label{display:inline-flex;gap:4px;align-items:center;border:1px solid var(--line,#dfe7e5);border-radius:8px;padding:6px 8px;font-size:11px}
      .pr-v2-help{font-size:10px;color:var(--muted,#647b78);margin-top:4px;line-height:1.5}
      .pr-v2-status{font-size:12px;color:var(--muted,#647b78)}
      @media(max-width:720px){
        .pr-v2-grid,.pr-v2-form{grid-template-columns:1fr}
        .pr-v2-form .wide{grid-column:auto}
      }
    `;
    document.head.appendChild(style);
  }

  function settingsContent() {
    return document.getElementById("settingsV2Content");
  }

  function hideLegacyPanel() {
    const content = settingsContent();
    if (!content) return;
    [...content.querySelectorAll(":scope > section.panel")].forEach((panel) => {
      if (panel.id === "ownerPlanResourceManagementPanel") return;
      const h = String(panel.querySelector("h3")?.textContent || "").trim();
      if (h === "撮影スペース・プラン") {
        panel.dataset.ownerPlanLegacy = "1";
        panel.style.display = "none";
      }
    });
  }

  function ensurePanel() {
    const content = settingsContent();
    if (!content) return null;
    let panel = document.getElementById("ownerPlanResourceManagementPanel");
    if (panel) return panel;

    panel = document.createElement("section");
    panel.id = "ownerPlanResourceManagementPanel";
    panel.className = "panel";
    panel.dataset.settingsGroup = "plans";
    panel.innerHTML = `
      <div class="panel-head">
        <div>
          <h3>撮影プラン管理</h3>
          <p>撮影プランと撮影スペースを追加・編集・停止できます。過去の予約履歴を守るため削除はしません。</p>
        </div>
        <div class="page-actions">
          <button id="prV2Reload" class="btn btn-secondary btn-small" type="button">再読込</button>
        </div>
      </div>
      <div id="prV2Status" class="pr-v2-status">データを読み込んでいます…</div>
      <div id="prV2Summary" class="pr-v2-summary"></div>

      <section class="pr-v2-section">
        <div class="pr-v2-section-head">
          <div><h4>撮影プラン</h4><p>料金・所要時間・受付曜日・開始時間・既定撮影スペースを管理します。</p></div>
          <button id="prV2AddPlan" class="btn btn-primary btn-small" type="button">＋ プランを追加</button>
        </div>
        <div id="prV2PlanGrid" class="pr-v2-grid"></div>
      </section>

      <section class="pr-v2-section">
        <div class="pr-v2-section-head">
          <div><h4>撮影スペース</h4><p>スタジオ・撮影ブースなどの追加・編集・停止を管理します。</p></div>
          <button id="prV2AddResource" class="btn btn-primary btn-small" type="button">＋ 撮影スペースを追加</button>
        </div>
        <div id="prV2ResourceGrid" class="pr-v2-grid"></div>
      </section>
    `;
    content.prepend(panel);

    panel.querySelector("#prV2Reload").addEventListener("click", () => loadData(true));
    panel.querySelector("#prV2AddPlan").addEventListener("click", () => openPlanModal(null));
    panel.querySelector("#prV2AddResource").addEventListener("click", () => openResourceModal(null));
    panel.querySelector("#prV2PlanGrid").addEventListener("click", onPlanClick);
    panel.querySelector("#prV2ResourceGrid").addEventListener("click", onResourceClick);
    return panel;
  }

  function categoryName(id) {
    return data.categories.find((x) => x.id === id)?.category_name || "未分類";
  }

  function resourceName(id) {
    return data.resources.find((x) => x.id === id)?.resource_name || "未設定";
  }

  function weekdayText(days) {
    const set = new Set(Array.isArray(days) ? days.map(Number) : []);
    return WEEKDAYS.filter((x) => set.has(x.v)).map((x) => x.l).join("・") || "未設定";
  }

  function startRuleText(row) {
    const rule = row.start_rule || {};
    if (rule.mode === "fixed_times") return `指定時刻 ${Array.isArray(rule.fixed_times) ? rule.fixed_times.join(" / ") : ""}`;
    return `${Number(rule.interval_minutes || 30)}分間隔`;
  }

  function setStatus(message, error = false) {
    const el = document.getElementById("prV2Status");
    if (!el) return;
    el.textContent = message;
    el.style.color = error ? "#b64040" : "";
  }

  function render() {
    const activePlans = data.plans.filter((x) => x.is_active !== false);
    const activeResources = data.resources.filter((x) => x.is_active !== false);
    const summary = document.getElementById("prV2Summary");
    if (summary) {
      summary.innerHTML = `
        <span>プラン ${data.plans.length}件｜公開 ${activePlans.length}件</span>
        <span>撮影スペース ${data.resources.length}件｜有効 ${activeResources.length}件</span>
      `;
    }

    const pg = document.getElementById("prV2PlanGrid");
    if (pg) {
      pg.innerHTML = data.plans.length ? data.plans.map((row) => {
        const stopped = row.is_active === false;
        const refs = row.reservation_refs || { all: 0, future: 0 };
        return `
          <article class="pr-v2-card ${stopped ? "is-stopped" : ""}">
            <div class="pr-v2-card-head">
              <div>
                <h5>${esc(row.plan_name)}</h5>
                <div class="pr-v2-meta">
                  ${esc(categoryName(row.category_id))}｜${esc(resourceName(row.default_resource_id))}<br>
                  所要 ${esc(row.duration_minutes)}分｜${esc(row.price_label || `${Number(row.base_price || 0).toLocaleString("ja-JP")}円〜`)}<br>
                  受付：${esc(weekdayText(row.available_weekdays))}｜${esc(startRuleText(row))}
                </div>
              </div>
              <span class="pr-v2-tag ${stopped ? "stop" : ""}">${stopped ? "停止中" : "公開中"}</span>
            </div>
            <div class="pr-v2-tags">
              <span class="pr-v2-tag">予約履歴 ${Number(refs.all || 0)}件</span>
              ${Number(refs.future || 0) ? `<span class="pr-v2-tag warn">今後 ${Number(refs.future)}件</span>` : ""}
              <span class="pr-v2-tag">表示順 ${Number(row.display_order || 0)}</span>
            </div>
            ${row.description ? `<div class="pr-v2-meta">${esc(row.description)}</div>` : ""}
            <div class="pr-v2-actions">
              <button class="btn btn-secondary btn-small" type="button" data-pr-plan-edit="${esc(row.id)}">編集</button>
              ${stopped
                ? `<button class="btn btn-primary btn-small" type="button" data-pr-plan-resume="${esc(row.id)}">再開</button>`
                : `<button class="btn btn-neutral btn-small" type="button" data-pr-plan-stop="${esc(row.id)}">停止</button>`}
            </div>
          </article>
        `;
      }).join("") : '<div class="pr-v2-empty">撮影プランがありません。</div>';
    }

    const rg = document.getElementById("prV2ResourceGrid");
    if (rg) {
      rg.innerHTML = data.resources.length ? data.resources.map((row) => {
        const stopped = row.is_active === false;
        const refs = row.reservation_refs || { all: 0, future: 0 };
        const activePlanCount = data.plans.filter((p) => p.is_active !== false && p.default_resource_id === row.id).length;
        return `
          <article class="pr-v2-card ${stopped ? "is-stopped" : ""}">
            <div class="pr-v2-card-head">
              <div>
                <h5>${esc(row.resource_name)}</h5>
                <div class="pr-v2-meta">
                  ${esc(RESOURCE_TYPES[row.resource_type] || row.resource_type)}｜同時 ${Number(row.capacity || 1)}件<br>
                  公開中プラン ${activePlanCount}件
                </div>
              </div>
              <span class="pr-v2-tag ${stopped ? "stop" : ""}">${stopped ? "停止中" : "有効"}</span>
            </div>
            <div class="pr-v2-tags">
              <span class="pr-v2-tag">予約履歴 ${Number(refs.all || 0)}件</span>
              ${Number(refs.future || 0) ? `<span class="pr-v2-tag warn">今後 ${Number(refs.future)}件</span>` : ""}
              <span class="pr-v2-tag">表示順 ${Number(row.display_order || 0)}</span>
            </div>
            ${row.description ? `<div class="pr-v2-meta">${esc(row.description)}</div>` : ""}
            <div class="pr-v2-actions">
              <button class="btn btn-secondary btn-small" type="button" data-pr-resource-edit="${esc(row.id)}">編集</button>
              ${stopped
                ? `<button class="btn btn-primary btn-small" type="button" data-pr-resource-resume="${esc(row.id)}">再開</button>`
                : `<button class="btn btn-neutral btn-small" type="button" data-pr-resource-stop="${esc(row.id)}">停止</button>`}
            </div>
          </article>
        `;
      }).join("") : '<div class="pr-v2-empty">撮影スペースがありません。</div>';
    }
  }

  async function loadData(force = false) {
    if (!token()) {
      setStatus("管理画面の認証完了を待っています…");
      return;
    }
    if (loading && !force) return;
    loading = true;
    setStatus("撮影プラン・撮影スペースを読み込んでいます…");
    try {
      const payload = await request("/api/admin/plan-resource-management");
      data = {
        plans: Array.isArray(payload.plans) ? payload.plans : [],
        resources: Array.isArray(payload.resources) ? payload.resources : [],
        categories: Array.isArray(payload.categories) ? payload.categories : [],
      };
      render();
      setStatus(`読込済み｜${VERSION}`);
    } catch (error) {
      setStatus(error?.message || "読込に失敗しました。", true);
    } finally {
      loading = false;
    }
  }

  function ensureModal() {
    let modal = document.getElementById("prV2ModalBackdrop");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "prV2ModalBackdrop";
    modal.className = "pr-v2-modal-backdrop";
    modal.hidden = true;
    modal.innerHTML = `
      <section class="pr-v2-modal" role="dialog" aria-modal="true">
        <header class="pr-v2-modal-head">
          <div><h3 id="prV2ModalTitle" style="margin:0;"></h3><p id="prV2ModalSub" style="margin:4px 0 0;color:var(--muted,#647b78);font-size:12px;"></p></div>
          <button id="prV2CloseTop" class="btn btn-neutral btn-small" type="button">閉じる</button>
        </header>
        <div id="prV2ModalBody" class="pr-v2-modal-body"></div>
        <footer class="pr-v2-modal-foot">
          <button id="prV2CloseBottom" class="btn btn-neutral" type="button">キャンセル</button>
          <button id="prV2Save" class="btn btn-primary" type="button">保存</button>
        </footer>
      </section>
    `;
    document.body.appendChild(modal);
    const close = () => { modal.hidden = true; };
    modal.querySelector("#prV2CloseTop").addEventListener("click", close);
    modal.querySelector("#prV2CloseBottom").addEventListener("click", close);
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
    return modal;
  }

  function planForm(row) {
    const weekdays = new Set(Array.isArray(row?.available_weekdays) ? row.available_weekdays.map(Number) : [0,1,3,4,5,6]);
    const rule = row?.start_rule || { mode: "interval", interval_minutes: 30, anchor_time: "00:00", fixed_times: [] };
    const categoryOptions = data.categories.map((x) =>
      `<option value="${esc(x.id)}" ${x.id === row?.category_id ? "selected" : ""}>${esc(x.category_name)}</option>`
    ).join("");
    const resourceOptions = data.resources
      .filter((x) => x.is_active !== false || x.id === row?.default_resource_id)
      .map((x) => `<option value="${esc(x.id)}" ${x.id === row?.default_resource_id ? "selected" : ""}>${esc(x.resource_name)}${x.is_active === false ? "（停止中）" : ""}</option>`)
      .join("");
    return `
      <input id="prPlanId" type="hidden" value="${esc(row?.id || "")}" />
      <div class="pr-v2-form">
        <div class="field"><label for="prPlanName">プラン名</label><input id="prPlanName" class="input" maxlength="100" value="${esc(row?.plan_name || "")}" /></div>
        <div class="field"><label for="prPlanCategory">カテゴリ</label><select id="prPlanCategory">${categoryOptions}</select></div>
        <div class="field"><label for="prPlanResource">既定撮影スペース</label><select id="prPlanResource">${resourceOptions}</select></div>
        <div class="field"><label for="prPlanDuration">所要時間（分）</label><input id="prPlanDuration" class="input" type="number" min="30" max="480" step="30" value="${Number(row?.duration_minutes || 60)}" /></div>
        <div class="field"><label for="prPlanPrice">基本料金（税込表示用）</label><input id="prPlanPrice" class="input" type="number" min="0" step="100" value="${Number(row?.base_price || 0)}" /></div>
        <div class="field"><label for="prPlanPriceLabel">料金表示</label><input id="prPlanPriceLabel" class="input" maxlength="80" placeholder="例：33,000円〜" value="${esc(row?.price_label || "")}" /></div>
        <div class="field"><label for="prPlanLead">何日前まで予約可</label><input id="prPlanLead" class="input" type="number" min="0" max="365" value="${Number(row?.booking_lead_days ?? 1)}" /></div>
        <div class="field"><label for="prPlanOpenDays">何日先まで公開</label><input id="prPlanOpenDays" class="input" type="number" min="1" max="730" value="${Number(row?.booking_open_days ?? 180)}" /></div>
        <div class="field"><label for="prPlanMax">最大参加人数</label><input id="prPlanMax" class="input" type="number" min="1" max="100" value="${Number(row?.max_participants ?? 10)}" /></div>
        <div class="field"><label for="prPlanOrder">表示順</label><input id="prPlanOrder" class="input" type="number" min="0" max="9999" value="${Number(row?.display_order ?? 100)}" /></div>
        <div class="field wide">
          <label>受付曜日</label>
          <div class="pr-v2-weekdays">
            ${WEEKDAYS.map((x) => `<label><input class="prPlanWeekday" type="checkbox" value="${x.v}" ${weekdays.has(x.v) ? "checked" : ""} /> ${x.l}</label>`).join("")}
          </div>
        </div>
        <div class="field">
          <label for="prPlanStartMode">予約開始方式</label>
          <select id="prPlanStartMode">
            <option value="interval" ${rule.mode !== "fixed_times" ? "selected" : ""}>30分間隔</option>
            <option value="fixed_times" ${rule.mode === "fixed_times" ? "selected" : ""}>指定時刻</option>
          </select>
        </div>
        <div class="field" id="prPlanFixedWrap">
          <label for="prPlanFixedTimes">指定開始時刻</label>
          <input id="prPlanFixedTimes" class="input" placeholder="09:00, 11:30, 14:00" value="${esc(Array.isArray(rule.fixed_times) ? rule.fixed_times.join(", ") : "")}" />
          <div class="pr-v2-help">30分単位。指定時刻方式のときだけ使用します。</div>
        </div>
        <div class="field wide"><label for="prPlanDesc">公開説明</label><textarea id="prPlanDesc" maxlength="800">${esc(row?.description || "")}</textarea></div>
        <div class="field wide"><label for="prPlanBelongings">持ち物案内</label><textarea id="prPlanBelongings" maxlength="1200">${esc(row?.belongings_guide || "")}</textarea></div>
        <div class="field wide"><label for="prPlanNote">社内メモ</label><textarea id="prPlanNote" maxlength="1200">${esc(row?.internal_note || "")}</textarea></div>
      </div>
      <div id="prV2ModalMessage" class="auth-note" style="margin-top:12px;"></div>
    `;
  }

  function resourceForm(row) {
    return `
      <input id="prResourceId" type="hidden" value="${esc(row?.id || "")}" />
      <div class="pr-v2-form">
        <div class="field"><label for="prResourceName">撮影スペース名</label><input id="prResourceName" class="input" maxlength="100" value="${esc(row?.resource_name || "")}" /></div>
        <div class="field"><label for="prResourceType">種別</label>
          <select id="prResourceType">
            ${Object.entries(RESOURCE_TYPES).map(([v,l]) => `<option value="${v}" ${v === (row?.resource_type || "studio_room") ? "selected" : ""}>${l}</option>`).join("")}
          </select>
        </div>
        <div class="field"><label for="prResourceCapacity">同時対応数</label><input id="prResourceCapacity" class="input" type="number" min="1" max="100" value="${Number(row?.capacity || 1)}" /></div>
        <div class="field"><label for="prResourceOrder">表示順</label><input id="prResourceOrder" class="input" type="number" min="0" max="9999" value="${Number(row?.display_order ?? 100)}" /></div>
        <div class="field wide"><label for="prResourceDesc">説明</label><textarea id="prResourceDesc" maxlength="800">${esc(row?.description || "")}</textarea></div>
      </div>
      <div id="prV2ModalMessage" class="auth-note" style="margin-top:12px;"></div>
    `;
  }

  function openPlanModal(row) {
    const modal = ensureModal();
    modal.dataset.mode = "plan";
    document.getElementById("prV2ModalTitle").textContent = row ? "撮影プランを編集" : "撮影プランを追加";
    document.getElementById("prV2ModalSub").textContent = "料金・所要時間・受付曜日・予約開始時間を設定します。";
    document.getElementById("prV2ModalBody").innerHTML = planForm(row);
    modal.hidden = false;
    document.getElementById("prV2Save").onclick = savePlan;
    const mode = document.getElementById("prPlanStartMode");
    const sync = () => {
      document.getElementById("prPlanFixedWrap").hidden = mode.value !== "fixed_times";
    };
    mode.addEventListener("change", sync);
    sync();
    document.getElementById("prPlanName").focus();
  }

  function openResourceModal(row) {
    const modal = ensureModal();
    modal.dataset.mode = "resource";
    document.getElementById("prV2ModalTitle").textContent = row ? "撮影スペースを編集" : "撮影スペースを追加";
    document.getElementById("prV2ModalSub").textContent = "スタジオ・撮影ブースなどの情報を設定します。";
    document.getElementById("prV2ModalBody").innerHTML = resourceForm(row);
    modal.hidden = false;
    document.getElementById("prV2Save").onclick = saveResource;
    document.getElementById("prResourceName").focus();
  }

  function planPayload(current) {
    const mode = document.getElementById("prPlanStartMode").value;
    const fixed = document.getElementById("prPlanFixedTimes").value
      .split(/[、,]/).map((x) => x.trim()).filter(Boolean);
    return {
      ...(current?.id ? { id: current.id } : {}),
      plan_name: document.getElementById("prPlanName").value.trim(),
      category_id: document.getElementById("prPlanCategory").value,
      default_resource_id: document.getElementById("prPlanResource").value,
      duration_minutes: Number(document.getElementById("prPlanDuration").value),
      base_price: Number(document.getElementById("prPlanPrice").value || 0),
      price_label: document.getElementById("prPlanPriceLabel").value.trim() || null,
      booking_lead_days: Number(document.getElementById("prPlanLead").value),
      booking_open_days: Number(document.getElementById("prPlanOpenDays").value),
      max_participants: Number(document.getElementById("prPlanMax").value),
      display_order: Number(document.getElementById("prPlanOrder").value),
      available_weekdays: [...document.querySelectorAll(".prPlanWeekday:checked")].map((x) => Number(x.value)),
      booking_start_mode: mode,
      booking_start_interval_minutes: 30,
      booking_start_anchor_time: "00:00",
      booking_start_times: mode === "fixed_times" ? fixed : [],
      description: document.getElementById("prPlanDesc").value.trim() || null,
      belongings_guide: document.getElementById("prPlanBelongings").value.trim() || null,
      internal_note: document.getElementById("prPlanNote").value.trim() || null,
      is_active: current ? current.is_active !== false : true,
    };
  }

  async function savePlan() {
    const id = document.getElementById("prPlanId").value.trim();
    const current = data.plans.find((x) => x.id === id);
    const message = document.getElementById("prV2ModalMessage");
    const button = document.getElementById("prV2Save");
    const body = planPayload(current);
    if (!body.plan_name) { message.textContent = "プラン名を入力してください。"; return; }
    if (!body.available_weekdays.length) { message.textContent = "受付曜日を1日以上選択してください。"; return; }
    if (body.booking_start_mode === "fixed_times" && !body.booking_start_times.length) {
      message.textContent = "指定開始時刻を1件以上入力してください。"; return;
    }
    button.disabled = true; button.textContent = "保存中…"; message.textContent = "保存しています…";
    try {
      await request("/api/admin/plan-resource-management/plan/save", { method: "POST", body });
      message.textContent = "✓ 保存しました。";
      await loadData(true);
      refreshLegacySettings();
      window.setTimeout(() => { document.getElementById("prV2ModalBackdrop").hidden = true; }, 400);
    } catch (error) {
      message.textContent = error?.message || "保存に失敗しました。";
    } finally {
      button.disabled = false; button.textContent = "保存";
    }
  }

  async function saveResource() {
    const id = document.getElementById("prResourceId").value.trim();
    const current = data.resources.find((x) => x.id === id);
    const message = document.getElementById("prV2ModalMessage");
    const button = document.getElementById("prV2Save");
    const body = {
      ...(current?.id ? { id: current.id } : {}),
      resource_name: document.getElementById("prResourceName").value.trim(),
      resource_type: document.getElementById("prResourceType").value,
      capacity: Number(document.getElementById("prResourceCapacity").value),
      display_order: Number(document.getElementById("prResourceOrder").value),
      description: document.getElementById("prResourceDesc").value.trim() || null,
      is_active: current ? current.is_active !== false : true,
    };
    if (!body.resource_name) { message.textContent = "撮影スペース名を入力してください。"; return; }
    button.disabled = true; button.textContent = "保存中…"; message.textContent = "保存しています…";
    try {
      await request("/api/admin/plan-resource-management/resource/save", { method: "POST", body });
      message.textContent = "✓ 保存しました。";
      await loadData(true);
      refreshLegacySettings();
      window.setTimeout(() => { document.getElementById("prV2ModalBackdrop").hidden = true; }, 400);
    } catch (error) {
      message.textContent = error?.message || "保存に失敗しました。";
    } finally {
      button.disabled = false; button.textContent = "保存";
    }
  }

  async function togglePlan(row, nextActive) {
    if (!nextActive && !window.confirm(`${row.plan_name}を停止しますか？\n\n新規予約画面から外れますが、過去・既存の予約履歴は残ります。`)) return;
    setStatus(`${row.plan_name}を${nextActive ? "再開" : "停止"}しています…`);
    try {
      await request("/api/admin/plan-resource-management/plan/save", {
        method: "POST",
        body: {
          id: row.id, plan_name: row.plan_name, category_id: row.category_id,
          default_resource_id: row.default_resource_id, duration_minutes: Number(row.duration_minutes),
          base_price: Number(row.base_price || 0), price_label: row.price_label || null,
          booking_lead_days: Number(row.booking_lead_days), booking_open_days: Number(row.booking_open_days),
          max_participants: Number(row.max_participants), available_weekdays: row.available_weekdays,
          display_order: Number(row.display_order), description: row.description || null,
          belongings_guide: row.belongings_guide || null, internal_note: row.internal_note || null,
          booking_start_mode: row.start_rule?.mode || "interval",
          booking_start_interval_minutes: Number(row.start_rule?.interval_minutes || 30),
          booking_start_anchor_time: row.start_rule?.anchor_time || "00:00",
          booking_start_times: Array.isArray(row.start_rule?.fixed_times) ? row.start_rule.fixed_times : [],
          is_active: nextActive,
        },
      });
      await loadData(true); refreshLegacySettings();
    } catch (error) {
      setStatus(error?.message || "処理に失敗しました。", true);
    }
  }

  async function toggleResource(row, nextActive) {
    if (!nextActive && !window.confirm(`${row.resource_name}を停止しますか？\n\n公開中プランで使用中の場合は安全のため停止できません。`)) return;
    setStatus(`${row.resource_name}を${nextActive ? "再開" : "停止"}しています…`);
    try {
      await request("/api/admin/plan-resource-management/resource/save", {
        method: "POST",
        body: {
          id: row.id, resource_name: row.resource_name, resource_type: row.resource_type,
          capacity: Number(row.capacity), display_order: Number(row.display_order),
          description: row.description || null, is_active: nextActive,
        },
      });
      await loadData(true); refreshLegacySettings();
    } catch (error) {
      const detailPlans = Array.isArray(error?.detail?.plans) ? `\n使用中：${error.detail.plans.join("、")}` : "";
      setStatus(`${error?.message || "処理に失敗しました。"}${detailPlans}`, true);
    }
  }

  function onPlanClick(event) {
    const e = event.target.closest("[data-pr-plan-edit]");
    if (e) { const row=data.plans.find((x)=>x.id===e.dataset.prPlanEdit); if(row) openPlanModal(row); return; }
    const s = event.target.closest("[data-pr-plan-stop]");
    if (s) { const row=data.plans.find((x)=>x.id===s.dataset.prPlanStop); if(row) togglePlan(row,false); return; }
    const r = event.target.closest("[data-pr-plan-resume]");
    if (r) { const row=data.plans.find((x)=>x.id===r.dataset.prPlanResume); if(row) togglePlan(row,true); }
  }

  function onResourceClick(event) {
    const e = event.target.closest("[data-pr-resource-edit]");
    if (e) { const row=data.resources.find((x)=>x.id===e.dataset.prResourceEdit); if(row) openResourceModal(row); return; }
    const s = event.target.closest("[data-pr-resource-stop]");
    if (s) { const row=data.resources.find((x)=>x.id===s.dataset.prResourceStop); if(row) toggleResource(row,false); return; }
    const r = event.target.closest("[data-pr-resource-resume]");
    if (r) { const row=data.resources.find((x)=>x.id===r.dataset.prResourceResume); if(row) toggleResource(row,true); }
  }

  function refreshLegacySettings() {
    const btn = document.getElementById("settingsReloadBtn");
    if (btn) window.setTimeout(() => btn.click(), 100);
  }

  function attachNav() {
    document.addEventListener("click", (event) => {
      const btn = event.target.closest('[data-settings-group="plans"]');
      if (btn) window.setTimeout(() => loadData(false), 0);
    });
  }

  function init(attempt = 0) {
    injectStyle();
    if (!settingsContent()) {
      if (attempt < 30) window.setTimeout(() => init(attempt + 1), 100);
      return;
    }
    hideLegacyPanel();
    ensurePanel();
    ensureModal();
    attachNav();
    window.addEventListener("dpro:photo-settings-rendered", () => {
      window.setTimeout(() => {
        hideLegacyPanel();
        ensurePanel();
        loadData(true);
      }, 0);
    });
    window.addEventListener("dpro-studio:admin-code-changed", () => window.setTimeout(() => loadData(true), 0));
    if (token()) loadData(false);
  }

  init();
})();