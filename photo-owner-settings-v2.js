(() => {
  "use strict";

  const C = window.DPRO_STUDIO || window.DPRO_PHOTO_STUDIO_CONFIG;
  const VERSION = "DPRO-PHOTO-OWNER-OPERATIONS-BRUSHUP-10-HOTFIX2-V21-20260922";
  if (!C || !document.getElementById("view-settings")) return;

  const view = document.getElementById("view-settings");
  const esc = (v) => C.escapeHtml(v ?? "");
  const token = () => String(C.getSessionToken("owner") || "").trim();

  const GROUPS = [
    { id: "basic", label: "かんたん設定", note: "初回", desc: "店舗情報・営業時間" },
    { id: "reservation", label: "予約設定", note: "日常", desc: "受付条件・予約ルール" },
    { id: "staff", label: "スタッフ管理", note: "日常", desc: "追加・編集・停止" },
    { id: "plans", label: "撮影プラン管理", note: "日常", desc: "撮影スペース・プラン" },
    { id: "public", label: "公開・連携設定", note: "必要時", desc: "HP・ブランド・LINE予約" },
    { id: "crm", label: "顧客・CRM設定", note: "必要時", desc: "フォロー・CSV・LINE" },
    { id: "advanced", label: "詳細設定", note: "詳細", desc: "文面・その他" },
  ];

  const ROLE_LABELS = {
    owner: "オーナー",
    manager: "店長・管理者",
    photographer: "カメラマン",
    reception: "受付",
    assistant: "アシスタント",
  };

  let activeGroup = "basic";
  let staffRows = [];
  let loadingStaff = false;

  function injectStyle() {
    if (document.getElementById("photoOwnerSettingsV2Style")) return;
    const style = document.createElement("style");
    style.id = "photoOwnerSettingsV2Style";
    style.textContent = `
      .settings-v2-workspace{display:grid;grid-template-columns:220px minmax(0,1fr);gap:16px;align-items:start}
      .settings-v2-nav{position:sticky;top:14px;border:1px solid var(--line,#dfe7e5);background:#fff;border-radius:16px;padding:12px;box-shadow:0 8px 24px rgba(18,58,53,.05)}
      .settings-v2-nav h3{margin:0 0 4px;font-size:15px}
      .settings-v2-nav p{margin:0 0 10px;color:var(--muted,#647b78);font-size:12px;line-height:1.5}
      .settings-v2-nav-list{display:grid;gap:6px}
      .settings-v2-nav-btn{width:100%;text-align:left;border:1px solid transparent;background:transparent;border-radius:10px;padding:10px 11px;cursor:pointer;color:inherit}
      .settings-v2-nav-btn:hover{background:#f2f8f6}
      .settings-v2-nav-btn.active{background:#e8f5f1;border-color:#b9dcd3;color:#0f5f54}
      .settings-v2-nav-btn strong{display:flex;align-items:center;gap:6px;font-size:13px}
      .settings-v2-nav-btn small{display:block;margin-top:2px;color:var(--muted,#647b78);font-size:10px}
      .settings-v2-note{display:inline-flex;padding:1px 6px;border-radius:999px;background:#fff;border:1px solid #b9dcd3;font-size:9px;font-weight:800}
      .settings-v2-content{min-width:0}
      .settings-v2-content>.panel{margin-top:0;margin-bottom:14px}
      .staff-v2-toolbar{display:flex;gap:8px;flex-wrap:wrap;justify-content:space-between;align-items:center}
      .staff-v2-status{font-size:12px;color:var(--muted,#647b78)}
      .staff-v2-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
      .staff-v2-card{border:1px solid var(--line,#dfe7e5);border-radius:12px;padding:13px;background:#fff}
      .staff-v2-card.is-stopped{background:#f7f8f8;opacity:.78}
      .staff-v2-card-head{display:flex;gap:10px;justify-content:space-between;align-items:flex-start}
      .staff-v2-card h4{margin:0;font-size:15px}
      .staff-v2-meta{margin-top:5px;color:var(--muted,#647b78);font-size:11px;line-height:1.55}
      .staff-v2-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
      .staff-v2-tag{display:inline-flex;border-radius:999px;padding:3px 7px;background:#edf6f3;font-size:10px}
      .staff-v2-tag.stop{background:#f7ecec;color:#9a3f3f}
      .staff-v2-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
      .staff-v2-empty{padding:18px;border:1px dashed var(--line,#dfe7e5);border-radius:12px;color:var(--muted,#647b78);text-align:center}
      .staff-v2-modal-backdrop{position:fixed;inset:0;background:rgba(10,30,27,.45);display:flex;align-items:center;justify-content:center;padding:18px;z-index:9999}
      .staff-v2-modal{width:min(720px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.2)}
      .staff-v2-modal-head,.staff-v2-modal-foot{display:flex;gap:10px;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid var(--line,#dfe7e5)}
      .staff-v2-modal-foot{border-top:1px solid var(--line,#dfe7e5);border-bottom:0;justify-content:flex-end}
      .staff-v2-modal-body{padding:18px}
      .staff-v2-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .staff-v2-form .wide{grid-column:1/-1}
      .staff-v2-help{font-size:11px;color:var(--muted,#647b78);margin-top:5px}
      @media(max-width:900px){
        .settings-v2-workspace{grid-template-columns:1fr}
        .settings-v2-nav{position:static;overflow:hidden}
        .settings-v2-nav-list{display:flex;overflow-x:auto;padding-bottom:3px}
        .settings-v2-nav-btn{min-width:145px}
      }
      @media(max-width:620px){
        .staff-v2-grid,.staff-v2-form{grid-template-columns:1fr}
        .staff-v2-form .wide{grid-column:auto}
      }
    `;
    document.head.appendChild(style);
  }

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
      throw error;
    }
    return payload;
  }

  function panelHeading(panel) {
    return String(panel.querySelector("h3")?.textContent || "").trim();
  }

  function classifyPanel(panel) {
    if (panel.id === "ownerStaffManagementPanel") return "staff";
    const h = panelHeading(panel);
    if (/店舗基本情報|営業時間/.test(h)) return "basic";
    if (/予約受付設定/.test(h)) return "reservation";
    if (/スタッフ・撮影スペース・プラン|撮影スペース・プラン/.test(h)) return "plans";
    if (/予約画面・既存ホームページ連携/.test(h)) return "public";
    if (/顧客フォロー機能|顧客・CRM機能|CSVデータ移行|LINE友だち・既存顧客/.test(h)) return "crm";
    if (/文面テンプレート/.test(h)) return "advanced";
    return "advanced";
  }

  function cleanupLegacyCatalogPanel(panel) {
    if (!/スタッフ・撮影スペース・プラン/.test(panelHeading(panel))) return;
    const staffCatalog = panel.querySelector("#staffCatalog");
    if (staffCatalog) {
      staffCatalog.hidden = true;
      const title = [...panel.querySelectorAll("h4")].find((x) => x.textContent.trim() === "スタッフ");
      if (title) title.hidden = true;
      const divider = staffCatalog.nextElementSibling;
      if (divider?.classList.contains("section-divider")) divider.hidden = true;
    }
    const h3 = panel.querySelector("h3");
    const p = panel.querySelector(".panel-head p");
    if (h3) h3.textContent = "撮影スペース・プラン";
    if (p) p.textContent = "撮影スペースと撮影プランを確認します。";
  }

  function ensureWorkspace() {
    let workspace = document.getElementById("settingsV2Workspace");
    if (workspace) return workspace;

    const pageHead = view.querySelector(".page-head");
    workspace = document.createElement("div");
    workspace.id = "settingsV2Workspace";
    workspace.className = "settings-v2-workspace";
    workspace.innerHTML = `
      <aside class="settings-v2-nav">
        <h3>設定メニュー</h3>
        <p>初回・日常・必要時の設定を分けています。</p>
        <div id="settingsV2NavList" class="settings-v2-nav-list"></div>
      </aside>
      <div id="settingsV2Content" class="settings-v2-content"></div>
    `;
    pageHead.insertAdjacentElement("afterend", workspace);

    const intro = pageHead.querySelector("p");
    if (intro) intro.textContent = "初回設定・日常運用・必要時の連携を分け、必要な項目だけ表示します。";

    const navList = workspace.querySelector("#settingsV2NavList");
    navList.innerHTML = GROUPS.map((g) => `
      <button type="button" class="settings-v2-nav-btn" data-settings-group="${g.id}">
        <strong>${esc(g.label)}${g.note ? `<span class="settings-v2-note">${esc(g.note)}</span>` : ""}</strong>
        <small>${esc(g.desc)}</small>
      </button>
    `).join("");

    navList.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-settings-group]");
      if (btn) setGroup(btn.dataset.settingsGroup, true);
    });

    return workspace;
  }

  function ensureStaffPanel() {
    let panel = document.getElementById("ownerStaffManagementPanel");
    if (panel) return panel;

    panel = document.createElement("section");
    panel.id = "ownerStaffManagementPanel";
    panel.className = "panel";
    panel.dataset.settingsGroup = "staff";
    panel.innerHTML = `
      <div class="panel-head">
        <div>
          <h3>スタッフ管理</h3>
          <p>スタッフの追加・編集・予約担当設定・退職停止を管理します。過去の予約履歴を守るため削除はしません。</p>
        </div>
        <div class="page-actions">
          <button id="staffV2ReloadBtn" class="btn btn-secondary btn-small" type="button">再読込</button>
          <button id="staffV2AddBtn" class="btn btn-primary btn-small" type="button">＋ スタッフを追加</button>
        </div>
      </div>
      <div class="staff-v2-toolbar">
        <div id="staffV2Summary" class="staff-v2-status">スタッフ情報を読み込んでいます…</div>
        <div class="staff-v2-status">退職時は「停止」にすると過去履歴を残したまま予約候補・ログイン対象から外れます。</div>
      </div>
      <div id="staffV2Grid" class="staff-v2-grid"></div>
    `;

    document.getElementById("settingsV2Content").prepend(panel);
    panel.querySelector("#staffV2AddBtn").addEventListener("click", () => openStaffModal(null));
    panel.querySelector("#staffV2ReloadBtn").addEventListener("click", () => loadStaff(true));
    panel.querySelector("#staffV2Grid").addEventListener("click", onStaffGridClick);
    return panel;
  }

  function syncPanels() {
    const workspace = ensureWorkspace();
    const content = workspace.querySelector("#settingsV2Content");

    [...view.querySelectorAll(":scope > section.panel")].forEach((panel) => content.appendChild(panel));
    ensureStaffPanel();

    [...content.querySelectorAll(":scope > section.panel")].forEach((panel) => {
      cleanupLegacyCatalogPanel(panel);
      panel.dataset.settingsGroup = panel.dataset.settingsGroup || classifyPanel(panel);
    });

    setGroup(activeGroup, false);
  }

  function setGroup(groupId, shouldScroll = false) {
    if (!GROUPS.some((g) => g.id === groupId)) groupId = "basic";
    activeGroup = groupId;

    document.querySelectorAll("[data-settings-group]").forEach((btn) => {
      if (btn.classList.contains("settings-v2-nav-btn")) {
        btn.classList.toggle("active", btn.dataset.settingsGroup === groupId);
      }
    });

    const content = document.getElementById("settingsV2Content");
    if (content) {
      [...content.querySelectorAll(":scope > section.panel")].forEach((panel) => {
        panel.hidden = panel.dataset.settingsGroup !== groupId;
      });
    }

    const legacySave = document.getElementById("settingsSaveBtn");
    if (legacySave) legacySave.hidden = ["staff", "plans", "public"].includes(groupId);

    if (shouldScroll) {
      document.getElementById("settingsV2Workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (groupId === "staff") loadStaff(false);
  }

  function ensureStaffModal() {
    let modal = document.getElementById("staffV2ModalBackdrop");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "staffV2ModalBackdrop";
    modal.className = "staff-v2-modal-backdrop";
    modal.hidden = true;
    modal.innerHTML = `
      <section class="staff-v2-modal" role="dialog" aria-modal="true" aria-labelledby="staffV2ModalTitle">
        <header class="staff-v2-modal-head">
          <div>
            <h3 id="staffV2ModalTitle" style="margin:0;">スタッフを追加</h3>
            <p id="staffV2ModalSub" style="margin:4px 0 0;color:var(--muted,#647b78);font-size:12px;">店舗で働くスタッフを登録します。</p>
          </div>
          <button id="staffV2CloseTop" class="btn btn-neutral btn-small" type="button">閉じる</button>
        </header>
        <div class="staff-v2-modal-body">
          <input id="staffV2Id" type="hidden" />
          <div class="staff-v2-form">
            <div class="field">
              <label for="staffV2Name">スタッフ名</label>
              <input id="staffV2Name" class="input" type="text" maxlength="80" placeholder="例：田中カメラマン" />
            </div>
            <div class="field">
              <label for="staffV2Role">役割</label>
              <select id="staffV2Role">
                <option value="photographer">カメラマン</option>
                <option value="manager">店長・管理者</option>
                <option value="reception">受付</option>
                <option value="assistant">アシスタント</option>
                <option value="owner">オーナー</option>
              </select>
            </div>
            <div class="field">
              <label for="staffV2Phone">電話番号</label>
              <input id="staffV2Phone" class="input" type="tel" />
            </div>
            <div class="field">
              <label for="staffV2Email">メール</label>
              <input id="staffV2Email" class="input" type="email" />
            </div>
            <div class="field wide">
              <label><input id="staffV2Assignable" type="checkbox" checked /> 予約の担当スタッフとして選択できる</label>
              <div class="staff-v2-help">受付スタッフなど、撮影予約の担当にしない場合はOFFにします。</div>
            </div>
            <div class="field wide">
              <label for="staffV2Specialties">得意分野</label>
              <input id="staffV2Specialties" class="input" type="text" placeholder="例：七五三, 家族写真, プロフィール" />
              <div class="staff-v2-help">カンマ区切りで入力します。</div>
            </div>
            <div class="field wide">
              <label for="staffV2Note">プロフィール・社内メモ</label>
              <textarea id="staffV2Note" maxlength="500"></textarea>
            </div>
            <div class="field">
              <label for="staffV2Order">表示順</label>
              <input id="staffV2Order" class="input" type="number" min="0" max="9999" value="100" />
            </div>
          </div>
          <div id="staffV2ModalMessage" class="auth-note" style="margin-top:12px;"></div>
        </div>
        <footer class="staff-v2-modal-foot">
          <button id="staffV2CloseBottom" class="btn btn-neutral" type="button">キャンセル</button>
          <button id="staffV2SaveBtn" class="btn btn-primary" type="button">保存</button>
        </footer>
      </section>
    `;
    document.body.appendChild(modal);

    const close = () => { modal.hidden = true; };
    modal.querySelector("#staffV2CloseTop").addEventListener("click", close);
    modal.querySelector("#staffV2CloseBottom").addEventListener("click", close);
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
    modal.querySelector("#staffV2SaveBtn").addEventListener("click", () => saveStaffFromModal());
    return modal;
  }

  function openStaffModal(row) {
    const modal = ensureStaffModal();
    const isEdit = Boolean(row?.id);

    document.getElementById("staffV2ModalTitle").textContent = isEdit ? "スタッフを編集" : "スタッフを追加";
    document.getElementById("staffV2ModalSub").textContent = isEdit
      ? "スタッフ情報を変更します。退職・休職は一覧の「停止」を使用してください。"
      : "新しいスタッフを登録します。";

    document.getElementById("staffV2Id").value = row?.id || "";
    document.getElementById("staffV2Name").value = row?.staff_name || "";
    document.getElementById("staffV2Role").value = row?.role || "photographer";
    document.getElementById("staffV2Phone").value = row?.phone || "";
    document.getElementById("staffV2Email").value = row?.email || "";
    document.getElementById("staffV2Assignable").checked = row ? row.can_be_assigned !== false : true;
    document.getElementById("staffV2Specialties").value = Array.isArray(row?.specialties) ? row.specialties.join(", ") : "";
    document.getElementById("staffV2Note").value = row?.profile_note || "";
    document.getElementById("staffV2Order").value = Number(row?.display_order ?? 100);
    document.getElementById("staffV2ModalMessage").textContent = "";
    modal.hidden = false;
    document.getElementById("staffV2Name").focus();
  }

  function modalPayload() {
    const id = document.getElementById("staffV2Id").value.trim();
    const current = staffRows.find((x) => x.id === id);
    const specialties = document.getElementById("staffV2Specialties").value
      .split(/[、,]/)
      .map((x) => x.trim())
      .filter(Boolean);

    return {
      ...(id ? { id } : {}),
      staff_name: document.getElementById("staffV2Name").value.trim(),
      role: document.getElementById("staffV2Role").value,
      phone: document.getElementById("staffV2Phone").value.trim() || null,
      email: document.getElementById("staffV2Email").value.trim() || null,
      can_be_assigned: document.getElementById("staffV2Assignable").checked,
      specialties,
      profile_note: document.getElementById("staffV2Note").value.trim() || null,
      display_order: Number(document.getElementById("staffV2Order").value || 100),
      is_active: current ? current.is_active !== false : true,
    };
  }

  async function saveStaffFromModal() {
    const button = document.getElementById("staffV2SaveBtn");
    const message = document.getElementById("staffV2ModalMessage");
    const payload = modalPayload();

    if (!payload.staff_name) {
      message.textContent = "スタッフ名を入力してください。";
      return;
    }

    button.disabled = true;
    button.textContent = "保存中…";
    message.textContent = "保存しています…";

    try {
      await request("/api/admin/staff-management/save", { method: "POST", body: payload });
      message.textContent = "✓ 保存しました。";
      await loadStaff(true);
      window.setTimeout(() => {
        document.getElementById("staffV2ModalBackdrop").hidden = true;
      }, 450);
      refreshLegacySettings();
    } catch (error) {
      message.textContent = error?.message || "保存に失敗しました。";
    } finally {
      button.disabled = false;
      button.textContent = "保存";
    }
  }

  async function toggleStaff(row, nextActive) {
    const action = nextActive ? "再開" : "停止";
    if (!nextActive) {
      const ok = window.confirm(`${row.staff_name}を停止しますか？\n\n過去の予約履歴は残りますが、今後の予約担当候補とスタッフログインから外れます。`);
      if (!ok) return;
    }

    setStaffSummary(`${row.staff_name}を${action}しています…`);
    try {
      await request("/api/admin/staff-management/save", {
        method: "POST",
        body: {
          id: row.id,
          staff_name: row.staff_name,
          role: row.role,
          phone: row.phone || null,
          email: row.email || null,
          can_be_assigned: row.can_be_assigned !== false,
          specialties: Array.isArray(row.specialties) ? row.specialties : [],
          profile_note: row.profile_note || null,
          display_order: Number(row.display_order || 100),
          is_active: nextActive,
        },
      });
      await loadStaff(true);
      refreshLegacySettings();
    } catch (error) {
      setStaffSummary(error?.message || `${action}に失敗しました。`, true);
    }
  }

  function onStaffGridClick(event) {
    const edit = event.target.closest("[data-staff-edit]");
    if (edit) {
      const row = staffRows.find((x) => x.id === edit.dataset.staffEdit);
      if (row) openStaffModal(row);
      return;
    }
    const stop = event.target.closest("[data-staff-stop]");
    if (stop) {
      const row = staffRows.find((x) => x.id === stop.dataset.staffStop);
      if (row) toggleStaff(row, false);
      return;
    }
    const resume = event.target.closest("[data-staff-resume]");
    if (resume) {
      const row = staffRows.find((x) => x.id === resume.dataset.staffResume);
      if (row) toggleStaff(row, true);
    }
  }

  function setStaffSummary(message, error = false) {
    const el = document.getElementById("staffV2Summary");
    if (!el) return;
    el.textContent = message;
    el.style.color = error ? "#b64040" : "";
  }

  function renderStaff() {
    const grid = document.getElementById("staffV2Grid");
    if (!grid) return;

    const active = staffRows.filter((x) => x.is_active !== false);
    const assignable = active.filter((x) => x.can_be_assigned !== false);
    setStaffSummary(`登録 ${staffRows.length}名｜在籍 ${active.length}名｜予約担当 ${assignable.length}名`);

    if (!staffRows.length) {
      grid.innerHTML = '<div class="staff-v2-empty">スタッフが登録されていません。「＋ スタッフを追加」から登録してください。</div>';
      return;
    }

    grid.innerHTML = staffRows.map((row) => {
      const stopped = row.is_active === false;
      const specialties = Array.isArray(row.specialties) ? row.specialties : [];
      return `
        <article class="staff-v2-card ${stopped ? "is-stopped" : ""}">
          <div class="staff-v2-card-head">
            <div>
              <h4>${esc(row.staff_name)}</h4>
              <div class="staff-v2-meta">
                ${esc(ROLE_LABELS[row.role] || row.role || "スタッフ")}｜${row.can_be_assigned ? "予約担当可" : "予約担当外"}
                ${row.email ? `<br>${esc(row.email)}` : ""}
                ${row.phone ? `<br>${esc(row.phone)}` : ""}
              </div>
            </div>
            <span class="staff-v2-tag ${stopped ? "stop" : ""}">${stopped ? "停止中" : "在籍中"}</span>
          </div>
          ${specialties.length ? `<div class="staff-v2-tags">${specialties.map((x) => `<span class="staff-v2-tag">${esc(x)}</span>`).join("")}</div>` : ""}
          ${row.profile_note ? `<div class="staff-v2-meta" style="margin-top:8px;">${esc(row.profile_note)}</div>` : ""}
          <div class="staff-v2-actions">
            <button type="button" class="btn btn-secondary btn-small" data-staff-edit="${esc(row.id)}">編集</button>
            ${stopped
              ? `<button type="button" class="btn btn-primary btn-small" data-staff-resume="${esc(row.id)}">再開</button>`
              : `<button type="button" class="btn btn-neutral btn-small" data-staff-stop="${esc(row.id)}">停止</button>`}
          </div>
        </article>
      `;
    }).join("");
  }

  async function loadStaff(force = false) {
    if (!token()) {
      setStaffSummary("管理画面の認証完了を待っています…");
      return;
    }
    if (loadingStaff && !force) return;
    loadingStaff = true;
    setStaffSummary("スタッフ情報を読み込んでいます…");

    try {
      const payload = await request("/api/admin/staff-management");
      staffRows = Array.isArray(payload.staff) ? payload.staff : [];
      renderStaff();
    } catch (error) {
      setStaffSummary(error?.message || "スタッフ情報の読込に失敗しました。", true);
    } finally {
      loadingStaff = false;
    }
  }

  function refreshLegacySettings() {
    const button = document.getElementById("settingsReloadBtn");
    if (button) window.setTimeout(() => button.click(), 80);
  }


  /* DPRO PHOTO BRUSHUP-10 / V2.1 EVERGREEN UX HARDENING */
  let v21SettingsDirty = false;
  let v21SettingsBound = false;
  let v21DependencyBound = false;

  const V21_FOLLOWUP_DEPENDENTS = Object.freeze([
    "featureLifecycleSearch",
    "featureBirthdaySearch",
    "featureReturnCycleSearch",
    "featureLineSegment",
  ]);

  const V21_FEATURE_EFFECTS = Object.freeze({
    featureCustomerFollowup: "ON：顧客フォロー画面を表示します。",
    featureSubjectHistory: "ON：撮影対象者ごとの履歴を顧客運用で利用します。",
    featureLifecycleSearch: "ON：年齢・ライフイベント検索を顧客フォロー画面で利用します。顧客フォローが必須です。",
    featureBirthdaySearch: "ON：誕生日検索を顧客フォロー画面で利用します。顧客フォローが必須です。",
    featureReturnCycleSearch: "ON：再来店時期検索を顧客フォロー画面で利用します。顧客フォローが必須です。",
    featureLineSegment: "ON：顧客フォロー画面にLINEセグメント配信を表示します。顧客フォローが必須です。本番送信はLINE契約設定が必要です。",
    featureCsvMigration: "ON：顧客・CRM設定にCSVデータ移行を表示します。",
    featureLineCustomerLink: "ON：顧客・CRM設定に既存顧客とLINE再紐付けを表示します。本人確認・最終確認を必須にします。",
  });

  function injectV21Style() {
    if (document.getElementById("photoOwnerV21EvergreenStyle")) return;
    const style = document.createElement("style");
    style.id = "photoOwnerV21EvergreenStyle";
    style.textContent = `
      .v21-save-state{margin:10px 0 0;padding:8px 10px;border:1px solid #cfded9;border-radius:10px;background:#f7faf9;color:var(--muted,#647b78);font-size:11px;line-height:1.5}
      .v21-save-state.is-dirty{border-color:#e2c078;background:#fff8e8;color:#795510;font-weight:800}
      .v21-switch-label{display:flex!important;align-items:center;gap:9px;min-height:44px;padding:5px 2px;cursor:pointer}
      .v21-switch-input{appearance:none;-webkit-appearance:none;width:42px!important;height:24px!important;min-width:42px;margin:0!important;border:1px solid #a9bbb6!important;border-radius:999px!important;background:#dfe8e5!important;position:relative;cursor:pointer;transition:.18s}
      .v21-switch-input::after{content:"";position:absolute;left:3px;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.22);transition:.18s}
      .v21-switch-input:checked{background:#0f7562!important;border-color:#0f7562!important}
      .v21-switch-input:checked::after{transform:translateX(18px)}
      .v21-switch-input:focus-visible{outline:3px solid rgba(15,117,98,.22);outline-offset:2px}
      .v21-dependency-box{margin-top:10px;padding:11px 12px;border:1px solid #cfded9;border-radius:12px;background:#f7faf9}
      .v21-dependency-box strong{display:block;font-size:12px;margin-bottom:5px}
      .v21-dependency-list{display:grid;gap:5px;color:var(--muted,#647b78);font-size:11px;line-height:1.55}
      .v21-dependency-message{margin-top:8px;padding:7px 9px;border-radius:9px;background:#eef7f4;color:#225f54;font-size:11px;font-weight:750}
      .v21-dependency-message.warn{background:#fff5e8;color:#825b11}
    `;
    document.head.appendChild(style);
  }

  function ensureV21SaveState() {
    const nav = document.querySelector("#settingsV2Workspace .settings-v2-nav");
    if (!nav) return null;
    let el = document.getElementById("settingsV2SaveState");
    if (!el) {
      el = document.createElement("div");
      el.id = "settingsV2SaveState";
      el.className = "v21-save-state";
      nav.appendChild(el);
    }
    return el;
  }

  function setV21Dirty(dirty) {
    v21SettingsDirty = Boolean(dirty);
    const el = ensureV21SaveState();
    if (!el) return;
    el.classList.toggle("is-dirty", v21SettingsDirty);
    el.textContent = v21SettingsDirty
      ? "● 未保存の変更があります。画面を移動する前に保存してください。"
      : "✓ 現在の設定は保存済みです。";
  }

  function decorateV21Switches() {
    const content = document.getElementById("settingsV2Content");
    if (!content) return;

    content.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      if (input.closest(".staff-v2-modal")) return;
      input.classList.add("v21-switch-input");
      const label = input.closest("label");
      if (label) label.classList.add("v21-switch-label");
    });
  }

  function ensureV21DependencyBox() {
    const anchor = document.getElementById("featureLineCustomerLink");
    const panel = anchor?.closest("section.panel");
    if (!panel) return null;

    let box = document.getElementById("settingsV2DependencyBox");
    if (!box) {
      box = document.createElement("div");
      box.id = "settingsV2DependencyBox";
      box.className = "v21-dependency-box";
      box.innerHTML = `
        <strong>機能の依存関係・影響</strong>
        <div class="v21-dependency-list">
          <span>・年齢/誕生日/再来店時期検索 → 「顧客フォロー」が必要</span>
          <span>・LINEセグメント配信 → 「顧客フォロー」が必要。本番送信はLINE契約設定も必要</span>
          <span>・CSV移行 → 顧客・CRM設定に安全な事前検査/本登録画面を表示</span>
          <span>・LINE再紐付け → 顧客・CRM設定に本人確認/最終確認画面を表示</span>
        </div>
        <div id="settingsV2DependencyMessage" class="v21-dependency-message">現在のON/OFFを確認しています。</div>
      `;
      const head = panel.querySelector(".panel-head");
      if (head) head.insertAdjacentElement("afterend", box);
      else panel.prepend(box);
    }
    return box;
  }

  function renderV21DependencyState(message = "") {
    ensureV21DependencyBox();
    const follow = document.getElementById("featureCustomerFollowup");
    const active = V21_FOLLOWUP_DEPENDENTS
      .map((id) => document.getElementById(id))
      .filter((x) => x?.checked);

    const el = document.getElementById("settingsV2DependencyMessage");
    if (!el) return;

    if (message) {
      el.textContent = message;
      el.classList.toggle("warn", /OFF|解除|必須/.test(message));
      return;
    }

    if (active.length && !follow?.checked) {
      el.textContent = "依存矛盾があります。顧客フォローをONにしてください。";
      el.classList.add("warn");
      return;
    }

    el.classList.remove("warn");
    el.textContent = active.length
      ? `依存関係OK｜顧客フォロー連動機能 ${active.length}件がONです。`
      : "依存関係OK｜必要な機能だけONにできます。";
  }

  function bindV21Dependencies() {
    if (v21DependencyBound) return;
    v21DependencyBound = true;

    view.addEventListener("change", (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== "checkbox") return;

      const follow = document.getElementById("featureCustomerFollowup");
      if (V21_FOLLOWUP_DEPENDENTS.includes(input.id) && input.checked && follow && !follow.checked) {
        follow.checked = true;
        setV21Dirty(true);
        renderV21DependencyState("依存する機能をONにしたため、「顧客フォロー」も自動でONにしました。");
        return;
      }

      if (input.id === "featureCustomerFollowup" && !input.checked) {
        const active = V21_FOLLOWUP_DEPENDENTS
          .map((id) => document.getElementById(id))
          .filter((x) => x?.checked);

        if (active.length) {
          const names = active.map((x) => x.closest("label")?.textContent?.trim() || x.id).join("、");
          const ok = window.confirm(
            `「顧客フォロー」をOFFにすると、次の連動機能もOFFになります。\n\n${names}\n\nOFFにしますか？`
          );
          if (!ok) {
            input.checked = true;
            renderV21DependencyState("OFFを取り消しました。連動機能はそのまま利用できます。");
            return;
          }
          active.forEach((x) => { x.checked = false; });
          renderV21DependencyState("顧客フォローと連動機能をOFFにしました。保存すると反映されます。");
          return;
        }
      }

      renderV21DependencyState();
    });
  }

  function addV21FeatureEffects() {
    Object.entries(V21_FEATURE_EFFECTS).forEach(([id, text]) => {
      const input = document.getElementById(id);
      const label = input?.closest("label");
      if (!label || label.dataset.v21Effect === "1") return;
      label.dataset.v21Effect = "1";
      label.title = text;
      const note = document.createElement("small");
      note.style.cssText = "display:block;margin-left:51px;margin-top:-2px;margin-bottom:4px;color:var(--muted,#647b78);font-size:10px;line-height:1.4";
      note.textContent = text;
      label.insertAdjacentElement("afterend", note);
    });
  }

  function bindV21DirtyTracking() {
    if (v21SettingsBound) return;
    v21SettingsBound = true;

    const content = document.getElementById("settingsV2Content");
    if (!content) return;

    const mark = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
      if (target.closest(".staff-v2-modal")) return;
      setV21Dirty(true);
    };

    content.addEventListener("input", mark);
    content.addEventListener("change", mark);

    window.addEventListener("beforeunload", (event) => {
      if (!v21SettingsDirty) return;
      event.preventDefault();
      event.returnValue = "";
    });
  }

  function hardenV21ManagementCodeInput() {
    const input = document.getElementById("adminCodeInput");
    if (!input) return;
    input.setAttribute("autocomplete", "new-password");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("data-1p-ignore", "true");
    input.setAttribute("data-lpignore", "true");
    input.setAttribute("name", "dpro_photo_owner_management_code");
  }


  let v21ReservationFetchGuardInstalled = false;
  let v21TutorialLauncherObserver = null;

  function installV21ReservationSearchLimitGuard() {
    if (v21ReservationFetchGuardInstalled) return;
    v21ReservationFetchGuardInstalled = true;

    const nativeFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = function dproPhotoV21FetchGuard(input, init) {
      let nextInput = input;
      try {
        const rawUrl = input instanceof Request ? input.url : String(input || "");
        const url = new URL(rawUrl, globalThis.location.href);

        if (url.pathname.endsWith("/api/admin/reservations")) {
          const current = Number(url.searchParams.get("limit") || "0");
          if (!Number.isFinite(current) || current < 1 || current > 100) {
            url.searchParams.set("limit", "100");
          }

          if (input instanceof Request) {
            nextInput = new Request(url.toString(), input);
          } else {
            nextInput = url.toString();
          }
        }
      } catch {
        nextInput = input;
      }
      return nativeFetch(nextInput, init);
    };
  }

  function ensureV21ReservationSearchHint() {
    const button = document.getElementById("reservationSearchBtn");
    if (!button) return;
    const panel = button.closest("section.panel");
    if (!panel || document.getElementById("reservationSearchV21Hint")) return;

    const hint = document.createElement("div");
    hint.id = "reservationSearchV21Hint";
    hint.className = "auth-note";
    hint.style.cssText = "margin-top:10px;font-size:11px;line-height:1.55;";
    hint.textContent = "予約検索は安全のため最大100件まで表示します。条件を追加して絞り込んでください。";
    panel.appendChild(hint);
  }

  function hideCompletedTutorialLauncher() {
    const sync = () => {
      try {
        const data = globalThis.DPRO_PHOTO_TUTORIAL_V11;
        const ns = data?.namespace;
        if (!ns) return;
        const state = JSON.parse(globalThis.localStorage.getItem(ns) || "null") || {};
        const launcher = document.getElementById("dproTutorialLauncher");
        if (state.completed === true && state.active !== true && launcher) {
          launcher.hidden = true;
        }
      } catch {}
    };

    sync();

    if (!v21TutorialLauncherObserver && document.body) {
      v21TutorialLauncherObserver = new MutationObserver(sync);
      v21TutorialLauncherObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  function setupV21Brushup() {
    installV21ReservationSearchLimitGuard();
    hideCompletedTutorialLauncher();
    ensureV21ReservationSearchHint();
    injectV21Style();
    ensureV21SaveState();
    decorateV21Switches();
    addV21FeatureEffects();
    ensureV21DependencyBox();
    bindV21Dependencies();
    bindV21DirtyTracking();
    hardenV21ManagementCodeInput();
    renderV21DependencyState();
  }

  function boot() {
    injectStyle();
    ensureWorkspace();
    syncPanels();
    ensureStaffModal();
    setupV21Brushup();

    window.addEventListener("dpro:photo-settings-rendered", () => {
      window.setTimeout(() => {
        syncPanels();
        setupV21Brushup();
        setV21Dirty(false);
        if (activeGroup === "staff") loadStaff(true);
      }, 0);
    });

    window.addEventListener("dpro-studio:admin-code-changed", () => {
      window.setTimeout(() => loadStaff(true), 0);
    });

    if (token()) loadStaff(false);
  }

  boot();
})();