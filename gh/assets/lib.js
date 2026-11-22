/* Enkripsi & penyaringan data. Data tiap pengguna dienkripsi (AES-256-GCM); kuncinya diturunkan dari NIK
   (PBKDF2, 600.000 putaran) sehingga hanya yang mengetahui NIK terdaftar yang bisa membukanya. */
const _enc=new TextEncoder(),_dec=new TextDecoder(),_IT=310000,_UIT=600000;
const b64u=u=>btoa(String.fromCharCode.apply(null,u)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const ub64u=s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return Uint8Array.from(atob(s),c=>c.charCodeAt(0))};
async function _gz(u8,c){const s=new Blob([u8]).stream().pipeThrough(c?new CompressionStream('gzip'):new DecompressionStream('gzip'));return new Uint8Array(await new Response(s).arrayBuffer())}
/* --- berbasis password: cadangan admin (kunci = token GitHub) --- */
async function _key(pw,salt){const k=await crypto.subtle.importKey('raw',_enc.encode(pw),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:_IT,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function seal(obj,pw){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const body=await _gz(_enc.encode(JSON.stringify(obj)),true),ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await _key(pw,salt),body));
 const out=new Uint8Array(28+ct.length);out.set(salt);out.set(iv,16);out.set(ct,28);return out}
async function unseal(buf,pw,msg){const u=new Uint8Array(buf);let pt;
 try{pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:u.slice(16,28)},await _key(pw,u.slice(0,16)),u.slice(28))}catch(e){throw new Error(msg||'Kode akses salah.')}
 return JSON.parse(_dec.decode(await _gz(new Uint8Array(pt),false)))}
/* --- berbasis NIK --- */
const normNik=n=>String(n).replace(/\s/g,'').toLowerCase();
async function userKey(nik){const k=await crypto.subtle.importKey('raw',_enc.encode('nik|'+normNik(nik)),'PBKDF2',false,['deriveBits']);
 return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:_enc.encode('swac-uk-v3'),iterations:_UIT,hash:'SHA-256'},k,256))}
async function keyId(uk){const h=new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array([...uk,..._enc.encode('swac-id-v3')])));
 return[...h.slice(0,12)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function sealK(obj,uk){const iv=crypto.getRandomValues(new Uint8Array(12)),k=await crypto.subtle.importKey('raw',uk,'AES-GCM',false,['encrypt']);
 const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},k,await _gz(_enc.encode(JSON.stringify(obj)),true))),o=new Uint8Array(12+ct.length);o.set(iv);o.set(ct,12);return o}
async function unsealK(buf,uk,msg){const u=new Uint8Array(buf),k=await crypto.subtle.importKey('raw',uk,'AES-GCM',false,['decrypt']);let pt;
 try{pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:u.slice(0,12)},k,u.slice(12))}catch(e){throw new Error(msg||'NIK belum terdaftar.')}
 return JSON.parse(_dec.decode(await _gz(new Uint8Array(pt),false)))}
function finals(d){const cs=new Set(d.master.map(m=>m.code)),km=new Map(d.kamus);
 return d.dict.map(r=>{const n=String(r||'').toUpperCase().replace(/\s/g,'');return !n?'':cs.has(n)?n:(km.get(n)||'TIDAK DIKENAL')})}
/* ams = daftar nama AM pada Master Toko; ['*'] = semua AM */
function scope(d,ams,label,jabatan){const {karyawan,...d0}=d;d=d0;const all=ams.includes('*'),sa=new Set(ams),master=d.master.filter(m=>all||sa.has(m.am)),cs=new Set(master.map(m=>m.code)),
 am2=[...new Set(master.map(m=>m.am).filter(Boolean))],map=new Map(),dict=[];
 finals(d).forEach((c,i)=>{if(cs.has(c)){map.set(i,dict.length);dict.push(d.dict[i])}});
 const notes={};Object.entries(d.notes||{}).forEach(([k,v])=>{if(cs.has(k)||k==='*'||(k[0]==='@'&&am2.includes(k.slice(1))))notes[k]=v});
 return{...d,notes,label,jabatan:jabatan||'',ams:am2,master,kamus:d.kamus.filter(k=>cs.has(k[1])),dict,rows:d.rows.filter(r=>map.has(r[1])).map(r=>[r[0],map.get(r[1]),r[2],r[3]])}}
