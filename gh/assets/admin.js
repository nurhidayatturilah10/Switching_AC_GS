/* Halaman admin: login -> kelola akun AM -> unggah Excel -> enkripsi per akun -> publikasi ke GitHub */
window.CAN_EDIT=true;
const LS=localStorage,SS=sessionStorage,log=m=>{const l=$('#log');l.textContent+=m+'\n';l.scrollTop=1e9};
const AL='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',gen=()=>[...crypto.getRandomValues(new Uint8Array(10))].map(x=>AL[x%AL.length]).join('');
let RAW=null,CFG={accounts:[]};
const PK=['min','ses','kur','minIn','good','fair','goCount','minPct'];
function buildData(J,names,oldSet,oldKar){
 const need=['Master Toko','Data Form'].filter(n=>!names.includes(n));if(need.length)throw new Error('Sheet tidak ditemukan: '+need.join(', '));
 const set={min:10,ses:27.2,kur:31.1,minIn:2,good:.9,fair:.7,goCount:'TIDAK',minPct:1,...oldSet};
 if(names.includes('Panduan')){const p=J('Panduan');PK.forEach((k,i)=>{const v=p[4+i]&&p[4+i][1];if(v!=null)set[k]=v})}
 const master=J('Master Toko').slice(4).filter(r=>r&&r[1]).map(r=>({code:String(r[1]).replace(/\s/g,'').toUpperCase(),name:r[2]||'',tipe:r[3]||'',area:r[4]||'',ac:r[5]||'',am:r[6]||'',wajib:String(r[7]||'').toUpperCase(),go:typeof r[8]==='number'?r[8]:0}));
 const kamus=names.includes('Kamus Kode')?J('Kamus Kode').slice(4).filter(r=>r&&r[0]&&r[1]).map(r=>[String(r[0]).replace(/\s/g,'').toUpperCase(),String(r[1]).replace(/\s/g,'').toUpperCase()]):[];
 const dict=[],ix=new Map(),rows=[],a=J('Data Form');
 for(let i=1;i<a.length;i++){const r=a[i];if(!r||typeof r[0]!=='number')continue;const b=r[1]==null?'':String(r[1]);let k=ix.get(b);if(k==null){k=dict.length;dict.push(b);ix.set(b,k)}
  const j=String(r[2]||'').trim().toUpperCase();rows.push([Math.round(r[0]*1440),k,j==='PAGI'?1:j==='SORE'?2:0,typeof r[6]==='number'?r[6]:null])}
 let karyawan=oldKar||[];
 if(names.includes('Karyawan Aktif'))karyawan=J('Karyawan Aktif').slice(4).filter(r=>r&&r[1]!=null&&String(r[1]).trim()!=='').map(r=>({nik:normNik(r[1]),nama:String(r[2]||'').replace(/\s+/g,' ').trim(),jabatan:String(r[3]||'').trim(),aktif:!/^non/i.test(String(r[4]||'').trim())})).filter(k=>k.nama);
 return{set,master,kamus,dict,rows,karyawan,src:''}}

const b64=u=>{let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)};
const GH=cfg=>({Authorization:'Bearer '+cfg.token,Accept:'application/vnd.github+json'});
async function put(cfg,path,u8,msg){
 const url=`https://api.github.com/repos/${cfg.repo}/contents/${path}`,h=GH(cfg);let sha;
 const g=await fetch(url+'?ref='+encodeURIComponent(cfg.branch),{headers:h});
 if(g.ok)sha=(await g.json()).sha;else if(g.status!==404)throw new Error('GitHub '+g.status+': periksa nama repo, branch, dan token.');
 const r=await fetch(url,{method:'PUT',headers:h,body:JSON.stringify({message:msg,content:b64(u8),branch:cfg.branch,sha})});
 if(!r.ok)throw new Error('Gagal menulis '+path+' ('+r.status+'): '+((await r.json().catch(()=>({}))).message||''))}
