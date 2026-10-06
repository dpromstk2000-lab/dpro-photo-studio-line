(() => {
  "use strict";

  const C = window.DPRO_STUDIO || window.DPRO_PHOTO_STUDIO_CONFIG;
  if (!C || !document.getElementById("view-settings")) return;

  const API = C.CALENDAR_API_BASE_URL;
  const esc = (v) => C.escapeHtml(v ?? "");
  const token = () => String(C.getSessionToken("owner") || "").trim();
  const state = { rows: [], editingId: "", filterMonth: "" };

  function ymd(d) {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`;
  }
  function today(){ return ymd(new Date()); }
  function addDays(v,n){
    const d = new Date(`${v}T12:00:00+09:00`);
    d.setDate(d.getDate()+n);
    return ymd(d);
  }
  function hhmm(v){ return String(v||"").slice(0,5); }
  function monthKey(v){ return String(v||"").slice(0,7); }
  function jpDate(v){
    if(!v) return "";
    return new Intl.DateTimeFormat("ja-JP",{year:"numeric",month:"short",day:"numeric",weekday:"short"})
      .format(new Date(`${v}T12:00:00+09:00`));
  }
  function typeLabel(v){
    return ({closed:"臨時休業",special_open:"特別営業",event_label:"お知らせ"})[v] || v;
  }

  function addStyle(){
    if(document.getElementById("photoBusinessCalendarStyle")) return;
    const el=document.createElement("style");
    el.id="photoBusinessCalendarStyle";
    el.textContent=`
      .bc-note{margin:0 0 14px;padding:12px 14px;border:1px solid #d9e7e2;border-radius:12px;background:#f5faf8;color:#496962;font-size:12px;line-height:1.7}
      .bc-grid{display:grid;grid-template-columns:1.08fr .92fr;gap:14px}
      .bc-editor,.bc-list{border:1px solid var(--line,#dfe7e5);border-radius:14px;background:#fff;padding:14px}
      .bc-editor h4,.bc-list h4{margin:0 0 10px;font-size:15px}
      .bc-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .bc-form .wide{grid-column:1/-1}
      .bc-help{font-size:10px;color:var(--muted,#647b78);line-height:1.6}
      .bc-actions,.bc-row-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .bc-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
      .bc-months{display:flex;gap:5px;overflow:auto;padding-bottom:5px;margin-bottom:8px}
      .bc-month{border:1px solid var(--line,#dfe7e5);background:#fff;border-radius:999px;padding:6px 9px;font-size:10px;font-weight:850;white-space:nowrap;cursor:pointer}
      .bc-month.active{background:#173f39;color:#fff;border-color:#173f39}
      .bc-rows{display:grid;gap:8px;max-height:500px;overflow:auto}
      .bc-row{border:1px solid var(--line,#dfe7e5);border-radius:11px;padding:10px;background:#fbfdfc}
      .bc-row.closed{border-color:#efd1d1;background:#fff7f7}
      .bc-row.special_open{border-color:#cae0c1;background:#f8fcf4}
      .bc-row.event_label{border-color:#d6dcec;background:#f8faff}
      .bc-row-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      .bc-row strong{font-size:13px}.bc-row small{display:block;color:var(--muted,#647b78);margin-top:3px;line-height:1.5}
      .bc-tag{display:inline-flex;border-radius:999px;padding:3px 7px;font-size:10px;font-weight:850;background:#eef3f2}
      .bc-empty{padding:18px;border:1px dashed var(--line,#dfe7e5);border-radius:12px;text-align:center;color:var(--muted,#647b78);font-size:12px}
      @media(max-width:820px){.bc-grid{grid-template-columns:1fr}.bc-form{grid-template-columns:1fr}.bc-form .wide{grid-column:auto}}
    `;
    document.head.appendChild(el);
  }

  function setMessage(msg,error=false){
    const el=document.getElementById("bcMessage");
    if(!el) return;
    el.textContent=msg||"";
    el.style.color=error?"#b64040":"";
  }

  async function request(path, options={}){
    const response=await fetch(`${API}${path}`,{
      method:options.method||"GET",
      headers:{
        Accept:"application/json",
        ...(options.body?{"Content-Type":"application/json"}:{}),
        "X-Owner-Session":token()
      },
      body:options.body?JSON.stringify(options.body):undefined,
      cache:"no-store"
    });
    const payload=await response.json().catch(()=>null);
    if(!response.ok||payload?.ok===false) throw new Error(payload?.error||`HTTP ${response.status}`);
    return payload;
  }

  function syncTimeFields(){
    const show=document.getElementById("bcType")?.value==="special_open";
    document.querySelectorAll(".bc-time").forEach(el=>el.hidden=!show);
  }

  function ensurePanel(){
    addStyle();
    let panel=document.getElementById("ownerBusinessCalendarPanel");
    if(panel) return panel;

    const content=document.getElementById("settingsV2Content")||document.getElementById("view-settings");
    panel=document.createElement("section");
    panel.id="ownerBusinessCalendarPanel";
    panel.className="panel";
    panel.dataset.settingsGroup="basic";
    panel.innerHTML=`
      <div class="panel-head">
        <div><h3>営業カレンダー</h3><p>通常の定休日とは別に、1年先までの臨時休業・特別営業・お知らせを設定します。</p></div>
        <div class="page-actions"><button id="bcReload" class="btn btn-secondary btn-small" type="button">再読込</button></div>
      </div>
      <p class="bc-note">曜日ごとの営業時間・定休日は従来どおり「営業時間」で設定します。日付指定の変更だけをここへ登録すると、WEB予約カレンダーへ反映されます。</p>
      <div class="bc-grid">
        <div class="bc-editor">
          <h4 id="bcEditorTitle">日付指定を追加</h4>
          <div class="bc-form">
            <div class="field"><label for="bcDate">日付</label><input id="bcDate" class="input" type="date"></div>
            <div class="field"><label for="bcType">種類</label><select id="bcType" class="input"><option value="closed">臨時休業</option><option value="special_open">特別営業</option><option value="event_label">お知らせ</option></select></div>
            <div class="field bc-time"><label for="bcStart">開始</label><input id="bcStart" class="input" type="time" step="1800" value="09:00"></div>
            <div class="field bc-time"><label for="bcEnd">終了</label><input id="bcEnd" class="input" type="time" step="1800" value="18:00"></div>
            <div class="field wide"><label for="bcTitle">表示名</label><input id="bcTitle" class="input" maxlength="200" placeholder="例：年末年始休業 / 祝日特別営業"></div>
            <div class="field wide"><label for="bcNote">お客様向け案内</label><textarea id="bcNote" maxlength="500" placeholder="予約画面に表示する案内"></textarea></div>
          </div>
          <div class="bc-help">臨時休業＝終日受付停止。特別営業＝通常定休日でも指定時間を受付。お知らせ＝受付可否は変えず案内だけ表示。</div>
          <div id="bcMessage" class="auth-note" style="margin-top:10px;"></div>
          <div class="bc-actions"><button id="bcCancelEdit" class="btn btn-neutral btn-small" type="button" hidden>編集をやめる</button><button id="bcSave" class="btn btn-primary btn-small" type="button">保存</button></div>
        </div>
        <div class="bc-list">
          <div class="bc-toolbar"><h4>登録済み（今後1年）</h4><span id="bcCount" class="bc-tag">0件</span></div>
          <div id="bcMonths" class="bc-months"></div>
          <div id="bcRows" class="bc-rows"><div class="bc-empty">読み込み中...</div></div>
        </div>
      </div>`;

    const panels=[...content.querySelectorAll(":scope > section.panel")];
    const hours=panels.find(p=>/営業時間/.test(p.querySelector("h3")?.textContent||""));
    if(hours?.nextSibling) content.insertBefore(panel,hours.nextSibling);
    else content.appendChild(panel);

    const activeBasic=document.querySelector('.settings-v2-nav-btn[data-settings-group="basic"].active');
    panel.hidden=!activeBasic&&!!document.querySelector(".settings-v2-nav-btn.active");

    document.getElementById("bcDate").min=today();
    document.getElementById("bcDate").max=addDays(today(),365);
    document.getElementById("bcDate").value=today();
    document.getElementById("bcType").addEventListener("change",syncTimeFields);
    document.getElementById("bcReload").addEventListener("click",load);
    document.getElementById("bcSave").addEventListener("click",save);
    document.getElementById("bcCancelEdit").addEventListener("click",resetEditor);
    panel.addEventListener("click",handlePanelClick);
    resetEditor();
    return panel;
  }

  function resetEditor(){
    state.editingId="";
    document.getElementById("bcEditorTitle").textContent="日付指定を追加";
    document.getElementById("bcDate").value=today();
    document.getElementById("bcType").value="closed";
    document.getElementById("bcStart").value="09:00";
    document.getElementById("bcEnd").value="18:00";
    document.getElementById("bcTitle").value="";
    document.getElementById("bcNote").value="";
    document.getElementById("bcCancelEdit").hidden=true;
    document.getElementById("bcSave").textContent="保存";
    setMessage("");
    syncTimeFields();
  }

  function renderMonths(){
    const from=new Date(`${today()}T12:00:00+09:00`);
    const months=[];
    for(let i=0;i<13;i++){
      const d=new Date(from.getFullYear(),from.getMonth()+i,1);
      const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      if(!months.includes(k)) months.push(k);
    }
    if(!state.filterMonth) state.filterMonth=months[0];
    document.getElementById("bcMonths").innerHTML=months.map(k=>`<button type="button" class="bc-month ${state.filterMonth===k?"active":""}" data-bc-month="${k}">${Number(k.slice(5))}月</button>`).join("");
  }

  function renderRows(){
    renderMonths();
    const rows=state.rows.filter(r=>!state.filterMonth||monthKey(r.target_date)===state.filterMonth);
    document.getElementById("bcCount").textContent=`${state.rows.length}件`;
    document.getElementById("bcRows").innerHTML=rows.length?rows.map(row=>{
      const time=row.override_type==="special_open"?`｜${hhmm(row.start_time)}〜${hhmm(row.end_time)}`:"";
      return `<article class="bc-row ${esc(row.override_type)}"><div class="bc-row-head"><div><strong>${esc(jpDate(row.target_date))} ${esc(typeLabel(row.override_type))}${esc(time)}</strong><small>${esc(row.title||row.public_note||"")}</small></div><span class="bc-tag">${esc(typeLabel(row.override_type))}</span></div><div class="bc-row-actions"><button class="btn btn-secondary btn-small" type="button" data-bc-edit="${esc(row.id)}">編集</button><button class="btn btn-neutral btn-small" type="button" data-bc-delete="${esc(row.id)}">削除</button></div></article>`;
    }).join(""):'<div class="bc-empty">この月の登録はありません。</div>';
  }

  async function load(){
    ensurePanel();
    if(!token()){setMessage("オーナーログイン後に営業カレンダーを読み込めます。");return}
    const from=today(),to=addDays(from,365);
    setMessage("営業カレンダーを読み込んでいます...");
    try{
      const u=new URL(`${API}/api/admin/calendar-overrides`);
      u.searchParams.set("from",from);u.searchParams.set("to",to);
      const response=await fetch(u,{headers:{Accept:"application/json","X-Owner-Session":token()},cache:"no-store"});
      const payload=await response.json().catch(()=>null);
      if(!response.ok||payload?.ok===false) throw new Error(payload?.error||`HTTP ${response.status}`);
      state.rows=(Array.isArray(payload.rows)?payload.rows:[]).filter(r=>["closed","special_open","event_label"].includes(r.override_type)&&r.is_active!==false);
      renderRows();
      setMessage(`今後1年の登録 ${state.rows.length}件を読み込みました。`);
    }catch(e){setMessage(e?.message||"読み込みに失敗しました。",true)}
  }

  async function save(){
    const date=document.getElementById("bcDate").value;
    const type=document.getElementById("bcType").value;
    if(!date||date<today()||date>addDays(today(),365)){setMessage("日付は今日から1年先までで選択してください。",true);return}
    const body={
      target_date:date,
      override_type:type,
      title:document.getElementById("bcTitle").value.trim()||typeLabel(type),
      public_note:document.getElementById("bcNote").value.trim()||null,
      start_time:type==="special_open"?document.getElementById("bcStart").value:null,
      end_time:type==="special_open"?document.getElementById("bcEnd").value:null,
      color_token:type==="closed"?"closed":type==="special_open"?"open":"info",
      is_active:true
    };
    if(type==="special_open"&&(!body.start_time||!body.end_time||body.start_time>=body.end_time)){setMessage("特別営業の開始・終了時間を正しく設定してください。",true);return}
    if(state.editingId) body.id=state.editingId;
    const btn=document.getElementById("bcSave");btn.disabled=true;setMessage("保存しています...");
    try{
      await request(state.editingId?"/api/admin/calendar-overrides/update":"/api/admin/calendar-overrides",{method:"POST",body});
      resetEditor();await load();setMessage("保存しました。WEB予約の空き枠へ反映されます。");
    }catch(e){setMessage(e?.message||"保存に失敗しました。",true)}
    finally{btn.disabled=false}
  }

  function editRow(row){
    state.editingId=row.id;
    document.getElementById("bcEditorTitle").textContent="日付指定を編集";
    document.getElementById("bcDate").value=row.target_date;
    document.getElementById("bcType").value=row.override_type;
    document.getElementById("bcStart").value=hhmm(row.start_time)||"09:00";
    document.getElementById("bcEnd").value=hhmm(row.end_time)||"18:00";
    document.getElementById("bcTitle").value=row.title||"";
    document.getElementById("bcNote").value=row.public_note||"";
    document.getElementById("bcCancelEdit").hidden=false;
    document.getElementById("bcSave").textContent="変更を保存";
    syncTimeFields();
  }

  async function removeRow(id){
    const row=state.rows.find(x=>x.id===id);
    if(!row||!confirm(`${jpDate(row.target_date)} の「${typeLabel(row.override_type)}」を削除しますか？`))return;
    try{await request("/api/admin/calendar-overrides/delete",{method:"POST",body:{id}});await load();setMessage("削除しました。")}
    catch(e){setMessage(e?.message||"削除に失敗しました。",true)}
  }

  function handlePanelClick(e){
    const m=e.target.closest("[data-bc-month]");if(m){state.filterMonth=m.dataset.bcMonth;renderRows();return}
    const ed=e.target.closest("[data-bc-edit]");if(ed){const row=state.rows.find(x=>x.id===ed.dataset.bcEdit);if(row)editRow(row);return}
    const del=e.target.closest("[data-bc-delete]");if(del)removeRow(del.dataset.bcDelete);
  }

  ensurePanel();
  setTimeout(load,250);
})();