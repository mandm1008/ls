/* Automatic update detector for a static HTML game.
   Checks page HTML every 60 seconds and when returning to tab.
   New versions trigger an opt-in update dialog; no backend needed.
 */
(function(){
 'use strict';
 const gameId='song-lich-su-1954';
 const ownVersion=document.querySelector('meta[name="game-version"]')?.content||'1.4.0';
 const modal=document.querySelector('#updateModal'), info=document.querySelector('#updateVersions');
 const manual=document.querySelector('#checkUpdate');
 const later=document.querySelector('#updateLater'), now=document.querySelector('#updateNow');
 if(!modal||!window.SLS_ORIGINAL_HTML)return;
 const normalize=raw=>{
  const doc=new DOMParser().parseFromString(raw,'text/html');
  // Updater itself is loaded after gameLogic and is excluded from baseline snapshot.
  doc.querySelectorAll('script:not(#gameLogic)').forEach(el=>el.remove());
  // Ignore whitespace-only top-level nodes added when the updater script is removed.
  for(const parent of [doc.head,doc.body]){[...parent.childNodes].filter(n=>n.nodeType===3&&!n.textContent.trim()).forEach(n=>n.remove());}
  return doc.documentElement.outerHTML;
 };
 function digest(str){let a=2166136261,b=0x9e3779b9;for(let i=0;i<str.length;i++){let n=str.charCodeAt(i);a=Math.imul(a^n,16777619);b=Math.imul(b^n,2246822519)}return (a>>>0).toString(16)+(b>>>0).toString(16)}
 const baseline=digest(normalize(window.SLS_ORIGINAL_HTML));
 let busy=false,lastCheck=0,pending=null,dismissed=null,toastTimer;
 function toast(msg){let box=document.getElementById('checkToast');if(!box){box=document.createElement('div');box.id='checkToast';box.setAttribute('role','status');box.style.cssText='position:fixed;left:20px;bottom:20px;z-index:90;background:#253d2e;border:1px solid #d3b77a;color:#f8edcd;padding:12px 16px;border-radius:11px;font-size:12px;box-shadow:0 9px 38px #0009';document.body.appendChild(box)}box.textContent=msg;box.style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.style.display='none',3500)}
 async function check(forced){
  if(busy)return;
  if(!/^https?:$/.test(location.protocol)){if(forced)toast('Kiểm tra cập nhật hoạt động khi game được deploy lên website.');return;}
  busy=true;lastCheck=Date.now();const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const url=new URL(location.href);url.hash='';url.searchParams.delete('_update_release');url.searchParams.delete('_update_check');if(url.pathname.endsWith('/'))url.pathname+='index.html';
   url.searchParams.set('_update_check',String(Date.now()));
   const resp=await fetch(url.href,{cache:'no-store',headers:{'Cache-Control':'no-cache'},signal:controller.signal});
   if(!resp.ok)throw new Error('HTTP '+resp.status);
   const html=await resp.text(),doc=new DOMParser().parseFromString(html,'text/html');
   if(doc.querySelector('meta[name="game-id"]')?.content!==gameId)throw new Error('Không tìm thấy trò chơi tại đường dẫn này');
   const hash=digest(normalize(html));
   if(hash===baseline){if(forced)toast('Đây đã là bản mới nhất của trò chơi.');return;}
   if(hash===dismissed&&!forced)return;
   pending=hash;
   const nextVersion=doc.querySelector('meta[name="game-version"]')?.content||'bản mới';
   info.textContent=nextVersion===ownVersion?'Đã phát hiện thay đổi HTML (không cần tăng số phiên bản).':`Đang dùng: ${ownVersion}   →   Bản mới: ${nextVersion}`;
   modal.classList.add('show');
  }catch(e){if(forced)toast('Chưa kiểm tra được bản mới. Vui lòng thử lại.');console.warn('Game update check:',e)}
  finally{clearTimeout(timeout);busy=false}
 }
 function hide(){modal.classList.remove('show');}
 manual?.addEventListener('click',()=>check(true));
 later?.addEventListener('click',()=>{dismissed=pending;hide()});
 now?.addEventListener('click',()=>{try{window.saveVoiceGame?.()}catch(e){}try{window.speechSynthesis?.cancel()}catch(e){}const url=new URL(location.href);url.searchParams.delete('_update_check');url.searchParams.set('_update_release',pending||Date.now());location.replace(url.href)});
 modal.addEventListener('click',e=>{if(e.target===modal){dismissed=pending;hide()}});
 if(/^https?:$/.test(location.protocol)){
  setTimeout(()=>check(false),3500);
  setInterval(()=>{if(!document.hidden)check(false)},60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastCheck>12000)check(false)});
  window.addEventListener('focus',()=>{if(Date.now()-lastCheck>12000)check(false)});
 }
 window.SongLichSuUpdater={check,version:ownVersion};
})();