async function cleanup(cfg,keep){const h=GH(cfg),r=await fetch(`https://api.github.com/repos/${cfg.repo}/contents/data?ref=${encodeURIComponent(cfg.branch)}`,{headers:h});if(!r.ok)return;
 for(const f of await r.json()){if(/^(u-[0-9a-f]+|am-.*)\.bin$/.test(f.name)&&!keep.has('data/'+f.name)){
  await fetch(`https://api.github.com/repos/${cfg.repo}/contents/${f.path}`,{method:'DELETE',headers:h,body:JSON.stringify({message:'Hapus akses lama',sha:f.sha,branch:cfg.branch})});log('Dihapus (akses lama): '+f.name)}}}
/* ---- penyimpanan di browser ini (IndexedDB), tanpa login ---- */
const idb=f=>new Promise((ok,no)=>{const q=indexedDB.open('swac-admin',1);q.onupgradeneeded=()=>q.result.createObjectStore('k');q.onsuccess=()=>f(q.result.transaction('k','readwrite').objectStore('k'),ok,no);q.onerror=no});
let pt;const persist=()=>{clearTimeout(pt);pt=setTimeout(()=>{try{idb((s,ok)=>{s.put({accounts:CFG.accounts,data:RAW},'cfg');ok()}).catch(()=>{})}catch(e){}},300)};
window.onNotes=persist;save=persist;
const mig=l=>(l||[]).map(a=>({name:a.name||'',nik:normNik(a.nik||''),jabatan:a.jabatan||''}));
function pulih(c){CFG.accounts=mig(c.accounts);RAW=c.data||null;if(RAW){startDash(RAW);$('#inf').innerHTML='Data yang tersimpan: <b>'+E(RAW.src)+'</b>. Unggah file Excel baru kalau ingin memperbarui.'}accUI();bcUI();$('#pub').disabled=!RAW;stat();chk();panel(RAW?'pratinjau':'unggah')}
(async()=>{try{const c=await idb((s,ok,no)=>{const q=s.get('cfg');q.onsuccess=()=>ok(q.result);q.onerror=no});if(c)pulih(c);else{accUI();bcUI()}}catch(e){accUI();bcUI()}})();
$('#restore').onclick=async()=>{const tok=$('#token').value.trim();if(!tok){alert('Isi token GitHub terlebih dahulu (token dipakai sebagai kunci cadangan).');return}
 try{const r=await fetch('data/admin.bin?t='+Date.now());if(!r.ok)throw new Error('Cadangan belum ada di GitHub (kode '+r.status+').');
  pulih(await unseal(await r.arrayBuffer(),tok,'Token berbeda dengan yang dipakai saat publikasi terakhir, cadangan tidak bisa dibuka.'));persist();alert('Cadangan berhasil dipulihkan.')}
 catch(e){alert(e.message)}};
