(() => {
  "use strict";

  const VERSION = "DPRO-PHOTO-FEATURE-SWITCH-UI-V2-HOTFIX1-20261006";
  const $ = (id) => document.getElementById(id);

  const DESCRIPTIONS = Object.freeze({
    featureCustomerFollowup: "年齢・誕生日・前回撮影日から、次の撮影につながるお客様を見つけます。",
    featureSubjectHistory: "お子さま・ご家族など、撮影対象者ごとの履歴を残します。",
    featureLifecycleSearch: "3歳・5歳・7歳など、年齢やライフイベントから検索します。",
    featureBirthdaySearch: "誕生月からフォロー候補を探します。",
    featureReturnCycleSearch: "前回撮影から6か月・1年などの条件で探します。",
    featureLineSegment: "条件で絞ったお客様へLINE配信します。",
    featureCsvMigration: "他システムの顧客データを安全確認して取り込みます。",
    featureLineCustomerLink: "既存顧客とLINE利用者を確認しながら紐付けます。"
  });

  let decorated = false;

  function injectStyle() {
    if ($("dproFeatureSimpleUiStyle")) return;
    const style = document.createElement("style");
    style.id = "dproFeatureSimpleUiStyle";
    style.textContent = `
      .feature-simple-panel .panel-head h3{font-size:20px}
      .feature-simple-panel .panel-head p{font-size:12px;line-height:1.65;max-width:780px}
      .feature-simple-panel #featureSwitchMasterIntro{
        margin:0 0 14px!important;padding:10px 12px!important;border-radius:12px!important;
        border:1px solid #cfe2dc!important;background:#f1f9f6!important;color:#285f55!important;
        font-size:12px!important;line-height:1.6!important
      }
      .feature-simple-layout{display:grid;gap:12px;margin-top:12px}
      .feature-simple-main{
        display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;
        padding:17px 18px;border:1px solid #b9d9d0;border-radius:16px;background:#f4fbf8
      }
      .feature-simple-main-copy strong{display:block;font-size:16px;color:#12312e}
      .feature-simple-main-copy span{display:block;margin-top:5px;color:#607773;font-size:12px;line-height:1.6}
      .feature-simple-main .v21-switch-label{padding:0!important;min-height:0!important;font-size:0}
      .feature-simple-main .v21-switch-input{margin:0!important}
      .feature-simple-details{
        border:1px solid #d8e4e1;border-radius:14px;background:#fff;overflow:hidden
      }
      .feature-simple-details>summary{
        list-style:none;cursor:pointer;padding:13px 15px;font-weight:850;font-size:13px;
        display:flex;align-items:center;justify-content:space-between;gap:12px
      }
      .feature-simple-details>summary::-webkit-details-marker{display:none}
      .feature-simple-details>summary::after{content:"＋";font-size:18px;color:#49736b}
      .feature-simple-details[open]>summary::after{content:"－"}
      .feature-simple-detail-grid{
        display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;padding:0 13px 13px
      }
      .feature-simple-card{
        min-width:0;padding:13px;border:1px solid #dfe8e5;border-radius:12px;background:#fbfcfc
      }
      .feature-simple-card-head{display:flex;gap:10px;align-items:center}
      .feature-simple-card .v21-switch-label{padding:0!important;min-height:30px!important;font-weight:850}
      .feature-simple-card p{margin:7px 0 0;color:#607773;font-size:11px;line-height:1.55}
      .feature-simple-extra-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      .feature-simple-section-title{margin:2px 0 -2px;font-size:12px;font-weight:900;color:#355f57}
      .feature-simple-panel .feature-simple-hidden-effect{display:none!important}
      .feature-simple-panel .feature-simple-source-field{display:none!important}
      .feature-simple-panel .field-help{display:none!important}
      .feature-simple-dependency{
        margin-top:2px;border:1px solid #dfe8e5;border-radius:12px;background:#fafcfc;overflow:hidden
      }
      .feature-simple-dependency button{
        width:100%;border:0;background:transparent;padding:10px 12px;text-align:left;cursor:pointer;
        font:inherit;font-size:11px;font-weight:800;color:#55716c;display:flex;justify-content:space-between;gap:10px
      }
      .feature-simple-dependency button::after{content:"詳しく見る";font-weight:700;color:#0f7562}
      .feature-simple-dependency.is-open button::after{content:"閉じる"}
      .feature-simple-dependency .v21-dependency-list{display:none!important;padding:0 12px 2px}
      .feature-simple-dependency.is-open .v21-dependency-list{display:grid!important}
      .feature-simple-dependency .v21-dependency-message{
        margin:0 12px 11px!important;font-size:10px!important;padding:6px 8px!important
      }
      @media(max-width:900px){
        .feature-simple-extra-grid{grid-template-columns:1fr}
        .feature-simple-detail-grid{grid-template-columns:1fr}
      }
      @media(max-width:600px){
        .feature-simple-main{grid-template-columns:1fr auto;padding:14px}
        .feature-simple-main-copy strong{font-size:15px}
      }
    `;
    document.head.appendChild(style);
  }

  function cleanEffectNotes(panel) {
    panel.querySelectorAll("small").forEach((node) => {
      const style = String(node.getAttribute("style") || "");
      if (style.includes("margin-left:51px") && !node.classList.contains("feature-simple-hidden-effect")) {
        node.classList.add("feature-simple-hidden-effect");
      }
    });
  }

  function takeLabel(id) {
    return $(id)?.closest("label") || null;
  }

  function makeCard(id) {
    const label = takeLabel(id);
    if (!label) return null;

    const card = document.createElement("div");
    card.className = "feature-simple-card";

    const head = document.createElement("div");
    head.className = "feature-simple-card-head";
    head.appendChild(label);

    const p = document.createElement("p");
    p.textContent = DESCRIPTIONS[id] || "";

    card.append(head, p);
    return card;
  }

  function simplifyDependency() {
    const box = $("settingsV2DependencyBox");
    if (!box || box.dataset.simpleUi === "1") return;

    box.dataset.simpleUi = "1";
    box.classList.add("feature-simple-dependency");

    const strong = box.querySelector(":scope > strong");
    if (strong) strong.remove();

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "機能の連動について";
    button.addEventListener("click", () => box.classList.toggle("is-open"));
    box.prepend(button);
  }

  function decorate() {
    injectStyle();

    const anchor = $("featureCustomerFollowup");
    const panel = anchor?.closest("section.panel");
    if (!panel) return false;

    panel.classList.add("feature-simple-panel");

    const title = panel.querySelector(".panel-head h3");
    const subtitle = panel.querySelector(".panel-head p");

    if (title && title.textContent !== "使う機能") {
      title.textContent = "使う機能";
    }
    const subtitleText = "この店舗で使うものだけONにしてください。OFFの機能は日常画面から隠れます。";
    if (subtitle && subtitle.textContent !== subtitleText) {
      subtitle.textContent = subtitleText;
    }

    cleanEffectNotes(panel);
    simplifyDependency();

    if (decorated || $("featureSimpleLayout")) {
      decorated = true;
      return true;
    }

    const formGrid = panel.querySelector(".form-grid");
    if (!formGrid) return false;

    [...formGrid.children].forEach((field) => {
      if (!field.classList.contains("feature-simple-source-field")) {
        field.classList.add("feature-simple-source-field");
      }
    });

    const layout = document.createElement("div");
    layout.id = "featureSimpleLayout";
    layout.className = "feature-simple-layout";

    const main = document.createElement("div");
    main.className = "feature-simple-main";

    const mainCopy = document.createElement("div");
    mainCopy.className = "feature-simple-main-copy";
    mainCopy.innerHTML = `<strong>顧客フォロー</strong><span>${DESCRIPTIONS.featureCustomerFollowup}</span>`;

    const mainLabel = takeLabel("featureCustomerFollowup");
    if (mainLabel) main.append(mainCopy, mainLabel);

    const details = document.createElement("details");
    details.className = "feature-simple-details";
    details.innerHTML = "<summary>顧客フォローの詳細設定</summary>";

    const detailGrid = document.createElement("div");
    detailGrid.className = "feature-simple-detail-grid";
    ["featureSubjectHistory","featureLifecycleSearch","featureBirthdaySearch","featureReturnCycleSearch"]
      .map(makeCard).filter(Boolean).forEach((card) => detailGrid.appendChild(card));
    details.appendChild(detailGrid);

    const extraTitle = document.createElement("div");
    extraTitle.className = "feature-simple-section-title";
    extraTitle.textContent = "必要な店舗だけ使う機能";

    const extra = document.createElement("div");
    extra.className = "feature-simple-extra-grid";
    ["featureLineSegment","featureCsvMigration","featureLineCustomerLink"]
      .map(makeCard).filter(Boolean).forEach((card) => extra.appendChild(card));

    layout.append(main, details, extraTitle, extra);
    formGrid.insertAdjacentElement("afterend", layout);

    decorated = true;
    return true;
  }

  function boot() {
    decorate();

    window.addEventListener("dpro:photo-settings-rendered", () => {
      setTimeout(() => {
        decorate();
        simplifyDependency();
      }, 0);
    });

    // HOTFIX1:
    // Global MutationObserver was removed because changing title/subtitle
    // could trigger an endless childList mutation loop and block auth/API tasks.
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  window.DPRO_PHOTO_FEATURE_SWITCH_UI_V2 = Object.freeze({
    version: VERSION,
    decorate
  });
})();