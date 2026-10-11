/* DPRO PHOTO R27 | Japanese iPad calendar | non-mutating display adapter
 * Reuses existing iPad display buttons and hidden ISO date inputs.
 * The owner-ipad booking and reception handlers remain the only change listeners.
 * No booking API calls, credentials, or persistence are used here.
 */
(() => {
  'use strict';
  const VERSION = 'DPRO-PHOTO-R27-IPAD-JA-DATE-20261011';
  if (window.DPRO_PHOTO_IPAD_CALENDAR_JA_R27) return;
  const DOC = document;
  const WEEK = ['日','月','火','水','木','金','土'];
  const FULL_WEEK = ['日曜日','月曜日','火曜日','水曜日','木曜日','金曜日','土曜日'];
  const targets = new Map();
  let active = null;
  let viewYear = 0;
  let viewMonth = 0;
  const pad = v => String(v).padStart(2,'0');
  const iso = (y,m,d) => `${y}-${pad(m)}-${pad(d)}`;
  function splitIso(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!m) return null;
    const y=+m[1], mo=+m[2], d=+m[3], test=new Date(Date.UTC(y,mo-1,d));
    return test.getUTCFullYear()===y && test.getUTCMonth()+1===mo && test.getUTCDate()===d ? {y,m:mo,d} : null;
  }
  function todayJst() {
    try {
      const obj=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
      return `${obj.year}-${obj.month}-${obj.day}`;
    } catch { return new Date().toISOString().slice(0,10); }
  }
  function displayDate(value) {
    const p=splitIso(value);
    if (!p) return '日付を選択';
    const wd = new Date(Date.UTC(p.y,p.m-1,p.d)).getUTCDay();
    return `${p.y}/${pad(p.m)}/${pad(p.d)}（${WEEK[wd]}）`;
  }
  function allowed(input,day){return (!input.min||day>=input.min)&&(!input.max||day<=input.max);}
  function monthAllowed(input,y,m){
    const first=iso(y,m,1),last=iso(y,m,new Date(Date.UTC(y,m,0)).getUTCDate());
    return (!input.min||last>=input.min)&&(!input.max||first<=input.max);
  }
  const css=`
.dpro-ja-date-original{display:none!important}
.dpro-ja-date-trigger{width:100%;min-height:43px;padding:9px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;text-align:left;color:#103f3c;background:#fff;border:1px solid #c9dfda;border-radius:11px;font:inherit;font-size:14px;line-height:1.4;transition:border-color .15s,box-shadow .15s}
.dpro-ja-date-trigger:hover{border-color:#12816e}.dpro-ja-date-trigger:focus-visible,.dpro-ja-date-pop button:focus-visible{outline:3px solid #b0e5dc;outline-offset:2px}.dpro-ja-date-trigger[disabled]{opacity:.45;cursor:not-allowed}.dpro-ja-date-trigger .dpro-ja-date-value.is-empty{color:#81928f}
.dpro-ja-date-trigger svg{width:18px;height:18px;flex-shrink:0;stroke:#0e6c60;fill:none;stroke-width:1.8}
.dpro-ja-date-pop{position:fixed;z-index:2147483000;box-sizing:border-box;width:min(330px,calc(100vw - 20px));max-height:calc(100dvh - 16px);overflow-y:auto;padding:15px;background:#fff;border:1px solid #c4ddd7;border-radius:18px;box-shadow:0 22px 60px rgba(11,65,59,.20);font-family:-apple-system,BlinkMacSystemFont,'Noto Sans JP','Yu Gothic UI',Meiryo,sans-serif;color:#143f39}
.dpro-ja-date-pop[hidden]{display:none!important}.dpro-ja-date-head,.dpro-ja-date-foot{display:flex;align-items:center;justify-content:space-between;gap:7px}
.dpro-ja-date-head{margin-bottom:12px}.dpro-ja-date-title{font-weight:850;font-size:17px;white-space:nowrap}
.dpro-ja-date-pop button{font:inherit;cursor:pointer}.dpro-ja-date-arrow{display:grid;place-items:center;border:1px solid #d9e7e3;border-radius:10px;background:#f2f8f6;width:38px;height:38px;font-size:23px;color:#0d6c60}
.dpro-ja-date-arrow:disabled,.dpro-ja-date-day:disabled{opacity:.28;cursor:not-allowed}.dpro-ja-date-week,.dpro-ja-date-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px}
.dpro-ja-date-week span{text-align:center;font-size:12px;font-weight:800;padding:4px 0;color:#657d78}.dpro-ja-date-week span:first-child,.dpro-ja-date-day.is-sun{color:#b65250}.dpro-ja-date-week span:last-child,.dpro-ja-date-day.is-sat{color:#4273aa}
.dpro-ja-date-day{height:37px;padding:0;border:1px solid transparent;border-radius:10px;background:#fff;font-size:14px;color:#183f3a}.dpro-ja-date-day:not(:disabled):hover{background:#e4f5ef;border-color:#a7d4c8}.dpro-ja-date-day.is-other{color:#93a29f}.dpro-ja-date-day.is-today{border-color:#1a9a84;font-weight:800}.dpro-ja-date-day.is-selected{color:#fff;background:#0d6a5e;font-weight:900;border-color:#0d6a5e}.dpro-ja-date-day.is-selected.is-sun,.dpro-ja-date-day.is-selected.is-sat{color:#fff}
.dpro-ja-date-foot{margin-top:11px;border-top:1px solid #e7f0ed;padding-top:11px}.dpro-ja-date-foot button{border:1px solid #cfdfdb;background:#f1f8f5;border-radius:10px;padding:8px 11px;color:#0c675a;font-size:12px;font-weight:800}.dpro-ja-date-foot .is-primary{background:#0e7061;color:white;border-color:#0e7061}.dpro-ja-date-foot button:disabled{opacity:.45;cursor:not-allowed}
@media(max-width:420px){.dpro-ja-date-pop{padding:10px}.dpro-ja-date-day{height:36px}}
`;
  const style=DOC.createElement('style');style.id='dpro-ja-date-style-r27';style.textContent=css;DOC.head.appendChild(style);
  const pop=DOC.createElement('div');pop.id='dpro-ja-date-pop-r27';pop.className='dpro-ja-date-pop';pop.setAttribute('role','dialog');pop.setAttribute('aria-label','日付選択カレンダー');pop.setAttribute('aria-modal','false');pop.hidden=true;DOC.body.appendChild(pop);
  function sync(input){const b=targets.get(input);if(!b)return;const shown=displayDate(input.value);b.disabled=input.disabled;b.setAttribute('aria-label',`${input.dataset.dproDateLabel||'日付'}：${shown}。カレンダーを開く`);}
  function reposition(){
    if(!active||pop.hidden)return;
    const b=targets.get(active);if(!b)return;
    const r=b.getBoundingClientRect();const w=Math.min(330,window.innerWidth-20),h=pop.offsetHeight||370;
    let left=Math.max(10,Math.min(r.left,window.innerWidth-w-10));
    let top=r.bottom+8;
    if(top+h>window.innerHeight-8&&r.top-h-8>=8)top=r.top-h-8;
    else top=Math.max(8,Math.min(top,window.innerHeight-h-8));
    pop.style.left=`${Math.round(left)}px`;pop.style.top=`${Math.round(top)}px`;
  }
  function close({focus=false}={}){
    const b=active&&targets.get(active);pop.hidden=true;pop.innerHTML='';if(b)b.setAttribute('aria-expanded','false');active=null;
    if(focus&&b)b.focus();
  }
  function selected(input,value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!splitIso(value)||!allowed(input,value))return;
    const old=input.value;input.value=value;sync(input);close({focus:true});
    if(old!==input.value){input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}
  }
  function render(){
    if(!active)return;
    const input=active;
    const current=splitIso(input.value),today=todayJst(),t=splitIso(today);
    const firstDay=new Date(Date.UTC(viewYear,viewMonth-1,1)).getUTCDay();
    const start=new Date(Date.UTC(viewYear,viewMonth-1,1-firstDay));
    const [py,pm]=viewMonth===1?[viewYear-1,12]:[viewYear,viewMonth-1];
    const [ny,nm]=viewMonth===12?[viewYear+1,1]:[viewYear,viewMonth+1];
    let days='';
    for(let n=0;n<42;n++){
      const dt=new Date(start.getTime()+n*86400000),day=iso(dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate());
      const other=dt.getUTCMonth()+1!==viewMonth,wd=dt.getUTCDay();
      const classes=['dpro-ja-date-day',other?'is-other':'',day===today?'is-today':'',day===input.value?'is-selected':'',wd===0?'is-sun':wd===6?'is-sat':''].filter(Boolean).join(' ');
      days+=`<button type="button" class="${classes}" data-dpro-day="${day}" aria-label="${day.replaceAll('-','/')} ${FULL_WEEK[wd]}" aria-pressed="${day===input.value}" ${allowed(input,day)?'':'disabled'}>${dt.getUTCDate()}</button>`;
    }
    pop.innerHTML=`<div class="dpro-ja-date-head"><button type="button" class="dpro-ja-date-arrow" data-dpro-nav="prev" aria-label="前の月" ${monthAllowed(input,py,pm)?'':'disabled'}>‹</button><div class="dpro-ja-date-title" aria-live="polite">${viewYear}年${viewMonth}月</div><button type="button" class="dpro-ja-date-arrow" data-dpro-nav="next" aria-label="次の月" ${monthAllowed(input,ny,nm)?'':'disabled'}>›</button></div><div class="dpro-ja-date-week">${WEEK.map(w=>`<span>${w}</span>`).join('')}</div><div class="dpro-ja-date-days">${days}</div><div class="dpro-ja-date-foot"><button type="button" data-dpro-action="clear" ${input.required?'disabled':''}>クリア</button><button type="button" data-dpro-action="close">閉じる</button><button type="button" class="is-primary" data-dpro-action="today" ${allowed(input,today)?'':'disabled'}>今日（${t.m}/${t.d}）</button></div>`;
    reposition();
  }
  function open(input){
    // Return false only when the Japanese adapter cannot own the target. The
    // legacy native picker remains an explicit asset-failure fallback.
    if(!input||!targets.has(input))return false;
    if(input.disabled)return true;
    if(active===input&&!pop.hidden){close({focus:true});return true;}
    close();active=input;
    const s=splitIso(input.value)||splitIso(todayJst());
    viewYear=s.y;viewMonth=s.m;
    const b=targets.get(input);
    pop.hidden=false;b.setAttribute('aria-expanded','true');sync(input);render();
    const selectedButton=pop.querySelector('.is-selected')||pop.querySelector('.dpro-ja-date-day:not(:disabled)');
    if(selectedButton)selectedButton.focus({preventScroll:true});
    return true;
  }
  function attach(input){
    if(targets.has(input)||!['workDate','manualDate'].includes(input.id)||!input.matches('input[type="date"]'))return;
    const b=DOC.getElementById(input.id+'Display');
    if(!b||b.tagName!=='BUTTON')return;
    // Keep the existing large iPad button, native input and change handlers.
    // Do not install a second click listener or alter the original date value.
    input.dataset.dproDateLabel=input.id==='workDate'?'表示日':'撮影日';
    b.setAttribute('aria-controls',pop.id);
    b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-expanded','false');
    targets.set(input,b);
    input.addEventListener('input',()=>sync(input));input.addEventListener('change',()=>sync(input));
    sync(input);
  }
  function scan(){for(const id of ['workDate','manualDate']){const input=DOC.getElementById(id);if(input)attach(input);}targets.forEach((button,input)=>{if(input.isConnected)sync(input);});}
  let scheduled=false;
  const observer=new MutationObserver(()=>{
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;scan()});
  });
  observer.observe(DOC.body,{subtree:true,childList:true});
  pop.addEventListener('click',e=>{
    const btn=e.target.closest('button');if(!btn||!active)return;
    if(btn.dataset.dproDay){selected(active,btn.dataset.dproDay);return;}
    if(btn.dataset.dproNav){
      if(btn.dataset.dproNav==='prev'){viewMonth--;if(viewMonth===0){viewMonth=12;viewYear--}}
      else{viewMonth++;if(viewMonth===13){viewMonth=1;viewYear++}}
      render();pop.querySelector(`[data-dpro-nav="${btn.dataset.dproNav}"]`)?.focus({preventScroll:true});
      return;
    }
    switch(btn.dataset.dproAction){
      case 'today':selected(active,todayJst());break;
      case 'close':close({focus:true});break;
      case 'clear':{
        if(active.required)return;const inp=active,old=inp.value;inp.value='';sync(inp);close({focus:true});if(old){inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));}break;
      }
    }
  });
  DOC.addEventListener('pointerdown',e=>{if(active&&!pop.contains(e.target)&&!targets.get(active)?.contains(e.target))close();},true);
  DOC.addEventListener('keydown',e=>{
    if(!active)return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close({focus:true});return;}
    const b=DOC.activeElement;if(!b?.matches('.dpro-ja-date-day'))return;
    const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key];
    if(delta===undefined)return;e.preventDefault();
    const value=b.dataset.dproDay,part=splitIso(value);if(!part)return;
    const dt=new Date(Date.UTC(part.y,part.m-1,part.d+delta));const target=iso(dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate());
    if(!allowed(active,target))return;
    if(dt.getUTCFullYear()!==viewYear||dt.getUTCMonth()+1!==viewMonth){viewYear=dt.getUTCFullYear();viewMonth=dt.getUTCMonth()+1;render();}
    pop.querySelector(`[data-dpro-day="${target}"]`)?.focus({preventScroll:true});
  },true);
  window.addEventListener('resize',reposition);
  window.addEventListener('scroll',reposition,true);
  window.addEventListener('pageshow',scan);
  DOC.addEventListener('visibilitychange',()=>{if(!DOC.hidden)scan()});
  DOC.addEventListener('click',()=>requestAnimationFrame(scan),false);
  scan();
  setTimeout(scan,300);setTimeout(scan,1500);
  // The owner app assigns some dates programmatically after async loading.
  // Refresh only the local labels, never issue any network or data operations.
  setInterval(()=>{if(!DOC.hidden)scan();},1000);
  window.DPRO_PHOTO_IPAD_CALENDAR_JA_R27=Object.freeze({version:VERSION,refresh:scan,formatDate:displayDate,open,close:()=>close()});
})();
