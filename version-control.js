/* SÓNG LỊCH SỬ 1954 — Game update watcher (static hosting)
   Không cần server API, Service Worker hoặc version.json.
   Tự so sánh bản HTML đang chạy với index.html mới trên host.
   Mỗi 60 giây và khi quay lại tab, script gửi yêu cầu no-store có cache buster.
   Khi khác nội dung, hiện popup để người chơi chọn cập nhật hoặc để sau.
*/
(function(){
  'use strict';
  var GAME_ID='song-lich-su-1954';
  var CHECK_INTERVAL=60000;
  var active=false;
  var dismissedSignature=null;
  var latestSignature=null;
  var lastChecked=0;
  var toastTimer=null;
  var pageVersion=document.querySelector('meta[name="game-version"]')?.content || 'không rõ';
  var currentSignature=window.__SLS1954_INITIAL_SIGNATURE;
  var fingerprint=window.__SLS1954_SOURCE_SIGNATURE;
  var modal=document.getElementById('gameUpdateModal');
  var toast=document.getElementById('gameUpdateToast');
  if(typeof currentSignature!=='string'||typeof fingerprint!=='function'||!modal)return;

  var button=document.getElementById('checkUpdateBtn');
  var now=document.getElementById('updateNowBtn');
  var later=document.getElementById('updateLaterBtn');
  var title=document.getElementById('updateHeading');
  var info=document.getElementById('updateVersionInfo');
  var desc=document.getElementById('updateDescription');

  function siteUrl(){
    var url=new URL(window.location.href);
    url.hash='';
    url.searchParams.delete('_sls_check');
    url.searchParams.delete('_sls_release');
    // Site root trên Netlify/GitHub Pages/Cloudflare Pages thường phục vụ index.html.
    if(url.pathname.endsWith('/'))url.pathname+='index.html';
    return url;
  }
  function toastMessage(message){
    if(!toast)return;
    clearTimeout(toastTimer);
    toast.textContent=message;
    toast.classList.add('show');
    toastTimer=setTimeout(function(){toast.classList.remove('show');},3400);
  }
  function hideUpdate(){
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden','true');
    document.body.style.removeProperty('overflow');
  }
  function showUpdate(signature,version){
    latestSignature=signature;
    title.textContent='Có bản cập nhật mới!';
    desc.textContent='Trang trò chơi trên máy chủ đã thay đổi. Cập nhật để nhận giao diện và nội dung mới nhất.';
    if(version&&version!==pageVersion){
      info.textContent='';
      var label=document.createElement('span');label.textContent='Đang dùng: '+pageVersion+'   →   Bản mới: ';
      var value=document.createElement('b');value.textContent=version;
      info.append(label,value);
    }else{
      info.textContent='Đã phát hiện nội dung HTML mới (không cần tăng số phiên bản).';
    }
    modal.setAttribute('aria-hidden','false');
    modal.classList.add('show');
    document.body.style.overflow='hidden';
    now.focus();
  }
  function dismiss(){
    dismissedSignature=latestSignature;
    hideUpdate();
  }
  async function check(manual){
    if(active)return;
    if(!/^https?:$/.test(location.protocol)){
      if(manual)toastMessage('Kiểm tra cập nhật chỉ hoạt động khi deploy lên website http(s).');
      return;
    }
    active=true;
    lastChecked=Date.now();
    var timeoutId;
    var controller=new AbortController();
    try{
      timeoutId=setTimeout(function(){controller.abort();},9000);
      var url=siteUrl();
      url.searchParams.set('_sls_check',String(Date.now()));
      var response=await fetch(url.href,{
        cache:'no-store',
        headers:{'Cache-Control':'no-cache'},
        signal:controller.signal,
        redirect:'follow'
      });
      if(!response.ok)throw new Error('HTTP '+response.status);
      var source=await response.text();
      var remote=new DOMParser().parseFromString(source,'text/html');
      if(remote.querySelector('meta[name="game-id"]')?.content!==GAME_ID){
        throw new Error('Không tìm thấy đúng HTML trò chơi trên host');
      }
      var newSignature=fingerprint(remote);
      if(newSignature===currentSignature){
        if(manual)toastMessage('Đây đã là phiên bản mới nhất của trò chơi.');
        return;
      }
      if(dismissedSignature===newSignature&&!manual)return;
      var version=remote.querySelector('meta[name="game-version"]')?.content||'';
      showUpdate(newSignature,version);
    }catch(err){
      if(manual)toastMessage('Chưa thể kiểm tra cập nhật. Hãy kiểm tra kết nối mạng hoặc bộ nhớ đệm của host.');
      console.warn('[Sóng Lịch Sử] Kiểm tra bản cập nhật thất bại:',err);
    }finally{
      clearTimeout(timeoutId);
      active=false;
    }
  }
  now.addEventListener('click',function(){
    try{window.__SLS1954_SAVE_BEFORE_UPDATE?.();}catch(err){console.warn('Save game:',err)}
    try{if(typeof stopSpeak==='function')stopSpeak();}catch(err){}
    var url=new URL(location.href);
    url.searchParams.delete('_sls_check');
    url.searchParams.set('_sls_release',String(latestSignature||Date.now()).slice(0,16));
    window.location.replace(url.href);
  });
  later.addEventListener('click',dismiss);
  modal.addEventListener('click',function(e){if(e.target===modal)dismiss();});
  document.addEventListener('keydown',function(e){
    if(modal.classList.contains('show')&&e.key==='Escape')dismiss();
  });
  if(button)button.addEventListener('click',function(){check(true);});
  if(/^https?:$/.test(location.protocol)){
    setTimeout(function(){check(false);},3500);
    setInterval(function(){if(!document.hidden)check(false);},CHECK_INTERVAL);
    var whenVisible=function(){
      if(!document.hidden&&Date.now()-lastChecked>12000)check(false);
    };
    document.addEventListener('visibilitychange',whenVisible);
    window.addEventListener('focus',whenVisible);
  }
  window.SongLichSuUpdater={check:check,currentVersion:pageVersion};
})();
