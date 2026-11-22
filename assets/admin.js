/* Halaman admin: login -> kelola akun AM -> unggah Excel -> enkripsi per akun -> publikasi ke GitHub */
window.CAN_EDIT=true;
const LS=localStorage,SS=sessionStorage,log=m=>{const l=$('#log');l.textContent+=m+'\n';l.scrollTop=1e9};
const AL='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',gen=()=>[...crypto.getRandomValues(new Uint8Array(10))].map(x=>AL[x%AL.length]).join('');
let RAW=null,CFG={accounts:[],pending:[]};
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

const te=s=>new TextEncoder().encode(s);
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
let pt;const persist=()=>{clearTimeout(pt);pt=setTimeout(()=>{try{idb((s,ok)=>{s.put({accounts:CFG.accounts,data:RAW,rsa:CFG.rsa,pending:CFG.pending,pubDone:CFG.pubDone},'cfg');ok()}).catch(()=>{})}catch(e){}},300)};
window.onNotes=persist;save=persist;
const mig=l=>(l||[]).map(a=>({name:a.name||'',nik:normNik(a.nik||''),jabatan:a.jabatan||'',pass:a.pass||a.code||'',uk:a.uk||'',fid:a.fid||''}));
function pulih(c){CFG.accounts=mig(c.accounts);CFG.rsa=c.rsa||CFG.rsa||null;CFG.pending=c.pending||[];CFG.pubDone=!!c.pubDone;RAW=c.data||null;if(RAW){startDash(RAW);$('#inf').innerHTML='Data yang tersimpan: <b>'+E(RAW.src)+'</b>. Unggah file Excel baru kalau ingin memperbarui.'}accUI();reqUI();bcUI();$('#pub').disabled=!RAW;stat();chk();panel(RAW?'pratinjau':'unggah')}
(async()=>{try{const c=await idb((s,ok,no)=>{const q=s.get('cfg');q.onsuccess=()=>ok(q.result);q.onerror=no});if(c)pulih(c);else{accUI();reqUI();bcUI()}}catch(e){accUI();reqUI();bcUI()}})();
(async()=>{await new Promise(r=>setTimeout(r,800));if(!CFG.rsa){CFG.rsa=await rsaNew();persist()}})();
$('#restore').onclick=async()=>{const tok=$('#token').value.trim();if(!tok){alert('Isi token GitHub terlebih dahulu (token dipakai sebagai kunci cadangan).');return}
 try{const r=await fetch('data/admin.bin?t='+Date.now());if(!r.ok)throw new Error('Cadangan belum ada di GitHub (kode '+r.status+').');
  pulih(await unseal(await r.arrayBuffer(),tok,'Token berbeda dengan yang dipakai saat publikasi terakhir, cadangan tidak bisa dibuka.'));persist();alert('Cadangan berhasil dipulihkan.')}
 catch(e){alert(e.message)}};
