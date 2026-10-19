/* DPRO PHOTO R35I — optional birth date picker, standalone progressive enhancement.
 * - Alters only STEP 5 birth_date controls, never booking calendar / HTTP / storage.
 * - Keeps the original data-field=birth_date as an ISO YYYY-MM-DD hidden input.
 * - Native date input replaced by accessible DPRO Japanese month grid.
 */
(function () {
  'use strict';
  if (window.__DPRO_PHOTO_R35I_DOB_ACTIVE__) return;
  window.__DPRO_PHOTO_R35I_DOB_ACTIVE__ = true;

  const FIELD = '.subject-card [data-field="birth_date"]';
  const TODAY = () => { const d = new Date(); return {y:d.getFullYear(),m:d.getMonth()+1,d:d.getDate()}; };
  const YEARS_BACK = 120;
  const WD = ['日','月','火','水','木','金','土'];
  const z2 = n => String(n).padStart(2,'0');
  const iso = (y,m,d) => `${y}-${z2(m)}-${z2(d)}`;
  const cmp = (a,b) => (a.y-b.y)||(a.m-b.m)||(a.d-b.d);
  const parse = v => {
    const x = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v||''));
    if (!x) return null;
    const y=+x[1],m=+x[2],d=+x[3];
    const date = new Date(y,m-1,d);
    return date.getFullYear()===y && date.getMonth()===m-1 && date.getDate()===d ? {y,m,d} : null;
  };
  const fmt = v => {const d=parse(v);return d ? `${d.y}年${d.m}月${d.d}日` : '生年月日を選択（任意）';};
  const valid = d => d && d.y >= TODAY().y-YEARS_BACK && cmp(d,TODAY())<=0;
  const css = `
  .dpro-dob-control { display:flex; gap:8px; width:100%; }
  .dpro-dob-control > .dpro-dob-open { min-width:0; flex:1; padding:12px 14px; border:1px solid var(--line,#dce8e5); border-radius:12px; background:#fff; color:var(--ink,#17302d); text-align:left; min-height:48px; cursor:pointer; font:inherit; display:flex; justify-content:space-between; gap:10px; align-items:center; }
  .dpro-dob-open:focus-visible,.dpro-dob-clear:focus-visible,.dpro-dob-panel button:focus-visible,.dpro-dob-panel select:focus-visible {outline:3px solid #328b82; outline-offset:2px;}
  .dpro-dob-open .dpro-dob-placeholder {color:var(--muted,#607471);}
  .dpro-dob-open .dpro-dob-calendar-icon {color:var(--brand,#15584f);font-size:18px; flex-shrink:0;}
  .dpro-dob-control > .dpro-dob-clear {border:1px solid var(--line,#dce8e5);border-radius:12px; background:#fff; color:var(--brand,#15584f); font:inherit; padding:0 12px; cursor:pointer; }
  .dpro-dob-panel {position:fixed; z-index:2147480000; width:min(344px,calc(100vw - 24px)); background:#fff; color:var(--ink,#17302d); padding:14px; border:1px solid #cfe1dd; border-radius:16px; box-shadow:0 15px 40px #17302d33; box-sizing:border-box; font-size:14px;}
  .dpro-dob-panel[hidden]{display:none!important}
  .dpro-dob-toolbar {display:flex;align-items:center;gap:6px;margin-bottom:12px;}
  .dpro-dob-toolbar select {background:#f6faf9; border:1px solid #cee2de; border-radius:9px; padding:9px 5px; color:#163d37; font:inherit; min-width:0; flex:1;}
  .dpro-dob-toolbar button {width:35px;height:36px;border:1px solid #cee2de;border-radius:9px;background:#fff;color:#15584f;font:inherit;cursor:pointer;}
  .dpro-dob-toolbar button:disabled{opacity:.3;cursor:not-allowed}
  .dpro-dob-weekdays,.dpro-dob-days {display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px;text-align:center;}
  .dpro-dob-weekdays{margin-bottom:5px;color:#526965;font-size:12px;}
  .dpro-dob-weekdays span:first-child {color:#c25752}.dpro-dob-weekdays span:last-child {color:#477ba8}
  .dpro-dob-days button {font:inherit;padding:0;border:1px solid transparent;background:#fff;border-radius:8px;min-width:0;min-height:37px;cursor:pointer;color:#183f37;}
  .dpro-dob-days button:first-child {grid-column:1}
  .dpro-dob-days button[data-weekday="0"]{color:#c25752}
  .dpro-dob-days button[data-weekday="6"]{color:#477ba8}
  .dpro-dob-days button[data-current="true"]{border-color:#a5cbc5}
  .dpro-dob-days button[aria-pressed="true"]{background:#15584f;color:#fff;font-weight:750}
  .dpro-dob-days button:not(:disabled):hover{background:#e6f4f0}
  .dpro-dob-days button[aria-pressed="true"]:hover{background:#0a6457}
  .dpro-dob-days button:disabled{opacity:.22;cursor:not-allowed}
  .dpro-dob-days .dpro-dob-empty{min-height:37px}
  .dpro-dob-footer{margin-top:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;color:#59716c;font-size:12px;border-top:1px solid #e0edeb;padding-top:10px}
  .dpro-dob-footer button{font:inherit;padding:7px 10px;border:1px solid #b9d5cf;border-radius:8px;background:#e9f5f1;color:#17594e;cursor:pointer}
  @media(max-width:480px){.dpro-dob-panel{padding:11px}.dpro-dob-days button{min-height:40px}}
  `;
  const style=document.createElement('style');style.id='dpro-r35i-birthday-calendar-css';style.textContent=css;
  document.head.appendChild(style);
  let openState=null;
  const position=() => {
    if(!openState)return;
    const r=openState.button.getBoundingClientRect(),p=openState.panel;
    const w=Math.min(344,window.innerWidth-24),h=p.offsetHeight;
    const left=Math.max(12,Math.min(r.left,window.innerWidth-w-12));
    const below=window.innerHeight-r.bottom,above=r.top;
    const top=(below>=h+8 || below>=above) ? Math.min(window.innerHeight-h-8,r.bottom+8) : Math.max(8,r.top-h-8);
    p.style.left=`${left}px`;p.style.top=`${Math.max(8,top)}px`;
  };
  const close=(restoreFocus=false) => {
    if(!openState)return;
    const s=openState;openState=null;
    s.panel.remove();s.button.setAttribute('aria-expanded','false');
    if(restoreFocus&&document.contains(s.button))s.button.focus();
  };
  const refreshButton=(input,button,clear) => {
    const value=parse(input.value);button.querySelector('.dpro-dob-label').textContent=fmt(input.value);
    button.querySelector('.dpro-dob-label').classList.toggle('dpro-dob-placeholder',!value);
    clear.hidden=!value;
  };
  const openPicker=(input,button,clear) => {
    if(openState?.button===button){close(true);return;}
    close();
    const chosen=parse(input.value), today=TODAY();
    let {y,m}=(chosen&&valid(chosen))?chosen:{y:Math.max(today.y-5,today.y-YEARS_BACK),m:today.m};
    const panel=document.createElement('section');panel.className='dpro-dob-panel';
    panel.setAttribute('role','dialog');panel.setAttribute('aria-label','生年月日を選ぶ');
    panel.innerHTML=`<div class="dpro-dob-toolbar">
      <button type="button" data-dob-prev aria-label="前の月">‹</button>
      <select data-dob-year aria-label="年を選択"></select>
      <select data-dob-month aria-label="月を選択"></select>
      <button type="button" data-dob-next aria-label="次の月">›</button>
    </div><div class="dpro-dob-weekdays">${WD.map(x=>`<span>${x}</span>`).join('')}</div>
    <div class="dpro-dob-days" role="group" aria-label="日付一覧"></div>
    <div class="dpro-dob-footer"><span>生年月日・任意</span><button type="button" data-dob-close>閉じる</button></div>`;
    const yearSel=panel.querySelector('[data-dob-year]'),monthSel=panel.querySelector('[data-dob-month]'),days=panel.querySelector('.dpro-dob-days');
    const yearStart=today.y-YEARS_BACK;
    yearSel.innerHTML=Array.from({length:YEARS_BACK+1},(_,i)=>yearStart+i).reverse().map(n=>`<option value="${n}">${n}年</option>`).join('');
    monthSel.innerHTML=Array.from({length:12},(_,i)=>`<option value="${i+1}">${i+1}月</option>`).join('');
    const render=()=>{
      const t=TODAY();y=Math.max(t.y-YEARS_BACK,Math.min(y,t.y));m=Math.max(1,Math.min(12,m));
      yearSel.value=String(y);monthSel.value=String(m);
      panel.querySelector('[data-dob-prev]').disabled=y===t.y-YEARS_BACK&&m===1;
      panel.querySelector('[data-dob-next]').disabled=y===t.y&&m===t.m;
      const first=new Date(y,m-1,1).getDay(),last=new Date(y,m,0).getDate();
      const selected=parse(input.value);
      days.replaceChildren();
      for(let i=0;i<first;i++){const gap=document.createElement('span');gap.className='dpro-dob-empty';days.appendChild(gap);}
      for(let d=1;d<=last;d++){
        const actual={y,m,d},weekday=new Date(y,m-1,d).getDay();
        const b=document.createElement('button');b.type='button';b.textContent=String(d);
        b.dataset.weekday=String(weekday);b.setAttribute('aria-label',`${y}年${m}月${d}日（${WD[weekday]}）`);
        b.setAttribute('aria-pressed',String(Boolean(selected&&cmp(actual,selected)===0)));
        b.dataset.current=String(cmp(actual,t)===0);b.disabled=!valid(actual);
        b.addEventListener('click',()=>{
          if(b.disabled)return;
          input.value=iso(y,m,d);input.dispatchEvent(new Event('change',{bubbles:true}));
          refreshButton(input,button,clear);close(true);
        });days.appendChild(b);
      }
      position();
    };
    const shift=n=>{const t=TODAY(),minimum=t.y-YEARS_BACK;
      const current=y*12+(m-1)+n;const lo=minimum*12,hi=t.y*12+(t.m-1);
      const fixed=Math.max(lo,Math.min(hi,current));y=Math.floor(fixed/12);m=fixed%12+1;render();
    };
    panel.querySelector('[data-dob-prev]').addEventListener('click',()=>shift(-1));
    panel.querySelector('[data-dob-next]').addEventListener('click',()=>shift(1));
    yearSel.addEventListener('change',()=>{y=+yearSel.value;render();});
    monthSel.addEventListener('change',()=>{m=+monthSel.value;render();});
    panel.querySelector('[data-dob-close]').addEventListener('click',()=>close(true));
    document.body.appendChild(panel);openState={input,button,clear,panel};
    button.setAttribute('aria-expanded','true');render();position();yearSel.focus();
  };
  function enhance(input){
    if(input.dataset.dproDobReady==='1')return;
    input.dataset.dproDobReady='1';
    // Keep ISO input and data-field selector in the form for existing collectSubjects().
    input.type='hidden';
    const container=document.createElement('div');container.className='dpro-dob-control';
    const button=document.createElement('button');button.type='button';button.className='dpro-dob-open';
    button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','生年月日を選択');
    button.innerHTML='<span class="dpro-dob-label"></span><span class="dpro-dob-calendar-icon" aria-hidden="true">▦</span>';
    const clear=document.createElement('button');clear.type='button';clear.className='dpro-dob-clear';clear.textContent='クリア';clear.setAttribute('aria-label','生年月日を消去');
    container.append(button,clear);input.insertAdjacentElement('afterend',container);
    button.addEventListener('click',()=>openPicker(input,button,clear));
    clear.addEventListener('click',()=>{close();input.value='';input.dispatchEvent(new Event('change',{bubbles:true}));refreshButton(input,button,clear);button.focus();});
    refreshButton(input,button,clear);
  }
  const scan=()=>document.querySelectorAll(FIELD).forEach(enhance);
  const boot=()=>{
    scan();
    const root=document.querySelector('#subjectsList')||document.body;
    new MutationObserver(scan).observe(root,{childList:true,subtree:true});
    document.addEventListener('pointerdown',e=>{if(openState&&!openState.panel.contains(e.target)&&!openState.button.contains(e.target))close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&openState){e.preventDefault();close(true);}});
    window.addEventListener('scroll',()=>{if(openState)position();},true);
    window.addEventListener('resize',position);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
