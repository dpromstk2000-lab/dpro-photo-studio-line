(() => {
  "use strict";

  const VERSION = "DPRO-PHOTO-CRM-BRUSHUP-6-UI-HOTFIX2-20260918";
  const API_BASE = "https://cbknucemarcpbscirzyv.supabase.co/functions/v1/dpro-photo-product-ready-gateway-v6";
  const MAX_ROWS = 5000;
  const CHUNK_SIZE = 500;

  const state = {
    headers: [],
    rows: [],
    fileName: "",
    mapping: {},
    batch: null,
    analysisRows: [],
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

  const fields = [
    { key: "customer_name", label: "顧客名・保護者名", required: true, aliases: ["顧客名","保護者名","氏名","お名前","name","customer_name"] },
    { key: "customer_name_kana", label: "フリガナ", aliases: ["フリガナ","ふりがな","カナ","customer_name_kana","kana"] },
    { key: "phone", label: "電話番号", aliases: ["電話番号","電話","tel","phone","携帯番号","携帯"] },
    { key: "email", label: "メールアドレス", aliases: ["メールアドレス","メール","email","mail"] },
    { key: "address", label: "住所", aliases: ["住所","address"] },
    { key: "internal_note", label: "備考・顧客メモ", aliases: ["備考","メモ","顧客メモ","note","memo"] },
    { key: "subject_name", label: "撮影対象者名・お子さま名", aliases: ["撮影対象者名","お子さま名","子ども名","子供名","対象者名","subject_name","child_name"] },
    { key: "subject_birth_date", label: "撮影対象者の生年月日", aliases: ["生年月日","誕生日","birth_date","birthday","対象者生年月日"] },
    { key: "subject_relationship", label: "続柄", aliases: ["続柄","関係","relationship","subject_relationship"] },
    { key: "subject_gender", label: "性別", aliases: ["性別","gender","subject_gender"] },
    { key: "subject_type", label: "対象者種別", aliases: ["対象者種別","種別","subject_type","type"] },
  ];

  function normalizeHeader(s) {
    return String(s ?? "").replace(/^\uFEFF/, "").trim().toLowerCase().replace(/\s+/g, "");
  }

  function autoMap(headers) {
    const out = {};
    const normalized = headers.map((h) => ({ raw: h, n: normalizeHeader(h) }));
    fields.forEach((f) => {
      const aliases = f.aliases.map(normalizeHeader);
      const found = normalized.find((h) => aliases.includes(h.n));
      if (found) out[f.key] = found.raw;
    });
    return out;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            cell += '"';
            i++;
          } else {
            quoted = false;
          }
        } else {
          cell += ch;
        }
      } else {
        if (ch === '"') {
          quoted = true;
        } else if (ch === ",") {
          row.push(cell);
          cell = "";
        } else if (ch === "\n") {
          row.push(cell.replace(/\r$/, ""));
          rows.push(row);
          row = [];
          cell = "";
        } else {
          cell += ch;
        }
      }
    }

    if (quoted) throw new Error("CSVの引用符（\"）が閉じていません。");
    if (cell.length || row.length) {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
    }

    while (rows.length && rows[rows.length - 1].every((x) => !String(x).trim())) rows.pop();
    if (rows.length < 2) throw new Error("ヘッダー行とデータ行が必要です。");

    const headers = rows[0].map((x, i) => String(x || "").replace(/^\uFEFF/, "").trim() || `列${i + 1}`);
    const dataRows = rows.slice(1).filter((r) => r.some((x) => String(x).trim())).map((r) => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = r[i] ?? ""; });
      return obj;
    });

    if (!dataRows.length) throw new Error("CSVにデータ行がありません。");
    if (dataRows.length > MAX_ROWS) throw new Error(`1回のCSV移行は${MAX_ROWS}行までです。`);

    return { headers, rows: dataRows };
  }

  function settingsView() {
    return $("view-settings");
  }

  function statusBadge(status) {
    const map = {
      valid: ["新規登録", "green"],
      duplicate: ["既存顧客へ紐付け", "blue"],
      warning: ["注意", "amber"],
      error: ["エラー", "red"],
      imported: ["取込済み", "green"],
      skipped: ["スキップ", "gray"],
      uploading: ["読込中", "blue"],
      analyzing: ["検査中", "blue"],
      ready: ["確認待ち", "amber"],
      completed: ["完了", "green"],
      completed_with_skips: ["完了（一部スキップ）", "amber"],
      failed: ["失敗", "red"],
    };
    const [label, tone] = map[status] || [status || "-", "gray"];
    return `<span class="badge ${tone}">${esc(label)}</span>`;
  }

  function panelHtml() {
    return `
      <div class="panel-head">
        <div>
          <h3>CSVデータ移行</h3>
          <p>他社システムの顧客・撮影対象者データを、事前検査してから安全に取り込みます。</p>
        </div>
        <span class="badge blue">${esc(VERSION)}</span>
      </div>

      <div class="auth-note" style="margin:0 0 14px;">
        <strong>安全ルール：</strong>
        既存顧客の氏名・電話・メールはCSVで自動上書きしません。
        電話番号またはメールが一致する既存顧客は「紐付け候補」として扱います。
        LINEユーザーIDはこのCSV移行では取り込みません。
      </div>

      <div id="csvMigrationOffNote" class="empty" hidden>
        店舗設定の「CSVデータ移行」をONにして保存すると利用できます。
      </div>

      <div id="csvMigrationBody">
        <div class="form-grid">
          <div class="field">
            <label for="csvEncoding">文字コード</label>
            <select id="csvEncoding">
              <option value="utf-8">UTF-8</option>
              <option value="shift_jis">Shift-JIS / CP932</option>
            </select>
          </div>
          <div class="field span-2">
            <label for="csvFileInput">CSVファイル</label>
            <input id="csvFileInput" type="file" accept=".csv,text/csv" />
            <div class="field-help">最大5,000行。Excel等から出力したCSVに対応します。</div>
          </div>
          <div class="field">
            <label>&nbsp;</label>
            <button id="csvSampleBtn" class="btn btn-secondary" type="button">CSVひな形を保存</button>
          </div>
        </div>

        <div id="csvFileMeta" class="auth-note" style="margin:14px 0;" hidden></div>

        <section id="csvMappingSection" hidden>
          <div class="panel-head" style="margin-top:14px;">
            <div><h4 style="margin:0;">列の対応確認</h4><p style="margin:5px 0 0;">DPRO項目に、CSVのどの列を使うか確認してください。</p></div>
          </div>
          <div id="csvMappingGrid" class="form-grid"></div>
          <div class="page-actions" style="margin-top:12px;">
            <button id="csvPreflightBtn" class="btn btn-primary" type="button">CSVを事前検査</button>
          </div>
        </section>

        <section id="csvResultSection" hidden style="margin-top:18px;">
          <div class="panel-head">
            <div><h4 style="margin:0;">事前検査結果</h4><p style="margin:5px 0 0;">エラーが1件でもある場合は本登録できません。</p></div>
          </div>
          <div id="csvSummary" class="detail-summary"></div>
          <div id="csvResultRows" class="simple-list" style="margin-top:12px;"></div>
          <div id="csvCommitArea" class="auth-note" style="margin-top:14px;"></div>
        </section>

        <section style="margin-top:20px;">
          <div class="panel-head">
            <div><h4 style="margin:0;">最近のCSV移行</h4><p style="margin:5px 0 0;">取込日時・検査結果・登録件数を確認できます。</p></div>
            <button id="csvRecentRefreshBtn" class="btn btn-small btn-neutral" type="button">更新</button>
          </div>
          <div id="csvRecentList" class="simple-list"><div class="empty">読み込み中...</div></div>
        </section>
      </div>
    `;
  }

  function mountPanel() {
    if (state.mounted) return;
    const view = settingsView();
    if (!view) return;

    state.mounted = true;
    const panel = document.createElement("section");
    panel.id = "csvMigrationPanel";
    panel.className = "panel";
    panel.innerHTML = panelHtml();
    view.appendChild(panel);

    const flag = $("featureCsvMigration");
    if (flag) {
      flag.disabled = false;
      flag.title = "CSVデータ移行のON/OFF";
      flag.addEventListener("change", updateEnabledState);
    }

    bind();
    syncEnabledStateSoon();
    loadRecent();
  }

  function updateEnabledState() {
    const enabled = $("featureCsvMigration")?.checked === true;
    if ($("csvMigrationOffNote")) $("csvMigrationOffNote").hidden = enabled;
    if ($("csvMigrationBody")) $("csvMigrationBody").hidden = !enabled;
  }

  function syncEnabledStateSoon() {
    [0, 200, 500, 1000, 2000].forEach((delay) => {
      setTimeout(updateEnabledState, delay);
    });
  }

  async function onFileChange() {
    const file = $("csvFileInput")?.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const encoding = $("csvEncoding")?.value || "utf-8";
      const text = new TextDecoder(encoding).decode(buffer);
      const parsed = parseCsv(text);

      state.fileName = file.name;
      state.headers = parsed.headers;
      state.rows = parsed.rows;
      state.mapping = autoMap(state.headers);
      state.batch = null;
      state.analysisRows = [];

      $("csvFileMeta").hidden = false;
      $("csvFileMeta").innerHTML = `<strong>${esc(file.name)}</strong>｜${state.rows.length}行｜${state.headers.length}列`;
      renderMapping();
      $("csvMappingSection").hidden = false;
      $("csvResultSection").hidden = true;
    } catch (error) {
      alert(error.message || String(error));
      state.headers = [];
      state.rows = [];
      $("csvMappingSection").hidden = true;
      $("csvResultSection").hidden = true;
    }
  }

  function renderMapping() {
    const options = [`<option value="">使用しない</option>`]
      .concat(state.headers.map((h) => `<option value="${esc(h)}">${esc(h)}</option>`))
      .join("");

    $("csvMappingGrid").innerHTML = fields.map((f) => `
      <div class="field">
        <label for="csvMap_${esc(f.key)}">${esc(f.label)}${f.required ? " *" : ""}</label>
        <select id="csvMap_${esc(f.key)}" data-csv-map="${esc(f.key)}">${options}</select>
      </div>
    `).join("");

    fields.forEach((f) => {
      const el = $(`csvMap_${f.key}`);
      if (el && state.mapping[f.key]) el.value = state.mapping[f.key];
      el?.addEventListener("change", collectMapping);
    });
    collectMapping();
  }

  function collectMapping() {
    const m = {};
    document.querySelectorAll("[data-csv-map]").forEach((el) => {
      if (el.value) m[el.dataset.csvMap] = el.value;
    });
    state.mapping = m;
  }

  async function preflight() {
    collectMapping();
    if (!state.rows.length) return alert("CSVファイルを選択してください。");
    if (!state.mapping.customer_name) return alert("「顧客名・保護者名」の列を指定してください。");

    const btn = $("csvPreflightBtn");
    btn.disabled = true;
    btn.textContent = "事前検査しています...";

    try {
      const started = await api("/api/admin/imports/start", {
        method: "POST",
        body: {
          filename: state.fileName,
          source_name: "CSV移行",
          headers: state.headers,
          row_count: state.rows.length,
          mapping: state.mapping,
        },
      });
      state.batch = started.batch;

      for (let i = 0; i < state.rows.length; i += CHUNK_SIZE) {
        const chunk = state.rows.slice(i, i + CHUNK_SIZE).map((data, j) => ({
          row_no: i + j + 1,
          data,
        }));
        btn.textContent = `アップロード中 ${Math.min(i + chunk.length, state.rows.length)}/${state.rows.length}`;
        await api("/api/admin/imports/chunk", {
          method: "POST",
          body: { batch_id: state.batch.id, rows: chunk },
        });
      }

      btn.textContent = "重複・入力内容を検査しています...";
      const analyzed = await api("/api/admin/imports/analyze", {
        method: "POST",
        body: { batch_id: state.batch.id },
      });
      state.batch = analyzed.batch;

      const detail = await api(`/api/admin/imports/rows?batch_id=${encodeURIComponent(state.batch.id)}&limit=500`);
      state.analysisRows = detail.rows || [];

      renderAnalysis();
      await loadRecent();
    } catch (error) {
      alert(error.message || String(error));
    } finally {
      btn.disabled = false;
      btn.textContent = "CSVを事前検査";
    }
  }

  function renderAnalysis() {
    const b = state.batch;
    if (!b) return;

    $("csvResultSection").hidden = false;
    $("csvSummary").innerHTML = `
      <div class="detail-box"><span>CSV行数</span><strong>${b.declared_row_count}件</strong></div>
      <div class="detail-box"><span>新規登録候補</span><strong>${b.valid_count}件</strong></div>
      <div class="detail-box"><span>既存顧客紐付け</span><strong>${b.duplicate_count}件</strong></div>
      <div class="detail-box"><span>注意</span><strong>${b.warning_count}件</strong></div>
      <div class="detail-box"><span>エラー</span><strong>${b.error_count}件</strong></div>
    `;

    $("csvResultRows").innerHTML = state.analysisRows.length
      ? state.analysisRows.slice(0, 200).map((r) => {
          const d = r.normalized_data || {};
          const msgs = (r.validation_messages || []).map((m) => m.message).filter(Boolean);
          return `<article class="simple-item" style="padding:10px 12px;display:grid;grid-template-columns:70px 1fr auto;gap:10px;align-items:start;">
            <div><strong>${r.row_no}行</strong></div>
            <div>
              <strong>${esc(d.customer_name || "顧客名なし")}</strong>
              <div class="item-meta">${esc(d.phone || d.email || "連絡先なし")}｜対象者：${esc(d.subject_name || "なし")}</div>
              ${msgs.length ? `<div class="item-meta" style="margin-top:4px;">${msgs.map(esc).join(" / ")}</div>` : ""}
            </div>
            <div>${statusBadge(r.validation_status)}</div>
          </article>`;
        }).join("")
      : '<div class="empty">検査結果がありません。</div>';

    if (Number(b.error_count) > 0) {
      $("csvCommitArea").innerHTML = `
        <strong>本登録できません。</strong>
        エラー行をCSVで修正し、ファイルを選び直して再度「CSVを事前検査」してください。
      `;
    } else {
      $("csvCommitArea").innerHTML = `
        <label style="display:block;">
          <input id="csvFinalConfirm" type="checkbox" />
          ${b.declared_row_count}件の検査結果を確認しました。
          既存顧客は上書きせず、重複候補${b.duplicate_count}件は既存顧客へ紐付けます。
        </label>
        <div class="page-actions" style="margin-top:10px;">
          <button id="csvCommitBtn" class="btn btn-primary" type="button">この内容で本登録</button>
        </div>
      `;
      $("csvCommitBtn")?.addEventListener("click", commitImport);
    }
  }

  async function commitImport() {
    if (!state.batch) return;
    if (!$("csvFinalConfirm")?.checked) return alert("最終確認のチェックを入れてください。");

    const b = state.batch;
    if (!window.confirm(`${b.declared_row_count}件のCSV移行を本登録します。既存顧客は上書きしません。よろしいですか？`)) return;

    const btn = $("csvCommitBtn");
    btn.disabled = true;
    btn.textContent = "登録しています...";

    try {
      const result = await api("/api/admin/imports/commit", {
        method: "POST",
        body: {
          batch_id: b.id,
          confirm: true,
          confirm_row_count: b.declared_row_count,
          confirm_duplicate_count: b.duplicate_count,
          confirm_error_count: b.error_count,
        },
      });
      state.batch = result.batch;
      const r = result.result || {};
      $("csvCommitArea").innerHTML = `
        <strong>CSV移行が完了しました。</strong><br />
        新規顧客 ${r.new_customers || 0}件／既存顧客へ紐付け ${r.linked_customers || 0}件／
        撮影対象者追加 ${r.new_subjects || 0}件／スキップ ${r.skipped || 0}件
      `;
      await loadRecent();
      window.DPRO_PHOTO_SEGMENT?.refresh?.();
      $("refreshAllBtn")?.click();
    } catch (error) {
      alert(error.message || String(error));
      btn.disabled = false;
      btn.textContent = "この内容で本登録";
    }
  }

  async function loadRecent() {
    if (!$("csvRecentList")) return;
    try {
      const result = await api("/api/admin/imports/recent?limit=10");
      const rows = result.batches || [];
      $("csvRecentList").innerHTML = rows.length
        ? rows.map((b) => `<article class="simple-item" style="padding:10px 12px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;">
            <div>
              <strong>${esc(b.original_filename || b.import_no)}</strong>
              <div class="item-meta">
                ${esc(b.import_no)}｜${b.declared_row_count}行｜
                新規 ${b.imported_customer_count || 0}｜既存紐付け ${b.linked_customer_count || 0}｜
                対象者 ${b.imported_subject_count || 0}
              </div>
            </div>
            <div>${statusBadge(b.status)}</div>
          </article>`).join("")
        : '<div class="empty">CSV移行履歴はまだありません。</div>';
    } catch (error) {
      $("csvRecentList").innerHTML = `<div class="empty">CSV移行履歴を読み込めませんでした：${esc(error.message || error)}</div>`;
    }
  }

  function downloadSample() {
    const headers = [
      "顧客名","フリガナ","電話番号","メールアドレス","住所","備考",
      "撮影対象者名","生年月日","続柄","性別","対象者種別"
    ];
    const sample = [
      "例）山田 花子","ヤマダ ハナコ","090-0000-0000","sample@example.com","福岡県○○市","他社システムから移行",
      "山田 太郎","2021-05-10","子","男","child"
    ];
    const csv = "\uFEFF" + headers.map(csvCell).join(",") + "\r\n" + sample.map(csvCell).join(",") + "\r\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "DPRO_PHOTO_CSV_IMPORT_TEMPLATE.csv";
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
  }

  function csvCell(v) {
    const s = String(v ?? "");
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function bind() {
    $("csvFileInput")?.addEventListener("change", onFileChange);
    $("csvEncoding")?.addEventListener("change", () => {
      if ($("csvFileInput")?.files?.[0]) onFileChange();
    });
    $("csvPreflightBtn")?.addEventListener("click", preflight);
    $("csvSampleBtn")?.addEventListener("click", downloadSample);
    $("csvRecentRefreshBtn")?.addEventListener("click", loadRecent);
    $("refreshAllBtn")?.addEventListener("click", () => {
      setTimeout(loadRecent, 350);
      syncEnabledStateSoon();
    });
    $("settingsReloadBtn")?.addEventListener("click", syncEnabledStateSoon);
    $("settingsSaveBtn")?.addEventListener("click", syncEnabledStateSoon);

    window.addEventListener("dpro:photo-settings-rendered", (event) => {
      const enabled = event?.detail?.csvMigration === true;
      const flag = $("featureCsvMigration");
      if (flag) {
        flag.checked = enabled;
        flag.disabled = false;
      }
      updateEnabledState();
      if (enabled) loadRecent();
    });
  }

  function boot() {
    const timer = setInterval(() => {
      if (settingsView()) {
        clearInterval(timer);
        mountPanel();
      }
    }, 200);
    setTimeout(() => clearInterval(timer), 15000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  window.DPRO_PHOTO_CSV_IMPORT = Object.freeze({
    version: VERSION,
    refresh: loadRecent,
  });
})();