$('#exp').onclick=()=>{const b=new Blob([JSON.stringify({accounts:CFG.accounts,rsa:CFG.rsa,pending:CFG.pending,pubDone:CFG.pubDone,notes:(RAW&&RAW.notes)||{}},null,1)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='cadangan-pengguna.json';a.click()};
$('#imp').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const j=JSON.parse(await f.text());CFG.accounts=mig(j.accounts);if(j.rsa)CFG.rsa=j.rsa;CFG.pending=j.pending||CFG.pending||[];if(j.pubDone!=null)CFG.pubDone=!!j.pubDone;if(RAW&&j.notes)RAW.notes=Object.assign(RAW.notes||{},j.notes);accUI();reqUI();bcUI();persist()}catch(x){alert('File cadangan ini tidak bisa dibaca.')}e.target.value=''};
/* ---- kelola akun AM ---- */
const masterAms=()=>[...new Set((RAW?RAW.master:[]).map(m=>m.am).filter(Boolean))].sort();
const KM=()=>{const m=new Map();((RAW&&RAW.karyawan)||[]).forEach(k=>m.set(k.nik,k));return m};
const hasKar=()=>!!(RAW&&RAW.karyawan&&RAW.karyawan.length);
const bolehMasuk=a=>{if(!hasKar())return true;const k=KM().get(a.nik);return !!(k&&k.aktif)};
function syncAkun(){const m=KM();CFG.accounts.forEach(a=>{const k=m.get(a.nik);if(k){a.name=k.nama;a.jabatan=k.jabatan}})}
function stAkun(a){if(!hasKar())return['n','Daftar karyawan belum diunggah'];const k=KM().get(a.nik);return!k?['y','NIK tidak ada di daftar karyawan']:k.aktif?['g','Karyawan aktif']:['r','Nonaktif · tidak bisa masuk']}
const ukOf=async a=>a.uk?ub64u(a.uk):a.pass?await userKey(a.nik,a.pass):null;
const stPass=a=>a.uk?['g','Password dibuat pengguna']:a.pass?['b','Password dari admin']:['r','Belum punya password'];
function setAs(i,h){const e=$('#as-'+i);if(e)e.innerHTML=h}
function accUI(){syncAkun();const lk=hasKar(),m=KM();
 $('#acc').innerHTML=CFG.accounts.map((a,i)=>{const st=stAkun(a),sp=stPass(a),ro=m.has(a.nik)?' readonly':'',pend=(CFG.pending||[]).some(p=>p.n===a.nik);
  return`<div class="ac"><div><label>Nama lengkap</label><input data-i="${i}" data-k="name" value="${E(a.name)}"${ro}></div><div><label>NIK</label><input data-i="${i}" data-k="nik" inputmode="numeric" value="${E(a.nik)}" autocomplete="off"></div><div><label>Posisi / jabatan</label><input data-i="${i}" data-k="jabatan" value="${E(a.jabatan||'')}"${ro}></div><div><label>Password</label>${a.uk?'<input value="🔒 dibuat sendiri oleh pengguna" disabled>':`<input data-i="${i}" data-k="pass" data-pub="1" value="${E(a.pass)}" placeholder="minimal 8 karakter" autocomplete="off">`}</div><div class="fl wide"><span class="pl ${st[0]}">${st[1]}</span><span class="pl ${sp[0]}">${sp[1]}</span>${pend?'<span class="pl y">Ada permintaan reset</span>':''}<button class="s" data-reset="${i}">↺ Reset password</button><button class="s" data-del="${i}">Hapus</button></div><div class="hint wide" id="as-${i}"></div></div>`}).join('')||'<div class="hint">Belum ada pengguna. Tambahkan lewat formulir di samping.</div>';
 $('#nikdl').innerHTML=((RAW&&RAW.karyawan)||[]).filter(k=>k.aktif&&!CFG.accounts.some(a=>a.nik===k.nik)).map(k=>`<option value="${E(k.nik)}">${E(k.nama)}</option>`).join('');
 $('#nu-name').readOnly=lk;$('#nu-job').readOnly=lk;$('#nu-name').placeholder=lk?'Terisi otomatis dari NIK':'Nama lengkap';$('#nu-job').placeholder=lk?'Terisi otomatis dari NIK':'Posisi / jabatan (opsional)';
 stat();chk()}
/* ---- publikasi satu pengguna langsung ke GitHub (akun aktif begitu ditambahkan/diubah) ---- */
const cfgGH=()=>({repo:$('#repo').value.trim(),branch:$('#branch').value.trim()||'main',token:$('#token').value.trim()});
const ghOK=c=>/^[\w.-]+\/[\w.-]+$/.test(c.repo)&&!!c.token;
async function delFile(cfg,path){const url=`https://api.github.com/repos/${cfg.repo}/contents/${path}`,h=GH(cfg),g=await fetch(url+'?ref='+encodeURIComponent(cfg.branch),{headers:h});if(!g.ok)return;
 await fetch(url,{method:'DELETE',headers:h,body:JSON.stringify({message:'Cabut akses lama',sha:(await g.json()).sha,branch:cfg.branch})})}
async function ensureIndex(cfg){if(!CFG.rsa)CFG.rsa=await rsaNew();if(CFG.pubDone)return;
 await put(cfg,'data/index.json',te(JSON.stringify({updated:new Date().toLocaleString('id-ID'),src:RAW.src,pub:CFG.rsa.pub})),'Aktifkan fitur reset password');CFG.pubDone=true}