$('#exp').onclick=()=>{const b=new Blob([JSON.stringify({accounts:CFG.accounts,notes:(RAW&&RAW.notes)||{}},null,1)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='cadangan-akun-am.json';a.click()};
$('#imp').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const j=JSON.parse(await f.text());CFG.accounts=mig(j.accounts);if(RAW&&j.notes)RAW.notes=Object.assign(RAW.notes||{},j.notes);accUI();bcUI();persist()}catch(x){alert('File cadangan ini tidak bisa dibaca.')}e.target.value=''};
/* ---- kelola akun AM ---- */
const masterAms=()=>[...new Set((RAW?RAW.master:[]).map(m=>m.am).filter(Boolean))].sort();
const KM=()=>{const m=new Map();((RAW&&RAW.karyawan)||[]).forEach(k=>m.set(k.nik,k));return m};
const hasKar=()=>!!(RAW&&RAW.karyawan&&RAW.karyawan.length);
const bolehMasuk=a=>{if(!hasKar())return true;const k=KM().get(a.nik);return !!(k&&k.aktif)};
function syncAkun(){const m=KM();CFG.accounts.forEach(a=>{const k=m.get(a.nik);if(k){a.name=k.nama;a.jabatan=k.jabatan}})}
function stAkun(a){if(!hasKar())return['n','Daftar karyawan belum diunggah'];const k=KM().get(a.nik);return!k?['y','NIK tidak ada di daftar karyawan']:k.aktif?['g','Karyawan aktif']:['r','Nonaktif · tidak bisa masuk']}
function accUI(){syncAkun();const lk=hasKar(),m=KM();
 $('#acc').innerHTML=CFG.accounts.map((a,i)=>{const st=stAkun(a),ro=m.has(a.nik)?' readonly':'';return`<div class="ac"><div><label>Nama lengkap</label><input data-i="${i}" data-k="name" value="${E(a.name)}"${ro}></div><div><label>NIK</label><input data-i="${i}" data-k="nik" inputmode="numeric" value="${E(a.nik)}" autocomplete="off"></div><div class="wide"><label>Posisi / jabatan</label><input data-i="${i}" data-k="jabatan" value="${E(a.jabatan||'')}" placeholder="${lk?'terisi otomatis dari daftar karyawan':'opsional'}"${ro}></div><div class="fl"><span class="pl ${st[0]}">${st[1]}</span><button class="s" data-del="${i}">Hapus</button></div></div>`}).join('')||'<div class="hint">Belum ada pengguna. Tambahkan lewat formulir di samping.</div>';
 $('#nikdl').innerHTML=((RAW&&RAW.karyawan)||[]).filter(k=>k.aktif&&!CFG.accounts.some(a=>a.nik===k.nik)).map(k=>`<option value="${E(k.nik)}">${E(k.nama)}</option>`).join('');
 $('#nu-name').readOnly=lk;$('#nu-job').readOnly=lk;$('#nu-name').placeholder=lk?'Terisi otomatis dari NIK':'Nama lengkap';$('#nu-job').placeholder=lk?'Terisi otomatis dari NIK':'Posisi / jabatan (opsional)';
 stat();chk()}
document.addEventListener('input',e=>{const el=e.target,k=el.dataset.k;if(!k)return;const a=CFG.accounts[+el.dataset.i];a[k]=k==='nik'?normNik(el.value):el.value.trim().replace(/\s+/g,' ');persist();chk()});
document.addEventListener('click',e=>{const b=e.target.closest('[data-del]');if(!b)return;
 if(!confirm('Hapus pengguna ini? Aksesnya baru benar-benar dicabut setelah Anda klik Publikasi.'))return;CFG.accounts.splice(+b.dataset.del,1);accUI();persist()});
$('#cp').onclick=()=>{const t=CFG.accounts.map(a=>a.name+' | NIK: '+a.nik).join('\n');navigator.clipboard.writeText(t).then(()=>alert('Daftar pengguna sudah disalin.'),()=>prompt('Salin daftar ini:',t))};
function validate(){const seen=new Set();
 if(!RAW)return'Unggah file Excel dulu ya, datanya belum ada.';
 if(!CFG.accounts.length)return'Belum ada pengguna. Tambahkan minimal satu pengguna.';
 for(const a of CFG.accounts){if(!a.name)return'Ada pengguna yang belum diberi nama.';if(!a.nik)return'Pengguna "'+a.name+'" belum punya NIK.';
  if(a.nik.length<6)return'NIK "'+a.nik+'" ('+a.name+') terlalu pendek. Periksa lagi ya.';
  if(seen.has(a.nik))return'NIK '+a.nik+' terdaftar dua kali. Setiap NIK harus unik.';seen.add(a.nik)}return''}
