(function (global) {
  "use strict";
  const DATA = global.DPRO_PHOTO_TUTORIAL_V11;
  if (!DATA || !global.document) return;
  const NS = DATA.namespace;
  const steps = DATA.steps;
  const doc = global.document;
  let card = null, launcher = null, highlighted = null, drag = null, panelSnapshot = null;

  const currentPage = () => (global.location.pathname.split("/").pop() || "index.html");
  const demo = () => new URL(global.location.href).searchParams.get("demo") === "1";
  const requested = () => new URL(global.location.href).searchParams.get("tutorial") === "1";
  function readState() { try { return JSON.parse(global.localStorage.getItem(NS) || "null") || {}; } catch { return {}; } }
  function writeState(patch) { const next = { ...readState(), ...patch, updatedAt: new Date().toISOString() }; global.localStorage.setItem(NS, JSON.stringify(next)); return next; }
  function stepByNumber(n) { return steps.find((x) => x.step === Number(n)) || steps[0]; }
  function pageDefaultStep() { return (steps.find((x) => x.page === currentPage()) || steps[0]).step; }
  function removeHighlight() { if (highlighted) highlighted.removeAttribute("data-dpro-tutorial-highlight"); highlighted = null; }
  function targetFor(step) { return doc.querySelector(step.target) || (step.fallback ? doc.querySelector(step.fallback) : null); }

  function snapshotPanels() {
    if (currentPage() !== "index.html" || panelSnapshot) return;
    panelSnapshot = [...doc.querySelectorAll('section[data-step]')].map((el) => ({ el, active: el.classList.contains("is-active") }));
  }
  function restorePanels() { if (!panelSnapshot) return; panelSnapshot.forEach((x) => x.el.classList.toggle("is-active", x.active)); panelSnapshot = null; }
  function exposeIndexStep(step) {
    if (currentPage() !== "index.html" || step.page !== "index.html") return;
    snapshotPanels();
    doc.querySelectorAll('section[data-step]').forEach((el) => el.classList.toggle("is-active", Number(el.dataset.step) === step.step));
  }
  function clamp(x, y, el = card) {
    const r = el.getBoundingClientRect(), pad = 8;
    return { x: Math.max(pad, Math.min(x, global.innerWidth - r.width - pad)), y: Math.max(pad, Math.min(y, global.innerHeight - r.height - pad)) };
  }
  function applyPosition(state) {
    if (!card || !state.position) return;
    const p = clamp(Number(state.position.x) || 8, Number(state.position.y) || 8);
    card.style.left = `${p.x}px`; card.style.top = `${p.y}px`; card.style.right = "auto"; card.style.bottom = "auto";
  }
  function savePosition() { if (!card) return; const r = card.getBoundingClientRect(); writeState({ position: { x: Math.round(r.left), y: Math.round(r.top) } }); }
  function setPosition(x, y, persist = false) { if (!card) return; const p = clamp(x, y); card.style.left=`${p.x}px`;card.style.top=`${p.y}px`;card.style.right="auto";card.style.bottom="auto"; if (persist) savePosition(); }

  function makeLauncher() {
    if (launcher) return launcher;
    launcher = doc.createElement("button"); launcher.id = "dproTutorialLauncher"; launcher.type = "button";
    launcher.addEventListener("click", () => resume()); doc.body.appendChild(launcher); return launcher;
  }
  function updateLauncher() { const s = readState(); const l = makeLauncher(); l.textContent = s.completed ? "操作ガイドをもう一度見る" : (s.step ? "操作ガイドを再開" : "操作ガイド"); l.hidden = Boolean(s.active); }

  function closeTutorial() { removeHighlight(); restorePanels(); if (card) { card.remove(); card = null; } writeState({ active: false }); updateLauncher(); }
  function skipTutorial() { removeHighlight(); restorePanels(); if (card) { card.remove(); card = null; } writeState({ active: false, completed: true, step: 10 }); updateLauncher(); }
  function replay() { writeState({ active: true, completed: false, step: 1 }); global.location.href = "index.html?demo=1&tutorial=1"; }
  function resume() { const s = readState(); if (s.completed) return replay(); const n = Number(s.step || pageDefaultStep()); const step = stepByNumber(n); writeState({ active: true, step: n }); if (currentPage() !== step.page) { global.location.href = `${step.page}?demo=1&tutorial=1`; return; } render(n); }

  function navigate(n) {
    const next = stepByNumber(n); writeState({ active: true, step: next.step, completed: false });
    if (currentPage() !== next.page) { global.location.href = `${next.page}?demo=1&tutorial=1`; return; }
    render(next.step);
  }
  function nextStep(step) {
    if (step.complete) { removeHighlight(); restorePanels(); if (card) { card.remove(); card = null; } writeState({ active:false,completed:true,step:10 }); updateLauncher(); makeLauncher().focus(); return; }
    if (step.next) { writeState({ active:true,step:step.step+1 }); global.location.href = step.next; return; }
    navigate(step.step + 1);
  }
  function previousStep(step) {
    if (step.step <= 1) return;
    if (step.prev) { writeState({ active:true,step:step.step-1 }); global.location.href = step.prev; return; }
    navigate(step.step - 1);
  }

  function bindDrag(handle) {
    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      const r = card.getBoundingClientRect(); drag = { id:e.pointerId, dx:e.clientX-r.left, dy:e.clientY-r.top }; handle.setPointerCapture?.(e.pointerId); e.preventDefault();
    });
    handle.addEventListener("pointermove", (e) => { if (!drag || drag.id !== e.pointerId) return; setPosition(e.clientX-drag.dx, e.clientY-drag.dy); });
    const finish = (e) => { if (!drag || (e.pointerId !== undefined && drag.id !== e.pointerId)) return; drag=null; savePosition(); };
    handle.addEventListener("pointerup", finish); handle.addEventListener("pointercancel", finish);
    handle.addEventListener("keydown", (e) => {
      const delta = e.shiftKey ? 24 : 8; const r = card.getBoundingClientRect(); let x=r.left,y=r.top;
      if (e.key === "ArrowLeft") x-=delta; else if (e.key === "ArrowRight") x+=delta; else if (e.key === "ArrowUp") y-=delta; else if (e.key === "ArrowDown") y+=delta; else return;
      e.preventDefault(); setPosition(x,y,true);
    });
  }

  function render(n) {
    const step = stepByNumber(n); if (currentPage() !== step.page) { global.location.href = `${step.page}?demo=1&tutorial=1`; return; }
    removeHighlight(); exposeIndexStep(step);
    if (card) card.remove();
    card = doc.createElement("section"); card.id = "dproTutorialCard"; card.setAttribute("role","dialog"); card.setAttribute("aria-modal","false"); card.setAttribute("aria-labelledby","dproTutorialTitle");
    card.innerHTML = `<div class="dpro-tutorial-handle" tabindex="0" role="application" aria-label="チュートリアルカードを移動。矢印キーでも移動できます"><span class="dpro-tutorial-grip">⋮⋮ DRAG / ${step.step} of 10</span><button class="dpro-tutorial-close" type="button" aria-label="操作ガイドを閉じる">×</button></div><div class="dpro-tutorial-body"><p class="dpro-tutorial-step">FIRST10 / STEP ${String(step.step).padStart(2,"0")}</p><h2 class="dpro-tutorial-title" id="dproTutorialTitle">${step.title}</h2><p class="dpro-tutorial-copy">${step.body}</p>${step.step===7?'<div class="dpro-tutorial-note">このガイドは同意チェックや予約送信を自動実行しません。</div>':''}<div class="dpro-tutorial-actions"><button class="dpro-tutorial-btn skip" type="button" data-action="skip">スキップ</button><button class="dpro-tutorial-btn" type="button" data-action="back" ${step.step===1?'disabled':''}>戻る</button><button class="dpro-tutorial-btn primary" type="button" data-action="next">${step.complete?'完了':'次へ'}</button></div></div>`;
    doc.body.appendChild(card); bindDrag(card.querySelector(".dpro-tutorial-handle"));
    card.querySelector(".dpro-tutorial-close").addEventListener("click", closeTutorial);
    card.querySelector('[data-action="skip"]').addEventListener("click", skipTutorial);
    card.querySelector('[data-action="back"]').addEventListener("click", () => previousStep(step));
    card.querySelector('[data-action="next"]').addEventListener("click", () => nextStep(step));
    const state = writeState({ active:true,step:step.step,completed:false }); applyPosition(state);
    highlighted = targetFor(step); if (highlighted) { highlighted.setAttribute("data-dpro-tutorial-highlight","1"); try { highlighted.scrollIntoView({ behavior:"smooth", block:"center" }); } catch {} }
    updateLauncher(); card.querySelector('[data-action="next"]').focus();
  }

  global.addEventListener("resize", () => { if (!card) return; const r=card.getBoundingClientRect(); setPosition(r.left,r.top,true); });
  doc.addEventListener("keydown", (e) => { if (e.key === "Escape" && card) { e.preventDefault(); closeTutorial(); } });
  function init() {
    if (!demo() && !requested()) return;
    const s = readState();
    if (requested()) { const n = Number(s.step || pageDefaultStep()); writeState({ active:true,step:n,completed:false }); }
    updateLauncher();
    const state = readState();
    if (state.active) { const step = stepByNumber(state.step || pageDefaultStep()); if (step.page === currentPage()) render(step.step); else global.location.href = `${step.page}?demo=1&tutorial=1`; }
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init, { once:true }); else init();
})(window);