async function autoPub(a,oldFid){const cfg=cfgGH();
 if(!RAW)return{ok:false,msg:'Data Excel belum diunggah, jadi akun belum bisa dipublikasikan.'};
 if(!bolehMasuk(a))return{ok:false,msg:'Karyawan ini nonaktif atau tidak ada di daftar karyawan, jadi tidak dipublikasikan.'};
 const uk=await ukOf(a);if(!uk)return{ok:false,msg:'Password belum diisi.'};
 if(!ghOK(cfg))return{ok:false,msg:'Tersimpan di browser ini, tetapi belum aktif. Isi repository dan token di menu Publikasi, lalu klik Publikasi.'};
 if(!navigator.onLine)return{ok:false,msg:'Sedang offline. Klik Publikasi setelah internet tersambung.'};
 try{const fid=await keyId(uk);await put(cfg,'data/u-'+fid+'.bin',await sealK(scope(RAW,['*'],a.name,a.jabatan),uk),'Aktifkan '+a.name);
  if(oldFid&&oldFid!==fid)await delFile(cfg,'data/u-'+oldFid+'.bin');
  a.fid=fid;await ensureIndex(cfg);LS.repo=cfg.repo;LS.branch=cfg.branch;SS.token=cfg.token;persist();
  return{ok:true,msg:'Akun sudah aktif dan bisa langsung dipakai login (GitHub Pages butuh sekitar 1 menit untuk memperbarui).'}}
 catch(e){return{ok:false,msg:'Gagal mengaktifkan: '+e.message}}}
const infoBtns=x=>`<div class="fl" style="margin-top:8px"><button class="s" data-cp="${encodeURIComponent(x)}">Salin info login</button><button class="s" data-wa="${encodeURIComponent(x)}">Kirim lewat WhatsApp</button></div>`;
const infoLogin=(a,judul)=>`${salam()}, ${a.name}. ${judul}\n\nAlamat: ${location.href.split('admin.html')[0]}\nNIK: ${a.nik}\nPassword: ${a.pass}\n\nSilakan masuk dengan data di atas. Kalau lupa password, pakai tab "Reset password" di halaman login.\n\nSalam,\nNurhidayat Turilah\nBranch Fixed Asset Administrator – Alfamidi Branch Palu`;
document.addEventListener('input',e=>{const el=e.target,k=el.dataset&&el.dataset.k;if(!k)return;const a=CFG.accounts[+el.dataset.i];a[k]=k==='nik'?normNik(el.value):k==='pass'?el.value.trim():el.value.trim().replace(/\s+/g,' ');if(k==='pass')a.uk='';persist();chk()});
document.addEventListener('change',async e=>{const el=e.target;if(!(el.dataset&&el.dataset.pub))return;const i=+el.dataset.i,a=CFG.accounts[i];
 if(a.pass.length<8){setAs(i,'❌ Password minimal 8 karakter.');return}
 setAs(i,'⏳ Menyimpan dan mengaktifkan…');const r=await autoPub(a,a.fid);accUI();setAs(i,(r.ok?'✅ ':'⚠ ')+E(r.msg))});
document.addEventListener('click',async e=>{
 const cp=e.target.closest('[data-cp]'),wa=e.target.closest('[data-wa]');if(cp){const x=decodeURIComponent(cp.dataset.cp);navigator.clipboard.writeText(x).then(()=>alert('Info sudah disalin.'),()=>prompt('Salin pesan ini:',x));return}
 if(wa){window.open('https://wa.me/?text='+wa.dataset.wa,'_blank');return}
 const rs=e.target.closest('[data-reset]');if(rs){const i=+rs.dataset.reset,a=CFG.accounts[i];if(!confirm('Buat password baru untuk "'+a.name+'"? Password lama langsung tidak berlaku.'))return;
  const old=a.fid;a.pass=gen();a.uk='';persist();setAs(i,'⏳ Mengaktifkan password baru…');const r=await autoPub(a,old);accUI();setAs(i,(r.ok?'✅ ':'⚠ ')+E(r.msg)+'<br>Password baru: <b>'+E(a.pass)+'</b>'+infoBtns(infoLogin(a,'Password akun Monitoring Switching AC Anda sudah diganti.')));return}
 const b=e.target.closest('[data-del]');if(!b)return;const a=CFG.accounts[+b.dataset.del];
 if(!confirm('Hapus pengguna "'+a.name+'"? Akunnya tidak bisa login lagi.'))return;
 const cfg=cfgGH(),fid=a.fid;CFG.accounts.splice(+b.dataset.del,1);persist();accUI();
 if(fid&&ghOK(cfg)&&navigator.onLine){try{await delFile(cfg,'data/u-'+fid+'.bin');$('#acc-msg').innerHTML='✅ '+E(a.name)+' dihapus dan aksesnya sudah dicabut.'}catch(x){$('#acc-msg').innerHTML='⚠ Terhapus di sini, tetapi gagal mencabut di GitHub. Klik Publikasi untuk membersihkannya.'}}
 else $('#acc-msg').innerHTML=fid?'⚠ '+E(a.name)+' dihapus dari daftar. Aksesnya baru dicabut setelah Anda klik Publikasi.':'✅ '+E(a.name)+' dihapus.'});