/* ---- unggah Excel ---- */
$('#file').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)loadFile(f)};
async function loadFile(f){if(typeof XLSX==='undefined'){alert('Pembaca Excel belum termuat. Buka halaman ini sekali saat ada internet; setelahnya tersimpan dan bisa dipakai offline.');return}msg('⏳ Membaca '+E(f.name)+' … (bisa 10–30 detik)');$('#fname').textContent=f.name;
 try{const wb=XLSX.read(await f.arrayBuffer(),{type:'array',sheets:['Panduan','Master Toko','Karyawan Aktif','Kamus Kode','Data Form'],cellFormula:false,cellStyles:false}),keep=RAW&&RAW.notes||{};
  RAW=buildData(n=>XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true}),Object.keys(wb.Sheets),RAW&&RAW.set,RAW&&RAW.karyawan);
  RAW.src=f.name+' (diproses '+new Date().toLocaleString('id-ID')+')';RAW.notes=keep;startDash(RAW);accUI();bcUI();persist();$('#pub').disabled=false;
  msg('✅ File berhasil dibaca: <b>'+RAW.rows.length.toLocaleString('id')+'</b> kiriman form dari <b>'+RAW.master.length+'</b> toko'+(RAW.karyawan&&RAW.karyawan.length?' dan <b>'+RAW.karyawan.filter(k=>k.aktif).length+'</b> karyawan aktif':'')+'. Silakan cek pratinjaunya, atur user, lalu Publikasi.');stat();chk();panel('pratinjau')}
 catch(err){msg('❌ File tidak bisa dibaca: '+E(err.message))}}
/* ---- publikasi ---- */
$('#pub').onclick=async()=>{
 if(!navigator.onLine){alert('Saat ini Anda sedang offline. Datanya aman di perangkat ini; klik Publikasi lagi setelah internet tersambung.');return}
 const cfg={repo:$('#repo').value.trim(),branch:$('#branch').value.trim()||'main',token:$('#token').value.trim()},er=validate();
 if(er){alert(er);return}
 if(!/^[\w.-]+\/[\w.-]+$/.test(cfg.repo)||!cfg.token){alert('Isi nama repository (pemilik/nama-repo) dan token GitHub dulu ya.');return}
 LS.repo=cfg.repo;LS.branch=cfg.branch;SS.token=cfg.token;$('#pub').disabled=true;$('#log').textContent='';
 try{RAW.set=D.set;const keep=new Set();
  for(const a of CFG.accounts){if(!bolehMasuk(a)){log('Dilewati (karyawan nonaktif atau tidak ada di daftar): '+a.name);continue}log('Mengenkripsi dan mengunggah data '+a.name+' …');const uk=await userKey(a.nik),path='data/u-'+await keyId(uk)+'.bin';keep.add(path);
   await put(cfg,path,await sealK(scope(RAW,['*'],a.name,a.jabatan),uk),'Update data '+a.name)}
  await put(cfg,'data/index.json',new TextEncoder().encode(JSON.stringify({updated:new Date().toLocaleString('id-ID'),src:RAW.src})),'Update indeks data');
  log('Menyimpan cadangan admin (terenkripsi) …');await put(cfg,'data/admin.bin',await seal({accounts:CFG.accounts,data:RAW},cfg.token),'Simpan cadangan admin');
  await cleanup(cfg,keep);log('Selesai! GitHub Pages butuh sekitar 1–2 menit sebelum data terbaru muncul di perangkat AM.')}
 catch(err){log('Gagal: '+err.message)}$('#pub').disabled=false};
$('#repo').value=LS.repo||'';$('#branch').value=LS.branch||'main';$('#token').value=SS.token||'';
/* ---- pengumuman ---- */
function bcUI(){const ams=masterAms();
 $('#bt').innerHTML='<option value="*">Semua pengguna</option>'+ams.map(a=>`<option value="@${E(a)}">${E(a)}</option>`).join('');
 const n=(RAW&&RAW.notes)||{},ks=Object.keys(n).filter(k=>k==='*'||k[0]==='@');
 $('#bl').innerHTML=ks.length?ks.map(k=>`<div style="margin:6px 0"><b>${k==='*'?'Semua pengguna':E(k.slice(1))}</b> (${E(n[k].date)}) <button class="s" data-bd="${E(k)}">Hapus</button><br>${E(n[k].text).replace(/\n/g,'<br>')}</div>`).join(''):'Belum ada pengumuman.'}
