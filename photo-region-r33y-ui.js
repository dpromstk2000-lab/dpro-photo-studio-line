/* DPRO PHOTO R33U paginated owner region read-only candidate.
   RELEASE CANDIDATE, NO AUTO MOUNT. No LINE/email. Deployment requires approval.
   Drop-in replacement for R33F component interface used by R33G/H bridge.
*/
(function(root){'use strict';
 const ID='DPRO-PHOTO-R33Y-REGION-PAGED-V1-CANDIDATE';
 const instances=new WeakMap();
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const INVALID=/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u;
 const fields=Object.freeze([
   ['prefecture','住所に含む都道府県名（必須）','福岡県'],
   ['municipality','住所に含む市区町村名','粕屋町'],
   ['addressKeyword','追加の住所キーワード','原町']]);
 function element(tag,text){const e=root.document.createElement(tag);if(text!==undefined)e.textContent=String(text);return e;}
 function mount(container,{apiBase,getOwnerToken,fetchImpl,productEnabled=false,AbortControllerImpl=root.AbortController}={}){
   const endpoint=String(apiBase||'');
   // Freeze the destination to the explicitly reviewed Gateway. This is NOT a generic URL proxy.
   // The offline demo uses a mocked fetch with this URL and never makes network requests.
   if(productEnabled!==true||!container||typeof getOwnerToken!=='function'||typeof fetchImpl!=='function'||
      typeof AbortControllerImpl!=='function'||endpoint!=='https://cbknucemarcpbscirzyv.supabase.co/functions/v1/dpro-photo-product-ready-gateway-v5')
     throw Error('ISOLATED_STAGE_NOT_CONFIGURED');
   if(instances.has(container))return instances.get(container);
   container.append(element('h3','地域検索（閲覧のみ）'),element('p','住所の文字列一致候補です。件数はページ単位で表示します。配信先に自動追加されません。'));
   const inputs={};
   for(const [key,label,placeholder] of fields){
     const wrap=element('label',label),input=element('input');input.type='search';input.maxLength=80;
     input.placeholder=placeholder;input.autocomplete='off';input.className='input';input.setAttribute('aria-label',label);
     wrap.append(input);container.append(wrap);inputs[key]=input;
   }
   const searchButton=element('button','候補を検索'),moreButton=element('button','次の候補を表示');
   searchButton.type=moreButton.type='button';searchButton.className='btn btn-primary';moreButton.className='btn btn-neutral';
   moreButton.hidden=true;
   const status=element('p','都道府県を入力してください。');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
   const list=element('ul');list.setAttribute('aria-label','地域検索の顧客候補');
   container.append(searchButton,moreButton,status,list);
   let serial=0,active=null,destroyed=false,cursor=null,hasMore=false,count=0,pages=0,seenIds=new Set();
   function invalidate(message='検索条件が変わりました。再検索してください。'){
     serial++;if(active){active.abort();active=null;}
     cursor=null;hasMore=false;count=0;pages=0;seenIds.clear();list.replaceChildren();
     searchButton.disabled=false;moreButton.disabled=false;moreButton.hidden=true;status.textContent=message;
   }
   function queryValues(){
     const q=new URLSearchParams();
     for(const [key] of fields){const raw=String(inputs[key].value??'');const val=raw.trim();
       if(raw.length>80 || INVALID.test(raw)||[...val].length>40)throw Error('INVALID_REGION_FILTER');
       if(val)q.set(key,val);
     }
     if(!q.get('prefecture'))throw Error('PREFECTURE_REQUIRED');q.set('limit','30');return q;
   }
   async function page(first=false){
     if(destroyed)throw Error('REGION_VIEW_DESTROYED');
     if(first)invalidate('検索しています…');
     if(!first&&(!hasMore||active||pages>=10))return;
     const seq=serial,requestedCursor=first?null:cursor;
     let q,token;
     try{q=queryValues();token=String(getOwnerToken()||'');}catch(_){invalidate('都道府県など検索条件を確認してください。');return;}
     if(!token){invalidate('オーナー認証が必要です。');return;}
     if(requestedCursor)q.set('cursor',requestedCursor);
     const controller=new AbortControllerImpl();active=controller;searchButton.disabled=true;moreButton.disabled=true;
     // Browser-side deadline is longer than the Gateway's 7.5-second budget; avoids stuck UI.
     const deadline=root.setTimeout(()=>controller.abort(),10000);
     try{
       const res=await fetchImpl(endpoint.replace(/\/$/,'')+'/api/admin/customer-regions/preview?'+q.toString(),{
         method:'GET',headers:{Accept:'application/json','X-Owner-Session':token},
         cache:'no-store',redirect:'error',signal:controller.signal});
       if(seq!==serial||destroyed)return;
       if(String(getOwnerToken()||'')!==token){invalidate('管理者認証が変更されました。');return;}
       if(!res?.ok)throw Error('REGION_RESPONSE_FAILED');
       const data=await res.json();
       if(seq!==serial||destroyed)return;
       if(String(getOwnerToken()||'')!==token){invalidate('管理者認証が変更されました。');return;}
       if(data?.ok!==true||data.mode!=='READ_ONLY_PAGED_V1'||
          data.query_kind!=='LITERAL_ADDRESS_SUBSTRING'||data.external_send!==false||
          data.count_is_exact!==false||data.matched_customer_count!==null||
          !Array.isArray(data.items)||data.items.length>30||typeof data.has_more!=='boolean'||
          (data.has_more&&data.items.length!==30)||
          (data.has_more&&(!data.next_cursor||!UUID.test(data.next_cursor))))
         throw Error('REGION_CONTRACT_MISMATCH');
       let prev=requestedCursor;
       const current=new Set();
       for(const item of data.items){
         if(!item||!UUID.test(item.customer_id)||typeof item.customer_no!=='string'||
            item.customer_no.length>40||INVALID.test(item.customer_no)||seenIds.has(item.customer_id)||
            current.has(item.customer_id)||(prev&&item.customer_id<=prev)||
            Object.keys(item).some(k=>!['customer_id','customer_no'].includes(k)))
           throw Error('REGION_CUSTOMER_UNVERIFIED');
         current.add(item.customer_id);prev=item.customer_id;
       }
       if(data.items.length && data.has_more && data.next_cursor!==prev)throw Error('REGION_CURSOR_MISMATCH');
       if(!data.has_more && data.next_cursor!==null)throw Error('REGION_CURSOR_MISMATCH');
       if(data.items.length===0 && data.has_more)throw Error('REGION_EMPTY_HAS_MORE');
       if(seq!==serial||destroyed)return;
       for(const item of data.items){seenIds.add(item.customer_id);list.append(element('li',item.customer_no||'顧客番号なし'));}
       count+=data.items.length;pages++;hasMore=data.has_more;cursor=data.has_more?data.next_cursor:null;
       moreButton.hidden=!hasMore || pages>=10;
       status.textContent='表示中 '+count+'件（総件数は未算出）。'+
         (hasMore?(pages>=10?'表示上限に達しました。条件を絞ってください。':'次ページあり。'):'この条件の最後のページです。')+
         ' LINE・メール配信には追加されません。';
     }catch(_){
       if(seq===serial&&!destroyed)invalidate('検索結果を安全に検証できませんでした。再検索してください。');
     }finally{
       root.clearTimeout(deadline);
       if(seq===serial&&!destroyed){active=null;searchButton.disabled=false;moreButton.disabled=false;}
     }
   }
   for(const [key] of fields)inputs[key].addEventListener('input',()=>invalidate());
   searchButton.addEventListener('click',()=>page(true));moreButton.addEventListener('click',()=>page(false));
   const api=Object.freeze({clear:()=>invalidate('検索結果を消去しました。'),destroy:()=>{
     if(destroyed)return;invalidate('検索を終了しました。');destroyed=true;container.replaceChildren();instances.delete(container);},
     search:()=>page(true),loadMore:()=>page(false),mounted:true});
   instances.set(container,api);return api;
 }
 // Same interface expected by R33G/H owner bridge. Never auto-initialize.
 root.DPRO_PHOTO_R33F_REGION=Object.freeze({id:ID,mount,autoMount:false,sendEnabled:false,stagingOnly:false,releaseCandidate:true,paged:true});
})(window);