$('#bulkpw').onclick=()=>{let n=0;CFG.accounts.forEach(a=>{if(!a.pass&&!a.uk){a.pass=gen();n++}});accUI();persist();$('#acc-msg').innerHTML=n?'✅ Password acak dibuat untuk '+n+' pengguna. Klik <b>Publikasi</b> supaya akun-akun itu aktif, lalu bagikan password masing-masing (tombol Salin daftar pengguna).':'Semua pengguna sudah punya password.'};
$('#cp').onclick=()=>{const t=CFG.accounts.map(a=>a.name+' | NIK: '+a.nik+' | Password: '+(a.uk?'(dibuat pengguna)':a.pass||'(belum ada)')).join('\n');navigator.clipboard.writeText(t).then(()=>alert('Daftar pengguna sudah disalin.'),()=>prompt('Salin daftar ini:',t))};
function validate(){const seen=new Set();
 if(!RAW)return'Unggah file Excel dulu ya, datanya belum ada.';
 if(!CFG.accounts.length)return'Belum ada pengguna. Tambahkan minimal satu pengguna.';
 for(const a of CFG.accounts){if(!a.name)return'Ada pengguna yang belum diberi nama.';if(!a.nik)return'Pengguna "'+a.name+'" belum punya NIK.';
  if(a.nik.length<6)return'NIK "'+a.nik+'" ('+a.name+') terlalu pendek. Periksa lagi ya.';
  if(a.pass&&a.pass.length<8)return'Password "'+a.name+'" minimal 8 karakter.';
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
 try{RAW.set=D.set;const keep=new Set();if(!CFG.rsa)CFG.rsa=await rsaNew();
  for(const a of CFG.accounts){if(!bolehMasuk(a)){log('Dilewati (karyawan nonaktif atau tidak ada di daftar): '+a.name);continue}
   const uk=await ukOf(a);if(!uk){log('Dilewati (belum punya password): '+a.name);continue}
   log('Mengenkripsi dan mengunggah data '+a.name+' …');const fid=await keyId(uk),path='data/u-'+fid+'.bin';keep.add(path);a.fid=fid;
   await put(cfg,path,await sealK(scope(RAW,['*'],a.name,a.jabatan),uk),'Update data '+a.name)}
  await put(cfg,'data/index.json',te(JSON.stringify({updated:new Date().toLocaleString('id-ID'),src:RAW.src,pub:CFG.rsa.pub})),'Update indeks data');CFG.pubDone=true;persist();
  log('Menyimpan cadangan admin (terenkripsi) …');await put(cfg,'data/admin.bin',await seal({accounts:CFG.accounts,data:RAW,rsa:CFG.rsa,pending:CFG.pending},cfg.token),'Simpan cadangan admin');
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
 try{const files={};for(const a of CFG.accounts){if(!bolehMasuk(a))continue;const uk=await ukOf(a);if(uk)files[await keyId(uk)]=b64(await sealK(scope(RAW,['*'],a.name,a.jabatan),uk))}
  const js='window.OFFLINE='+JSON.stringify({updated:new Date().toLocaleString('id-ID'),files})+';',b=new Blob([js],{type:'text/javascript'}),l=document.createElement('a');
  l.href=URL.createObjectURL(b);l.download='offline.js';l.click();alert('offline.js sudah diunduh. Simpan ke folder data/ pada salinan situs di komputer, lalu buka index.html (klik dua kali) tanpa internet.')}
 catch(e){alert(e.message)}$('#offl').disabled=false};
/* ---- formulir tambah pengguna: NIK (nama otomatis) + password awal ---- */
function cariNik(){const nik=normNik($('#nu-nik').value),w=$('#nu-who'),lk=hasKar();
 if(!nik){w.innerHTML='';if(lk){$('#nu-name').value='';$('#nu-job').value=''}return}
 if(!lk){w.innerHTML='<span class="pl n">Daftar karyawan belum diunggah, isi nama secara manual</span>';return}
 const k=KM().get(nik);
 if(!k){$('#nu-name').value='';$('#nu-job').value='';w.innerHTML='<span class="pl y">NIK belum ada di sheet Karyawan Aktif</span>';return}
 $('#nu-name').value=k.nama;$('#nu-job').value=k.jabatan||'';w.innerHTML=k.aktif?'<span class="pl g">Karyawan aktif ditemukan</span>':'<span class="pl r">Karyawan berstatus nonaktif</span>'}
$('#nu-nik').oninput=cariNik;$('#nu-pass').value=gen();$('#nu-gen').onclick=()=>{$('#nu-pass').value=gen()};
$('#nu-add').onclick=async()=>{const nik=normNik($('#nu-nik').value),lk=hasKar(),k=lk&&KM().get(nik),dup=CFG.accounts.find(a=>a.nik===nik),pass=$('#nu-pass').value.trim();
 const name=k?k.nama:$('#nu-name').value.trim().replace(/\s+/g,' '),jabatan=k?k.jabatan:$('#nu-job').value.trim();
 const err=!nik?'NIK belum diisi.':nik.length<6?'NIK terlalu pendek. Periksa lagi ya.':dup?'NIK '+nik+' sudah terdaftar atas nama '+dup.name+'.':lk&&!k?'NIK ini belum ada di sheet Karyawan Aktif. Tambahkan dulu di template Excel, lalu unggah ulang.':lk&&!k.aktif?'Karyawan ini berstatus Nonaktif di template Excel, jadi belum bisa didaftarkan.':!name?'Nama lengkap belum diisi.':pass.length<8?'Password awal minimal 8 karakter.':'';
 if(err){$('#nu-msg').innerHTML='❌ '+E(err);return}
 const a={name,nik,jabatan,pass,uk:'',fid:''};CFG.accounts.push(a);accUI();persist();
 $('#nu-msg').innerHTML='⏳ Mengaktifkan akun…';const r=await autoPub(a,'');accUI();persist();
 $('#nu-msg').innerHTML=(r.ok?'✅ ':'⚠ ')+'<b>'+E(name)+'</b>'+(jabatan?' ('+E(jabatan)+')':'')+' ditambahkan. '+E(r.msg)+infoBtns(infoLogin(a,'Akun Monitoring Switching AC Anda sudah didaftarkan.'));
 $('#nu-name').value='';$('#nu-job').value='';$('#nu-nik').value='';$('#nu-who').innerHTML='';$('#nu-pass').value=gen()};
/* ---- permintaan reset password dari pengguna: baca kode, lalu admin mengonfirmasi ---- */
function reqUI(){const L=CFG.pending||[];
 $('#reqlist').innerHTML=L.length?L.map((p,i)=>{const a=CFG.accounts.find(x=>x.nik===p.n),old=p.o?(p.okOld?'<span class="pl g">✔ password lama cocok</span>':'<span class="pl y">password lama tidak cocok</span>'):'<span class="pl y">tanpa password lama, pastikan identitasnya dulu</span>';
  return`<div class="ac"><div><label>Pengguna</label><input value="${E(a?a.name:'(NIK belum terdaftar)')}" disabled></div><div><label>NIK</label><input value="${E(p.n)}" disabled></div><div class="fl wide">${old}<span class="hint" style="margin:0">${E(new Date(p.t||Date.now()).toLocaleString('id-ID'))}</span><button data-rc="${i}"${a?'':' disabled'}>Konfirmasi reset</button><button class="s" data-rx="${i}">Tolak</button></div></div>`}).join(''):'<div class="hint">Belum ada permintaan reset.</div>';stat()}
$('#reqgo').onclick=async()=>{const codes=[...new Set($('#req').value.split(/\s+/).filter(Boolean))],out=[];let n=0;
 if(!CFG.rsa){$('#reqout').textContent='Kunci pengaman belum siap. Tunggu sebentar lalu coba lagi.';return}
 if(!codes.length){$('#reqout').textContent='Tempel dulu kode permintaannya.';return}
 for(const c of codes){try{const j=await bukaPengajuan(c,CFG.rsa.priv),a=CFG.accounts.find(x=>x.nik===j.n);let okOld=false;
   if(a&&j.o){const cur=await ukOf(a);okOld=!!cur&&await keyId(cur)===j.o}
   CFG.pending=(CFG.pending||[]).filter(p=>p.n!==j.n);CFG.pending.push({n:j.n,k:j.k,o:j.o||'',t:j.t||Date.now(),okOld});n++;
   out.push('✅ Permintaan dari NIK '+E(j.n)+(a?' ('+E(a.name)+')':' (belum terdaftar)')+' dibaca.')}
  catch(e){out.push('❌ Satu kode tidak bisa dibuka ('+E(c.slice(0,10))+'…). Pastikan kodenya utuh dan dibuat setelah publikasi terakhir.')}}
 $('#reqout').innerHTML=out.join('<br>')+(n?'<br>Periksa daftar di atas lalu klik <b>Konfirmasi reset</b> bila identitasnya sudah jelas.':'');if(n){$('#req').value='';persist();reqUI();accUI()}};
document.addEventListener('click',async e=>{const c=e.target.closest('[data-rc]'),x=e.target.closest('[data-rx]');
 if(x){CFG.pending.splice(+x.dataset.rx,1);persist();reqUI();accUI();return}
 if(c){const p=CFG.pending[+c.dataset.rc],a=CFG.accounts.find(z=>z.nik===p.n);if(!a)return;
  const old=a.fid;a.uk=p.k;a.pass='';CFG.pending.splice(+c.dataset.rc,1);persist();$('#reqout').innerHTML='⏳ Mengaktifkan password baru '+E(a.name)+'…';
  const r=await autoPub(a,old);accUI();reqUI();$('#reqout').innerHTML=(r.ok?'✅ ':'⚠ ')+'<b>'+E(a.name)+'</b>: reset dikonfirmasi. '+E(r.msg)}});
/* ===== tampilan admin: ringkasan, navigasi panel, dropzone, daftar periksa ===== */
function msg(h){['#inf','#upmsg'].forEach(i=>{const e=$(i);if(e)e.innerHTML=h})}
function stat(){const s=(id,v)=>{const e=$(id);if(e)e.textContent=v};
 s('#s-src',RAW?String(RAW.src).replace(/\s*\(.*$/,''):'Belum ada data');s('#s-sub',RAW?(String(RAW.src).match(/\((.*)\)/)||[0,''])[1]:'Unggah file Excel');
 s('#s-rows',RAW?RAW.rows.length.toLocaleString('id'):'–');s('#s-toko',RAW?RAW.master.length:'–');s('#s-user',CFG.accounts.length)}
function chk(){const e=validate(),on=navigator.onLine,sk=CFG.accounts.filter(a=>!bolehMasuk(a)).length,np=CFG.accounts.filter(a=>!a.pass&&!a.uk).length,li=(ok,x)=>`<li><svg class="i ${ok?'ok':'warn'}"><use href="#${ok?'i-ok':'i-warn'}"/></svg><span>${x}</span></li>`;
 $('#chk').innerHTML=li(!!RAW,RAW?'Data sudah siap: '+E(RAW.src):'File Excel belum diunggah')+li(!e,e?E(e):'Daftar pengguna sudah benar ('+CFG.accounts.length+' pengguna)')+li(on,on?'Internet tersambung':'Sedang offline, publikasi bisa dilakukan setelah internet tersambung')+(hasKar()?li(!sk,sk?sk+' pengguna nonaktif atau tidak ada di daftar karyawan, jadi dilewati saat publikasi':'Semua pengguna berstatus karyawan aktif'):'')+(np?li(false,np+' pengguna belum punya password, jadi dilewati saat publikasi'):'')}
function panel(p){document.querySelectorAll('[data-pn]').forEach(x=>x.hidden=x.dataset.pn!==p);document.querySelectorAll('[data-p]').forEach(b=>b.classList.toggle('on',b.dataset.p===p))}
document.addEventListener('click',e=>{const b=e.target.closest('[data-p]');if(b)panel(b.dataset.p)});
addEventListener('online',chk);addEventListener('offline',chk);
(()=>{const dz=$('#drop');['dragenter','dragover'].forEach(n=>dz.addEventListener(n,e=>{e.preventDefault();dz.classList.add('over')}));
 ['dragleave','drop'].forEach(n=>dz.addEventListener(n,e=>{e.preventDefault();dz.classList.remove('over')}));
 dz.addEventListener('drop',e=>{const f=e.dataTransfer.files[0];if(f)loadFile(f)})})();
stat();chk();