$('#bs').onclick=()=>{if(!RAW){alert('Unggah file terlebih dahulu.');return}const v=$('#bm').value.trim();if(!v)return;RAW.notes=RAW.notes||{};RAW.notes[$('#bt').value]={text:v,date:new Date().toLocaleDateString('id-ID')};$('#bm').value='';bcUI();persist()};
document.addEventListener('click',e=>{const b=e.target.closest('[data-bd]');if(b&&RAW){delete RAW.notes[b.dataset.bd];bcUI();persist()}});

$('#offl').onclick=async()=>{const er=validate();if(er){alert(er);return}$('#offl').disabled=true;
 try{const files={};for(const a of CFG.accounts){if(!bolehMasuk(a))continue;const uk=await userKey(a.nik);files[await keyId(uk)]=b64(await sealK(scope(RAW,['*'],a.name,a.jabatan),uk))}
  const js='window.OFFLINE='+JSON.stringify({updated:new Date().toLocaleString('id-ID'),files})+';',b=new Blob([js],{type:'text/javascript'}),l=document.createElement('a');
  l.href=URL.createObjectURL(b);l.download='offline.js';l.click();alert('offline.js sudah diunduh. Simpan ke folder data/ pada salinan situs di komputer, lalu buka index.html (klik dua kali) tanpa internet.')}
 catch(e){alert(e.message)}$('#offl').disabled=false};
/* ---- formulir tambah pengguna: cukup NIK dan nama lengkap ---- */
let LASTINFO='';
function cariNik(){const nik=normNik($('#nu-nik').value),w=$('#nu-who'),lk=hasKar();
 if(!nik){w.innerHTML='';if(lk){$('#nu-name').value='';$('#nu-job').value=''}return}
 if(!lk){w.innerHTML='<span class="pl n">Daftar karyawan belum diunggah, isi nama secara manual</span>';return}
 const k=KM().get(nik);
 if(!k){$('#nu-name').value='';$('#nu-job').value='';w.innerHTML='<span class="pl y">NIK belum ada di sheet Karyawan Aktif</span>';return}
 $('#nu-name').value=k.nama;$('#nu-job').value=k.jabatan||'';w.innerHTML=k.aktif?'<span class="pl g">Karyawan aktif ditemukan</span>':'<span class="pl r">Karyawan berstatus nonaktif</span>'}
$('#nu-nik').oninput=cariNik;
$('#nu-add').onclick=()=>{const nik=normNik($('#nu-nik').value),lk=hasKar(),k=lk&&KM().get(nik),dup=CFG.accounts.find(a=>a.nik===nik);
 const name=k?k.nama:$('#nu-name').value.trim().replace(/\s+/g,' '),jabatan=k?k.jabatan:$('#nu-job').value.trim();
 const err=!nik?'NIK belum diisi.':nik.length<6?'NIK terlalu pendek. Periksa lagi ya.':dup?'NIK '+nik+' sudah terdaftar atas nama '+dup.name+'.':lk&&!k?'NIK ini belum ada di sheet Karyawan Aktif. Tambahkan dulu di template Excel, lalu unggah ulang.':lk&&!k.aktif?'Karyawan ini berstatus Nonaktif di template Excel, jadi belum bisa didaftarkan.':!name?'Nama lengkap belum diisi.':'';
 if(err){$('#nu-msg').innerHTML='❌ '+E(err);return}
 CFG.accounts.push({name,nik,jabatan});accUI();persist();
 LASTINFO=`${salam()}, ${name}. Akun Monitoring Switching AC Anda sudah didaftarkan.\n\nCara masuk: buka ${location.href.split('admin.html')[0]} lalu masukkan NIK Anda (${nik}). Tidak perlu password.\n\nSalam,\nNurhidayat Turilah\nBranch Fixed Asset Administrator – Alfamidi Branch Palu`;
 $('#nu-msg').innerHTML='✅ <b>'+E(name)+'</b>'+(jabatan?' ('+E(jabatan)+')':'')+' sudah ditambahkan. Klik <b>Publikasi</b> supaya NIK-nya bisa dipakai untuk masuk.<div class="fl" style="margin-top:8px"><button class="s" id="nu-copy">Salin info untuk pengguna</button><button class="s" id="nu-wa">Kirim lewat WhatsApp</button></div>';
 $('#nu-name').value='';$('#nu-job').value='';$('#nu-nik').value='';$('#nu-who').innerHTML=''};
