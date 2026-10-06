(() => {
  "use strict";
  const VERSION = "DPRO-PHOTO-FEATURE-SWITCH-PHASE0-FIX2-20261006";
  let flags = {};
  let initialized = false;

  function enabled(key, fallback = false) {
    if (!initialized) return fallback;
    return Object.prototype.hasOwnProperty.call(flags, key) ? flags[key] === true : fallback;
  }
  function hide(node, value) { if (node) node.hidden = Boolean(value); }
  function hideField(id, value) {
    const input = document.getElementById(id);
    const field = input?.closest(".field");
    if (field) field.hidden = Boolean(value);
  }
  function ensureIntro() {
    const anchor = document.getElementById("featureCustomerFollowup");
    const panel = anchor?.closest("section.panel");
    if (!panel || document.getElementById("featureSwitchMasterIntro")) return;
    const box = document.createElement("div");
    box.id = "featureSwitchMasterIntro";
    box.className = "auth-note";
    box.style.cssText = "margin:0 0 14px;line-height:1.65;";
    box.innerHTML = "<strong>使う機能だけONにしてください。</strong><br>OFFにした機能は日常画面から隠れます。保存済みデータは削除されないため、あとからONに戻せます。<br><small>機能はDPRO側に残したまま、店舗ごとの画面だけをシンプルにします。</small>";
    const head = panel.querySelector(".panel-head");
    if (head) head.insertAdjacentElement("afterend", box); else panel.prepend(box);
  }
  function apply(notify = false) {
    ensureIntro();
    if (!initialized) return;
    const follow = enabled("customer_followup", false);
    const subjectHistory = enabled("subject_history", false);
    const lifecycle = enabled("lifecycle_search", false);
    const birthday = enabled("birthday_search", false);
    const returnCycle = enabled("return_cycle_search", false);
    const segment = enabled("line_segment", false);
    const csv = enabled("csv_migration", false);
    const lineLink = enabled("line_customer_link", false);
    hide(document.getElementById("followupNavBtn"), !follow);
    if (!follow) hide(document.getElementById("view-followup"), true);
    hideField("followupAge3", !lifecycle);
    hideField("followupBirthdayMonth", !birthday);
    hideField("followupInactiveMonths", !returnCycle);
    document.querySelectorAll("[data-open-subject-history]").forEach((el) => { el.hidden = !subjectHistory; });
    const lineMount = document.getElementById("lineSegmentMount");
    hide(lineMount?.closest("section.panel"), !segment);
    hide(document.getElementById("csvMigrationPanel"), !csv);
    hide(document.getElementById("lineCustomerLinkPanel"), !lineLink);
    const crmNav = document.querySelector('.settings-v2-nav-btn[data-settings-group="crm"]');
    if (crmNav) crmNav.hidden = !(csv || lineLink);
    document.documentElement.dataset.dproPhotoFeatureSwitch = VERSION;
    if (notify) {
      window.dispatchEvent(new CustomEvent("dpro:photo-features-applied", { detail: { version: VERSION, flags: { ...flags } } }));
    }
  }
  window.addEventListener("dpro:photo-settings-rendered", (event) => {
    flags = { ...(event?.detail?.featureFlags || {}) };
    initialized = true;
    apply(true);
    setTimeout(() => apply(false), 0);
    setTimeout(() => apply(false), 300);
  });
  let queued = false;
  function queueApply() {
    if (!initialized || queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; apply(false); });
  }
  function start() {
    if (!document.body) return;
    const observer = new MutationObserver(queueApply);
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true }); else start();
  window.DPRO_PHOTO_FEATURES = Object.freeze({ version: VERSION, isEnabled: enabled, getFlags: () => ({ ...flags }), apply: () => apply(true) });
})();
