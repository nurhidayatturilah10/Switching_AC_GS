/* Pendaftaran service worker, penanda Online/Offline, dan tombol pasang aplikasi */
(function(){
 function upd(){var on=navigator.onLine;document.querySelectorAll('.net').forEach(function(e){e.textContent=on?'● Online':'● Offline';e.className='net pl '+(on?'g':'y');e.title=on?'Terhubung internet':'Tanpa internet: memakai data yang tersimpan di perangkat'})}
 addEventListener('online',upd);addEventListener('offline',upd);upd();
 if('serviceWorker' in navigator&&location.protocol!=='file:')addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})});
 var dp=null;addEventListener('beforeinstallprompt',function(e){e.preventDefault();dp=e;window.PWA_CAN=true;document.querySelectorAll('.pasang').forEach(function(b){b.hidden=false})});
 addEventListener('appinstalled',function(){window.PWA_CAN=false;document.querySelectorAll('.pasang').forEach(function(b){b.hidden=true})});
 document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.pasang');if(b&&dp){dp.prompt();dp=null;b.hidden=true}});
})();