document.addEventListener('click',e=>{if(e.target.closest('#nu-copy'))navigator.clipboard.writeText(LASTINFO).then(()=>alert('Info sudah disalin.'),()=>prompt('Salin pesan ini:',LASTINFO));
 if(e.target.closest('#nu-wa'))window.open('https://wa.me/?text='+encodeURIComponent(LASTINFO),'_blank')});
/* ===== tampilan admin: ringkasan, navigasi panel, dropzone, daftar periksa ===== */
function msg(h){['#inf','#upmsg'].forEach(i=>{const e=$(i);if(e)e.innerHTML=h})}
function stat(){const s=(id,v)=>{const e=$(id);if(e)e.textContent=v};
 s('#s-src',RAW?String(RAW.src).replace(/\s*\(.*$/,''):'Belum ada data');s('#s-sub',RAW?(String(RAW.src).match(/\((.*)\)/)||[0,''])[1]:'Unggah file Excel');
 s('#s-rows',RAW?RAW.rows.length.toLocaleString('id'):'–');s('#s-toko',RAW?RAW.master.length:'–');s('#s-user',CFG.accounts.length)}
function chk(){const e=validate(),on=navigator.onLine,sk=CFG.accounts.filter(a=>!bolehMasuk(a)).length,li=(ok,x)=>`<li><svg class="i ${ok?'ok':'warn'}"><use href="#${ok?'i-ok':'i-warn'}"/></svg><span>${x}</span></li>`;
 $('#chk').innerHTML=li(!!RAW,RAW?'Data sudah siap: '+E(RAW.src):'File Excel belum diunggah')+li(!e,e?E(e):'Daftar pengguna sudah benar ('+CFG.accounts.length+' pengguna)')+li(on,on?'Internet tersambung':'Sedang offline, publikasi bisa dilakukan setelah internet tersambung')+(hasKar()?li(!sk,sk?sk+' pengguna nonaktif atau tidak ada di daftar karyawan, jadi dilewati saat publikasi':'Semua pengguna berstatus karyawan aktif'):'')}
function panel(p){document.querySelectorAll('[data-pn]').forEach(x=>x.hidden=x.dataset.pn!==p);document.querySelectorAll('[data-p]').forEach(b=>b.classList.toggle('on',b.dataset.p===p))}
document.addEventListener('click',e=>{const b=e.target.closest('[data-p]');if(b)panel(b.dataset.p)});
addEventListener('online',chk);addEventListener('offline',chk);
(()=>{const dz=$('#drop');['dragenter','dragover'].forEach(n=>dz.addEventListener(n,e=>{e.preventDefault();dz.classList.add('over')}));
 ['dragleave','drop'].forEach(n=>dz.addEventListener(n,e=>{e.preventDefault();dz.classList.remove('over')}));
 dz.addEventListener('drop',e=>{const f=e.dataTransfer.files[0];if(f)loadFile(f)})})();
stat();chk();
