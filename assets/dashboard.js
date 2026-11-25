//CORE
const MN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
let D=null,set,MC,byYM,cache={},G={am:'',ar:'',tp:'',ac:'',q:''};
const fm=x=>(!G.am||x.am===G.am)&&(!G.ar||x.area===G.ar)&&(!G.tp||x.tipe===G.tp)&&(!G.ac||String(x.ac)===G.ac)&&(!G.q||((x.code||'')+' '+(x.name||'')).toLowerCase().includes(G.q.toLowerCase()));
function prep(){
 set=D.set;MC=new Map(D.master.map(m=>[m.code,m]));cache={};byYM=new Map();
 const km=new Map(D.kamus),fc=[],unk={};
 D.rows.forEach(r=>{
  let c=fc[r[1]];
  if(c===undefined){const n=String(D.dict[r[1]]||'').toUpperCase().replace(/\s/g,'');c=!n?'':MC.has(n)?n:(km.get(n)||'TIDAK DIKENAL');fc[r[1]]=c}
  const t=r[0]/1440,d=new Date((t-25569)*864e5),ym=d.getUTCFullYear()*100+d.getUTCMonth()+1,day=d.getUTCDate();
  const m=MC.get(c),go=m&&m.go?m.go:0,before=go&&Math.floor(t)<go?1:0,a=Math.abs(r[3]),ses=r[2];
  const valid=r[3]!=null&&a>=set.min&&!(before&&set.goCount==='TIDAK')&&ses>0;
  if(c==='TIDAK DIKENAL'){const k=D.dict[r[1]];unk[k]=(unk[k]||0)+1}
  const o={t,c,before,ses,valid,cat:valid?(a<=set.ses?0:a<=set.kur?1:2):-1,per:day<=15?0:1};
  if(!byYM.has(ym))byYM.set(ym,[]);byYM.get(ym).push(o);
 });
 D.unk=Object.entries(unk).sort((a,b)=>b[1]-a[1]).slice(0,15);
}
const mean=a=>{a=a.filter(x=>x!=null);return a.length?a.reduce((s,x)=>s+x,0)/a.length:null};
function calc(y,m){
 const key=(y*100+m)+'|'+JSON.stringify(G);if(cache[key])return cache[key];
 const rs=byYM.get(y*100+m)||[],dim=new Date(Date.UTC(y,m,0)).getUTCDate(),U=dd=>Date.UTC(y,m-1,dd)/864e5+25569;
 const d15=U(15),eom=U(dim),first=U(1);
 let last=0;rs.forEach(r=>{if(r.t>last)last=r.t});
 const ld=last?new Date((last-25569)*864e5).getUTCDate():0;
 const st=[!last?'BELUM MULAI':ld>=16?'SELESAI':'BERJALAN',ld<=15?'BELUM MULAI':ld>=dim?'SELESAI':'BERJALAN'];
 const on=st.map(s=>s!=='BELUM MULAI');
 const C=new Map();D.master.forEach(x=>C.set(x.code,{a:[0,0,0,0],sub:0,bef:0,v:0,s:0,k:0,t:0}));
 const ds=[[0,0,0],[0,0,0]];let unkN=0;
 rs.forEach(r=>{
  if(r.c==='TIDAK DIKENAL')unkN++;
  const c=C.get(r.c);if(c){c.sub++;c.bef+=r.before}
  if(r.valid){if(fm(MC.get(r.c)||{}))ds[r.ses-1][r.cat]++;if(c){c.a[r.per*2+r.ses-1]++;c.v++;c[['s','k','t'][r.cat]]++}}
 });
 const lb=['P1 Pagi','P1 Sore','P2 Pagi','P2 Sore'],S=[];
 D.master.forEach(x=>{
  if(x.wajib!=='YA'||!fm(x))return;
  const c=C.get(x.code),go=x.go,w=[!go||go<=d15,!go||go<=eom];
  const q=[0,1,2,3].map(i=>{const p=i>>1;return !on[p]?'-':!w[p]?'BELUM GO':c.a[i]>=set.minIn?'SUDAH':c.a[i]>0?'KURANG':'BELUM'});
  const ps=[0,1].map(p=>{const a=q[p*2],b=q[p*2+1];return a==='-'||a==='BELUM GO'?a:a==='SUDAH'&&b==='SUDAH'?'LENGKAP':a==='BELUM'&&b==='BELUM'?'BELUM SAMA SEKALI':'BELUM LENGKAP'});
  const prio=Math.max(...ps.map((s,p)=>s==='BELUM SAMA SEKALI'?3:s==='BELUM LENGKAP'?(q[p*2]==='BELUM'||q[p*2+1]==='BELUM'?2:1):0));
  const gs=!go?'GO tidak diketahui':go>eom?'BELUM GO':go>=first?'GO bulan ini':'Sudah GO';
  let ket=q.map((s,i)=>['SUDAH','-','BELUM GO'].includes(s)?'':lb[i]+': '+(s==='BELUM'?'belum mengisi':'baru '+c.a[i]+'×')).filter(Boolean).join('; ');
  if(!ket)ket=q.every(s=>s==='-'||s==='BELUM GO')?(gs==='BELUM GO'?'Belum GO':'Periode belum dimulai'):'Sudah lengkap';
  const tn=gs==='BELUM GO'?'BELUM GO':c.v===0?'BELUM ADA INPUT':c.s/c.v>=set.minPct-1e-7?'SESUAI':'BELUM SESUAI';
  S.push({...x,q,w,prio,ket,gs,c,tn,ps:c.v?c.s/c.v:null});
 });
 const agg=arr=>[0,1,2,3].map(i=>{const p=i>>1;if(!on[p])return{n:0,su:0,ku:0,be:0,p:null};
  const W=arr.filter(s=>s.w[p]),f=k=>W.filter(s=>s.q[i]===k).length,n=W.length,su=f('SUDAH');
  return{n,su,ku:f('KURANG'),be:f('BELUM'),p:n?su/n:null}});
 const grp=(f)=>[...new Set(S.map(s=>s[f]))].map(k=>{const A=S.filter(s=>s[f]===k),g=agg(A);
  return{k,n:A.filter(s=>s.w[on[1]?1:0]).length,g,avg:mean([g[1].p,g[3].p]),tdk:A.filter(s=>s.prio>0).length,
   sh:[['SESUAI'],['BELUM SESUAI'],['BELUM ADA INPUT']].map(([z])=>A.filter(s=>s.tn===z).length),tid:A.filter(s=>s.c.t>0).length}}).sort((a,b)=>b.n-a.n);
 const tot=agg(S);
 const R={y,m,st,on,last,ld,dim,S,tot,unkN,ds,form:rs.length,
  wj:S.filter(s=>s.w[on[1]?1:0]).length,AM:grp('am'),AR:grp('area'),
  tdk:S.filter(s=>s.prio>0).length,tinggi:S.filter(s=>s.prio===3).length,
  sh:['SESUAI','BELUM SESUAI','BELUM ADA INPUT','BELUM GO'].map(z=>S.filter(s=>s.tn===z).length),
  avgP:mean([tot[0].p,tot[2].p]),avgS:mean([tot[1].p,tot[3].p])};
 return cache[key]=R;
}
//UI
const $=s=>document.querySelector(s),M3=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const pct=v=>v==null?'–':(v*100).toFixed(1).replace('.',',')+'%';
const cls=v=>v==null?'n':v>set.good?'g':v>set.fair?'y':'r';
const pl=v=>`<span class="pl ${cls(v)}">${pct(v)}</span>`;
const fd=s=>{if(!s)return'–';const d=new Date((s-25569)*864e5);return d.getUTCDate()+' '+M3[d.getUTCMonth()]+' '+d.getUTCFullYear()};
const fdt=s=>{const d=new Date((s-25569)*864e5),z=n=>String(n).padStart(2,'0');return d.getUTCDate()+' '+MN[d.getUTCMonth()]+' '+d.getUTCFullYear()+', '+z(d.getUTCHours())+':'+z(d.getUTCMinutes())};
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tbl=(h,r)=>`<div class="sc"><table><thead><tr>${h.map(x=>`<th data-sort>${x}</th>`).join('')}</tr></thead><tbody>${r.join('')||`<tr><td colspan="${h.length}">Belum ada data yang cocok.</td></tr>`}</tbody></table></div>`;
const qc={SUDAH:'g',KURANG:'y',BELUM:'r','-':'n','BELUM GO':'n'};
const chip=(s,i)=>`<span class="ch ${qc[s.q[i]]}" title="${s.q[i]}">${s.q[i]==='-'||s.q[i]==='BELUM GO'?'–':s.c.a[i]}</span>`;
const prn=['Aman','Rendah','Sedang','Tinggi'],prc=['g','b','y','r'];
const th=['SESUAI','BELUM SESUAI','BELUM ADA INPUT','BELUM GO'],thc={SESUAI:'g','BELUM SESUAI':'r','BELUM ADA INPUT':'y','BELUM GO':'n'};
let tab='ringkas',Y,Mo,F={p:'',am:'',ar:'',q:'',ts:''};
const tabs=[['ringkas','Ringkasan'],['toko','Daftar Toko'],['tindak','Perlu Ditindaklanjuti'],['suhu','Kesesuaian Suhu'],['go','Toko GO'],['aturan','Aturan & Data']];
const lab=['Pagi Periode 1','Sore Periode 1','Pagi Periode 2','Sore Periode 2'];
function kpi(l,v,sub,c,p){return`<div class="k ${c||''}"><span>${l}</span><strong>${v}</strong>${p!=null?`<div class="bar"><i style="width:${Math.min(100,p*100)}%"></i></div>`:''}<em>${sub||''}</em></div>`}
function trend(){
 const pts=[];for(let m=1;m<=12;m++){if(byYM.has(Y*100+m)){const r=calc(Y,m);pts.push({m,p:mean([r.tot[0].p,r.tot[2].p]),s:mean([r.tot[1].p,r.tot[3].p])})}}
 if(!pts.length)return'';const W=640,H=200,x=m=>40+(m-1)*(W-60)/11,y=v=>H-24-v*(H-44);
 const line=(k,c)=>{const a=pts.filter(p=>p[k]!=null);return`<polyline fill="none" stroke="${c}" stroke-width="2.5" points="${a.map(p=>x(p.m)+','+y(p[k])).join(' ')}"/>`+a.map(p=>`<circle cx="${x(p.m)}" cy="${y(p[k])}" r="3.5" fill="${c}"><title>${MN[p.m-1]}: ${pct(p[k])}</title></circle>`).join('')};
 return`<div class="card"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Tren persentase jalan per bulan">${[0,.25,.5,.75,1].map(v=>`<line x1="40" x2="${W-20}" y1="${y(v)}" y2="${y(v)}" stroke="currentColor" opacity=".12"/><text x="4" y="${y(v)+4}">${v*100}%</text>`).join('')}${MN.map((n,i)=>`<text x="${x(i+1)}" y="${H-6}" text-anchor="middle">${M3[i]}</text>`).join('')}${line('p','#6366f1')}${line('s','#14b8a6')}</svg><div class="lg"><span><i style="background:#6366f1"></i>Rata-rata % jalan PAGI</span><span><i style="background:#14b8a6"></i>Rata-rata % jalan SORE</span></div></div>`}
function trendTbl(){const r=[];for(let m=1;m<=12;m++)if(byYM.has(Y*100+m)){const R=calc(Y,m),tw=R.sh[0]+R.sh[1];r.push(`<tr><td>${MN[m-1]}</td><td>${R.wj}</td><td>${pl(mean([R.tot[0].p,R.tot[2].p]))}</td><td>${pl(mean([R.tot[1].p,R.tot[3].p]))}</td><td>${R.tdk}</td><td>${R.tinggi}</td><td>${pl(tw?R.sh[0]/tw:null)}</td></tr>`)}return'<div style="height:10px"></div>'+tbl(['Bulan','Toko Wajib','Rata² % PAGI','Rata² % SORE','Perlu Ditindak','Prioritas TINGGI','% Toko SESUAI suhu'],r)}
function gtab(t,rows,f){return tbl([t,'Toko wajib','Pagi P1','Sore P1','Pagi P2','Sore P2','Rata-rata sore','Perlu ditindak'],
 rows.map(r=>`<tr><td>${E(r.k)}</td><td>${r.n}</td>${r.g.map(g=>`<td>${pl(g.p)}</td>`).join('')}<td>${pl(r.avg)}</td><td>${r.tdk?`<b>${r.tdk}</b>`:0}</td></tr>`))}
function ringkas(R){
 if(!R.last)return`<div class="card">Belum ada data form untuk bulan ini.</div>`;
 const T=R.tot,al=[];
 al.push(`Dari <b>${R.wj}</b> toko yang wajib dicek, rata-rata kepatuhan sesi pagi <b>${pct(R.avgP)}</b> dan sesi sore <b>${pct(R.avgS)}</b>.`);
 if(R.avgS!=null&&R.avgP!=null&&R.avgS<R.avgP)al.push(`Sesi sore masih tertinggal <b>${((R.avgP-R.avgS)*100).toFixed(1).replace('.',',')} poin</b> dibanding sesi pagi.`);
 const lo=(a,n)=>{const z=a.filter(r=>r.avg!=null).sort((p,q)=>p.avg-q.avg)[0];return z&&a.length>1?`Rata-rata sesi sore paling rendah ada di ${n} <b>${E(z.k)}</b> (${pct(z.avg)}).`:''};
 al.push(lo(R.AM,'AM'));al.push(lo(R.AR,'area'));
 al.push(R.tdk?`Ada <b>${R.tdk}</b> toko yang perlu ditindaklanjuti${R.tinggi?`, dan <b>${R.tinggi}</b> di antaranya berprioritas tinggi karena belum mengisi sama sekali di salah satu periode`:''}.`:'Tidak ada toko yang perlu ditindaklanjuti. Kerja bagus!');
 const dv=R.ds[0].concat(R.ds[1]).reduce((a,b)=>a+b,0);
 if(dv)al.push(`Dari ${dv.toLocaleString('id')} input suhu yang valid, <b>${pct((R.ds[0][0]+R.ds[1][0])/dv)}</b> masuk kategori sesuai.`);
 if(R.unkN)al.push(`⚠ Ada <b>${R.unkN}</b> kiriman form bulan ini dengan kode toko yang tidak dikenali. Daftarnya ada di tab Aturan &amp; Data supaya bisa dipetakan.`);
 const sh=R.sh,tw=sh[0]+sh[1];
 const sbar=(a)=>{const s=a[0]+a[1]+a[2]||1;return`<div class="st">${[['var(--g)',a[0]],['var(--r)',a[1]],['var(--nb)',a[2]]].map(([c,v])=>`<i style="width:${v/s*100}%;background:${c}" title="${v}"></i>`).join('')}</div>`};
 const dsr=[['Pagi',R.ds[0]],['Sore',R.ds[1]]].map(([n,a])=>{const s=a[0]+a[1]+a[2];return`<tr><td>${n}</td><td>${s}</td><td>${a[0]}</td><td>${a[1]}</td><td>${a[2]}</td><td>${pl(s?a[0]/s:null)}</td></tr>`});
 return`<h2>Gambaran umum</h2><div class="kp k4">
 ${kpi('Toko wajib cek',R.wj,'yang sudah GO')}
 ${kpi('Perlu ditindaklanjuti',R.tdk,R.tdk?'toko belum memenuhi target':'semua toko sudah baik',R.tdk?'y':'g')}
 ${kpi('Prioritas tinggi',R.tinggi,R.tinggi?'toko belum mengisi sama sekali':'tidak ada yang kosong total',R.tinggi?'r':'g')}
 ${kpi('Toko dengan suhu sesuai',tw?pct(sh[0]/tw):'–',sh[0]+' sesuai, '+sh[1]+' belum sesuai',tw&&sh[0]/tw>=.8?'g':'y')}</div>
 ${R.on.some(Boolean)?`<h2>Kepatuhan pengisian</h2><div class="kp k${R.on[1]?4:2}">${[0,1,2,3].filter(i=>R.on[i>>1]).map(i=>kpi(['Pagi, Periode 1','Sore, Periode 1','Pagi, Periode 2','Sore, Periode 2'][i],pct(T[i].p),T[i].su+' dari '+T[i].n+' toko sudah mengisi',cls(T[i].p),T[i].p)).join('')}</div>`:''}
 <div class="hint" style="margin-top:10px">Warna hijau berarti kepatuhan di atas ${pct(set.good)}, kuning di atas ${pct(set.fair)}, dan merah ${pct(set.fair)} ke bawah. Periode 1 mencakup tanggal 1–15, Periode 2 tanggal 16 sampai akhir bulan. Sebuah toko dianggap sudah mengisi kalau input valid pada sesi itu minimal ${set.minIn}×.</div>
 <h2>Analisis otomatis</h2><div class="card"><ul class="an" style="margin:0;padding-left:18px">${al.filter(Boolean).map(a=>`<li>${a}</li>`).join('')}</ul></div>
 <h2>Per periode dan sesi</h2>${tbl(['Periode dan sesi','Toko wajib','Sudah (min. '+set.minIn+'×)','Kurang','Belum','Kepatuhan','Penilaian'],
  [0,1,2,3].map(i=>{const t=T[i],on=R.on[i>>1];return`<tr><td>${lab[i]}</td><td>${on?t.n:'–'}</td><td>${on?t.su:'–'}</td><td>${on?t.ku:'–'}</td><td>${on?t.be:'–'}</td><td>${pl(t.p)}</td><td>${!on?'Belum dimulai':t.p>set.good?'Baik':t.p>set.fair?'Perlu ditingkatkan':'Perlu perhatian khusus'}</td></tr>`}))}
 <h2>Per AM (Area Manager)</h2>${gtab('AM',R.AM)}
 <h2>Per area / kabupaten</h2>${gtab('Area',R.AR)}
 <h2>Kesesuaian suhu bulan ini</h2><div class="two"><div>${tbl(['Sesi','Input valid','Sesuai','Kurang sesuai','Tidak sesuai','% sesuai'],dsr)}</div>
 <div class="card"><b>Jumlah toko menurut status suhu</b><div style="margin:8px 0">${sbar(sh)}</div><div class="lg"><span><i style="background:var(--g)"></i>Sesuai ${sh[0]}</span><span><i style="background:var(--r)"></i>Belum sesuai ${sh[1]}</span><span><i style="background:var(--nb)"></i>Belum ada input ${sh[2]}</span></div>
 <div class="hint">Sesuai: sampai ${set.ses}°C. Kurang sesuai: sampai ${set.kur}°C. Tidak sesuai: di atas itu.</div></div></div>
 <h2>Kesesuaian suhu per AM</h2>${tbl(['AM','Toko wajib','Toko sesuai','Belum sesuai','Belum ada input','% toko sesuai','Toko dengan input tidak sesuai'],R.AM.map(r=>`<tr><td>${E(r.k)}</td><td>${r.sh.reduce((a,b)=>a+b,0)}</td><td>${r.sh[0]}</td><td>${r.sh[1]}</td><td>${r.sh[2]}</td><td>${pl(r.sh[0]+r.sh[1]?r.sh[0]/(r.sh[0]+r.sh[1]):null)}</td><td>${r.tid}</td></tr>`))}
 <h2>Tren sepanjang ${Y}</h2>${trend()}${trendTbl()}<div class="hint">Tip: klik judul kolom untuk mengurutkan; klik baris toko di tab Ditindak / Suhu untuk melihat riwayat bulanannya; gunakan Filter AM / Area / Tipe di atas untuk memfokuskan seluruh dashboard.</div>`}
function tindak(R){
 let L=R.S.filter(s=>s.prio>0&&(!F.p||prn[s.prio]===F.p)&&(!F.am||s.am===F.am)&&(!F.ar||s.area===F.ar)&&(!F.q||(s.code+s.name).toLowerCase().includes(F.q.toLowerCase())));
 L.sort((a,b)=>b.prio-a.prio||a.area.localeCompare(b.area)||a.name.localeCompare(b.name));
 window.LAST_L=L;window.LAST_R=R;return fl(R,1)+recapBtn()+`<div class="hint">${L.length} toko. <b>Tinggi</b>: ada periode yang sama sekali belum diisi. <b>Sedang</b>: ada sesi yang belum diisi. <b>Rendah</b>: baru terisi 1 kali. Angka di kotak adalah jumlah input valid: hijau sudah cukup, kuning masih kurang, merah belum ada, abu-abu berarti belum GO atau periodenya belum dimulai.</div>`+
 tbl(['No','Prioritas','Kode','Nama Toko','Area','AC','AM','Pagi P1','Sore P1','Pagi P2','Sore P2','Keterangan','Pesan Admin'],L.map((s,i)=>`<tr data-code="${E(s.code)}"><td>${i+1}</td><td><span class="pl ${prc[s.prio]}">${prn[s.prio]}</span></td><td>${E(s.code)}</td><td>${E(s.name)}</td><td>${E(s.area)}</td><td>${E(s.ac)}</td><td>${E(s.am)}</td>${[0,1,2,3].map(i=>`<td>${chip(s,i)}</td>`).join('')}<td>${E(s.ket)}</td><td>${msgCell(s)}</td></tr>`))}
function fl(R,k){
 const am=[...new Set(R.S.map(s=>s.am))].sort(),ar=[...new Set(R.S.map(s=>s.area))].sort();
 const o=(a,v)=>`<option value="">Semua</option>`+a.map(x=>`<option value="${E(x)}"${x===v?' selected':''}>${E(TL[x]||x)}</option>`).join('');
 return`<div class="fl">${k?`<select data-f="p">${o(['Tinggi','Sedang','Rendah'],F.p)}</select>`:`<select data-f="ts">${o(th.slice(0,3),F.ts)}</select>`}<select data-f="am">${o(am,F.am)}</select><select data-f="ar">${o(ar,F.ar)}</select></div>`}
function suhu(R){
 const ord={'BELUM SESUAI':0,SESUAI:1,'BELUM ADA INPUT':2,'BELUM GO':3};
 let L=R.S.filter(s=>(!F.ts||s.tn===F.ts)&&(!F.am||s.am===F.am)&&(!F.ar||s.area===F.ar)&&(!F.q||(s.code+s.name).toLowerCase().includes(F.q.toLowerCase())));
 L.sort((a,b)=>ord[a.tn]-ord[b.tn]||(b.c.t>0)-(a.c.t>0)||(a.ps??2)-(b.ps??2)||a.name.localeCompare(b.name));
 const kt=s=>s.tn==='BELUM SESUAI'?(s.c.t?s.c.t+' input tidak sesuai, ':'')+s.c.k+' kurang sesuai (dari '+s.c.v+' input)':s.tn==='SESUAI'?(s.c.k+s.c.t?Math.round(s.ps*100)+'% input sesuai':'Semua '+s.c.v+' input sudah sesuai'):s.tn==='BELUM ADA INPUT'?'Belum ada input suhu yang valid':'Belum GO';
 return fl(R,0)+`<div class="hint">${L.length} toko. Sebuah toko dianggap sesuai kalau minimal ${pct(set.minPct)} input suhunya bulan ini masuk kategori sesuai.</div>`+
 tbl(['No','Status suhu','Kode','Nama toko','Area','AM','Input valid','Sesuai','Kurang','Tidak','% sesuai','Keterangan'],L.map((s,i)=>`<tr data-code="${E(s.code)}"><td>${i+1}</td><td><span class="pl ${thc[s.tn]}">${TL[s.tn]||s.tn}</span></td><td>${E(s.code)}</td><td>${E(s.name)}</td><td>${E(s.area)}</td><td>${E(s.am)}</td><td>${s.c.v}</td><td>${s.c.s}</td><td>${s.c.k}</td><td>${s.c.t}</td><td>${pct(s.ps)}</td><td>${kt(s)}</td></tr>`))}
function go(R){
 const L=R.S.filter(s=>s.gs==='BELUM GO'||s.gs==='GO bulan ini'||s.c.bef>0).sort((a,b)=>a.go-b.go);
 return`<div class="hint">${L.length} toko: yang GO bulan ini, yang belum GO sampai akhir bulan, atau yang sudah mengisi sebelum tanggal GO. Toko yang belum GO tidak dihitung sebagai belum mengisi. Pengisian sebelum tanggal GO ${set.goCount==='TIDAK'?'tidak dihitung':'tetap dihitung'}.</div>`+
 tbl(['No','Kode','Nama toko','Area','AM','Tanggal GO','Status GO','Kiriman form','Sebelum GO','Keterangan'],L.map((s,i)=>`<tr><td>${i+1}</td><td>${E(s.code)}</td><td>${E(s.name)}</td><td>${E(s.area)}</td><td>${E(s.am)}</td><td>${fd(s.go)}</td><td><span class="pl ${s.gs==='BELUM GO'?'n':'b'}">${s.gs}</span></td><td>${s.c.sub}</td><td>${s.c.bef}</td><td>${s.c.bef?'Ada '+s.c.bef+' pengisian sebelum tanggal GO':''}</td></tr>`))}
const SF=[['min','Suhu terendah yang dianggap valid (°C)'],['ses','Batas suhu “sesuai” (°C)'],['kur','Batas suhu “kurang sesuai” (°C)'],['minIn','Minimal pengisian per sesi dalam satu periode'],['good','Kepatuhan dinilai baik jika di atas (0–1)'],['fair','Kepatuhan dinilai cukup jika di atas (0–1)'],['goCount','Hitung pengisian sebelum tanggal GO?'],['minPct','Toko dianggap sesuai jika persentase input sesuai minimal (0–1)']];
function aturan(){
 return`<div class="card"><b>Cara memperbarui data</b><p style="margin:6px 0 0">Buka menu <b>Unggah Data</b>, pilih file Excel yang sudah diisi, periksa pratinjaunya, lalu klik <b>Publikasi</b> supaya semua AM melihat data terbaru.</p><div class="hint">Sumber data saat ini: <b>${E(D.src)}</b> · ${D.rows.length.toLocaleString('id')} kiriman form · ${D.master.length} toko.</div></div>
 <h2>Aturan perhitungan</h2><div class="hint">Sama dengan yang ada di sheet Panduan pada template Excel.</div><div class="card"><div class="set">${SF.map(([k,l])=>`<div><label>${l}${k==='goCount'?`<select data-s="${k}"><option${set[k]==='TIDAK'?' selected':''}>TIDAK</option><option${set[k]==='YA'?' selected':''}>YA</option></select>`:`<input type="number" step="any" data-s="${k}" value="${set[k]}">`}</label></div>`).join('')}</div></div>
 <h2>Kode toko yang tidak dikenali</h2>${D.unk.length?`<div class="hint">Tambahkan pemetaannya di sheet <i>Kamus Kode</i> pada file template, lalu unggah ulang.</div>`+tbl(['Kode yang diketik','Muncul (kali)'],D.unk.map(([k,v])=>`<tr><td>${E(k)}</td><td>${v}</td></tr>`)):'<div class="card">Semua kode toko dikenali.</div>'}`}
function render(){
 const R=calc(Y,Mo);
 $('#inf').innerHTML=!R.last?'Belum ada data form untuk bulan ini.':`Data terakhir masuk <b>${fdt(R.last)}</b> · Periode 1 <b>${SN[R.st[0]]}</b> · Periode 2 <b>${SN[R.st[1]]}</b> · ${R.form.toLocaleString('id')} kiriman bulan ini`;
 $('#tb').innerHTML=tabs.map(([k,l])=>`<button class="${k===tab?'on':''}" data-t="${k}">${l}${k==='tindak'&&R.tdk?`<span class="cnt">${R.tdk}</span>`:''}</button>`).join('');
 $('#mn').innerHTML={ringkas,tindak,suhu,go,aturan,toko:daftarToko,setelan}[tab](R);post(document);
}
function fill(){
 const ys=[...new Set([...byYM.keys()].map(k=>k>>0).map(k=>Math.floor(k/100)))].sort();
 $('#thn').innerHTML=ys.map(y=>`<option${y===Y?' selected':''}>${y}</option>`).join('');
 const op=(k,l,a)=>`<div><label>${l}</label><select data-g="${k}"><option value="">Semua</option>${a.map(x=>`<option${x===G[k]?' selected':''}>${E(x)}</option>`).join('')}</select></div>`,u=f=>[...new Set(D.master.filter(x=>x.wajib==='YA').map(x=>String(x[f]||'')))].filter(Boolean).sort();
 $('#gf').innerHTML=`<div><label>Cari toko (kode / nama)</label><input data-g="q" type="search" placeholder="Ketik kode atau nama toko" value="${E(G.q)}" autocomplete="off"></div>`+op('am','Filter AM',u('am'))+op('ar','Filter Area / Kabupaten',u('area'))+op('tp','Tipe toko',u('tipe'))+op('ac','Area Coordinator (AC)',u('ac'))+'<div class="gc"><span id="gc"></span><button class="s" data-greset>Reset filter</button></div>';
 $('#bln').innerHTML=MN.map((n,i)=>`<option value="${i+1}"${i+1===Mo?' selected':''}>${n}</option>`).join('');
}
function post(root){root.querySelectorAll('table').forEach(t=>{if(!t.tHead)return;const hs=[...t.tHead.rows[0].cells].map(c=>c.textContent.replace(/\s+/g,' ').trim());t.querySelectorAll('tbody tr').forEach(r=>[...r.cells].forEach((c,i)=>c.dataset.l=hs[i]||''))})}
function detail(code){const sv=G;G={am:'',ar:'',tp:'',ac:'',q:''};const x=MC.get(code),rows=[];
 for(let m=1;m<=12;m++)if(byYM.has(Y*100+m)){const s=calc(Y,m).S.find(z=>z.code===code);if(s)rows.push(`<tr><td>${MN[m-1]}</td>${[0,1,2,3].map(i=>`<td>${chip(s,i)}</td>`).join('')}<td>${s.c.v}</td><td>${s.c.t}</td><td>${pl(s.ps)}</td><td><span class="pl ${thc[s.tn]}">${TL[s.tn]||s.tn}</span></td></tr>`)}
 G=sv;const d=document.createElement('div');d.className='mod';d.innerHTML=`<div><button class="s" style="float:right" data-x>Tutup ✕</button><h2 style="margin-top:0">${E(x.name)} <small>(${E(x.code)})</small></h2><div class="hint">${E(x.area)} · AM ${E(x.am)} · AC ${E(x.ac)} · GO ${fd(x.go)} · riwayat ${Y} (angka di kotak = jumlah input valid)</div>${noteHtml(code)}`+tbl(['Bulan','Pagi P1','Sore P1','Pagi P2','Sore P2','Input valid','Tidak sesuai','% sesuai','Status suhu'],rows)+`</div>`;document.body.append(d);post(d)}
document.addEventListener('click',e=>{
 if(e.target.closest('[data-x]')||e.target.classList.contains('mod')){document.querySelector('.mod').remove();return}
 const h=e.target.closest('th[data-sort]');
 if(h){const t=h.closest('table'),i=h.cellIndex,asc=!h.classList.contains('as');t.querySelectorAll('th').forEach(x=>x.classList.remove('as','ds'));h.classList.add(asc?'as':'ds');
  const v=c=>{const s=c.textContent.trim();if(!/^[\d.,%\s–-]+$/.test(s))return s.toLowerCase();const n=parseFloat(s.replace('%','').replace(/\./g,'').replace(',','.'));return isNaN(n)?-1:n};
  const b=t.tBodies[0];[...b.rows].sort((x,y)=>{const a=v(x.cells[i]),c=v(y.cells[i]);return(a>c?1:a<c?-1:0)*(asc?1:-1)}).forEach(r=>b.append(r));return}
 const r=e.target.closest('tr[data-code]');if(r&&!document.querySelector('.mod')&&!e.target.closest('[data-msg]'))detail(r.dataset.code)});
document.addEventListener('click',e=>{const t=e.target.closest('[data-t]');if(t){tab=t.dataset.t;render()}});
document.addEventListener('change',e=>{const el=e.target,f=el.dataset.f,s=el.dataset.s;
 if(el.dataset.g){G[el.dataset.g]=el.value;render();return}
 if(f){F[f]=el.value;render();if(f==='q')$('[data-f=q]').focus();return}
 if(s){D.set[s]=s==='goCount'?el.value:parseFloat(el.value);prep();save();render();return}
 if(el.id==='bln'||el.id==='thn'){Mo=+$('#bln').value;Y=+$('#thn').value;render()}});
document.addEventListener('input',e=>{if(e.target.dataset.f==='q'){F.q=e.target.value;const p=e.target.selectionStart;render();const i=$('[data-f=q]');i.focus();i.setSelectionRange(p,p)}});

window.CAN_EDIT=window.CAN_EDIT||false;
let save=()=>{};
const r0=render;render=function(){r0();if(!window.CAN_EDIT){document.querySelectorAll('[data-s]').forEach(e=>e.disabled=true);if(tab==='aturan'){const c=document.querySelector('#mn .card');if(c)c.remove()}}};
function startDash(d){D=d;if(!window.CAN_EDIT){applyPrefs();const i=tabs.findIndex(x=>x[0]==='aturan');if(i>=0)tabs[i]=['setelan','Pengaturan'];if(!startDash._o){startDash._o=1;const p=PREF();if(p.tab)tab=p.tab}}prep();const ks=[...byYM.keys()].sort();if(!ks.length){$('#mn').innerHTML='<div class="card">Belum ada data.</div>';return}Y=Math.floor(ks[ks.length-1]/100);Mo=ks[ks.length-1]%100;fill();render()}

/* ===== Pesan admin untuk toko / AM ===== */
const saveNotes=()=>{if(window.onNotes)window.onNotes()};
const NT=c=>(D.notes||{})[c];
const noteHtml=c=>NT(c)?`<div class="bn">💬 <b>Pesan admin</b> (${E(NT(c).date)}):<br>${E(NT(c).text).replace(/\n/g,'<br>')}</div>`:'';
function msgCell(s){const n=NT(s.code);
 if(window.CAN_EDIT)return`<button class="s" data-msg="${E(s.code)}">${n?'✎ Ubah':'✉ Kirim'}</button>${n?' <span class="pl g">tersimpan</span>':''}`;
 return n?`<span class="pl y" title="${E(n.text)}">💬 Ada pesan</span>`:'–'}
function recapBtn(){return window.CAN_EDIT?`<div class="fl"><button data-recap>✉ Pesan rekap per AM (sesuai filter)</button></div>`:''}
function banner(){const n=D.notes||{},it=Object.keys(n).filter(k=>k==='*'||k[0]==='@').map(k=>(k==='*'?'':'<b>Untuk AM '+E(k.slice(1))+':</b> ')+E(n[k].text).replace(/\n/g,'<br>')+` <small>(${E(n[k].date)})</small>`);
 return it.length?`<div class="bn">📢 <b>Pengumuman dari Admin</b><br>${it.join('<hr>')}</div>`:''}
const rb=render;render=function(){rb();if(!window.CAN_EDIT&&['ringkas','tindak'].includes(tab)&&$('#mn'))$('#mn').insertAdjacentHTML('afterbegin',banner())};
const TTD='Salam,\nNurhidayat Turilah\nBranch Fixed Asset Administrator – Alfamidi Branch Palu';
const salam=()=>{const h=new Date().getHours();return h<11?'Selamat pagi':h<15?'Selamat siang':h<18?'Selamat sore':'Selamat malam'};
function compose(s,R){const L=[];['Pagi Periode 1','Sore Periode 1','Pagi Periode 2','Sore Periode 2'].forEach((l,i)=>{const q=s.q[i];if(!['SUDAH','-','BELUM GO'].includes(q))L.push('• '+l+': '+(q==='BELUM'?'belum ada pengisian':'baru terisi '+s.c.a[i]+'× (minimal '+set.minIn+'×)'))});
 if(s.tn==='BELUM SESUAI')L.push('• Suhu ruangan: dari '+s.c.v+' input, '+s.c.s+' sesuai, '+s.c.k+' kurang sesuai, dan '+s.c.t+' tidak sesuai (suhu ideal maksimal '+String(set.ses).replace('.',',')+'°C)');
 return`${salam()}, tim toko ${s.name} (${s.code}).\n\nBerdasarkan hasil monitoring switching AC bulan ${MN[R.m-1]} ${R.y} (data sampai ${fdt(R.last)}), masih ada yang perlu dilengkapi:\n${L.join('\n')||'• Mohon dicek kembali pengisian formnya.'}\n\nMohon dibantu untuk melakukan switching AC sesuai jadwal dan mengisi form suhu ruangan minimal ${set.minIn}× di setiap sesi (pagi dan sore). Terima kasih atas kerja samanya 🙏\n\n${TTD}`}
function openMod(h){const d=document.createElement('div');d.className='mod';d.innerHTML='<div><button class="s" style="float:right" data-x>Tutup ✕</button>'+h+'</div>';document.body.append(d);return d}
const PH=()=>{try{return JSON.parse(localStorage.phones||'{}')}catch(e){return{}}};
function sendBtns(key){const wa=()=>{const ph=PH(),p=$('#mp').value.replace(/\D/g,'').replace(/^0/,'62');ph[key]=$('#mp').value;try{localStorage.phones=JSON.stringify(ph)}catch(e){}
 window.open('https://wa.me/'+p+'?text='+encodeURIComponent($('#mt').value),'_blank')};
 $('#mw').onclick=wa;$('#mc').onclick=()=>{const v=$('#mt').value;(navigator.clipboard?navigator.clipboard.writeText(v):Promise.reject()).then(()=>alert('Pesan disalin.'),()=>prompt('Salin pesan ini:',v))}}
const phoneBox=k=>`<div class="row"><div><label>No. WhatsApp tujuan (opsional, format 628xx…; kosongkan untuk memilih kontak/grup di WhatsApp)</label><input id="mp" inputmode="tel" value="${E(PH()[k]||'')}"></div></div>`;
function msgDlg(code){const R=window.LAST_R||calc(Y,Mo),s=R.S.find(z=>z.code===code),n=NT(code);if(!s)return;
 openMod(`<h2 style="margin-top:0">Pesan untuk ${E(s.name)} <small>(${E(s.code)})</small></h2><div class="hint">AM: ${E(s.am)} · ${E(s.ket)}. Isi pesan bisa diubah dulu sebelum dikirim.</div><textarea id="mt" rows="12" style="width:100%">${E(n?n.text:compose(s,R))}</textarea>${phoneBox(code)}
 <div class="fl"><button id="mw">Kirim via WhatsApp</button><button class="s" id="mc">Salin</button><button class="s" id="ms">💾 Simpan supaya tampil di dashboard AM</button>${n?'<button class="s" id="md">Hapus pesan</button>':''}</div><div class="hint">Pesan yang disimpan akan muncul di dashboard AM setelah Anda klik Publikasi.</div>`);
 sendBtns(code);$('#ms').onclick=()=>{D.notes=D.notes||{};D.notes[code]={text:$('#mt').value,date:new Date().toLocaleDateString('id-ID')};saveNotes();document.querySelector('.mod').remove();render()};
 if(n)$('#md').onclick=()=>{delete D.notes[code];saveNotes();document.querySelector('.mod').remove();render()}}
function recapDlg(){const R=window.LAST_R,L=window.LAST_L||[],by={};if(!L.length){alert('Tidak ada toko pada daftar.');return}
 L.forEach(s=>(by[s.am]=by[s.am]||[]).push(s));
 const sec=Object.fromEntries(Object.entries(by).map(([am,a])=>[am,`${salam()} Bapak/Ibu ${am}.\n\nBerikut toko di wilayah Bapak/Ibu yang masih perlu ditindaklanjuti untuk switching AC (${MN[R.m-1]} ${R.y}, data sampai ${fdt(R.last)}):\n\n`+a.map((s,i)=>`${i+1}. ${s.name} (${s.code}) — ${s.ket}`).join('\n')+`\n\nMohon bantuannya untuk menindaklanjuti dan memberi kabar setelah selesai ya. Terima kasih.\n\n${TTD}`]));
 const one=Object.keys(sec).length===1;
 openMod(`<h2 style="margin-top:0">Pesan rekap${one?' untuk '+E(Object.keys(sec)[0]):' ('+Object.keys(sec).length+' AM)'}</h2><div class="hint">${L.length} toko. ${one?'':'Pilih satu AM di filter supaya bisa langsung dikirim lewat WhatsApp.'}</div><textarea id="mt" rows="14" style="width:100%">${E(Object.values(sec).join('\n\n———\n\n'))}</textarea>${one?phoneBox('@'+Object.keys(sec)[0]):'<span id="mp" hidden></span>'}
 <div class="fl"><button id="mw">Kirim via WhatsApp</button><button class="s" id="mc">Salin</button><button class="s" id="ms">💾 Simpan sebagai pesan untuk masing-masing AM</button></div>`);
 if(!$('#mp').value&&!one)$('#mp').value='';sendBtns(one?'@'+Object.keys(sec)[0]:'*');
 $('#ms').onclick=()=>{D.notes=D.notes||{};const dt=new Date().toLocaleDateString('id-ID');Object.entries(sec).forEach(([am,x])=>D.notes['@'+am]={text:x,date:dt});saveNotes();document.querySelector('.mod').remove();alert('Tersimpan untuk '+Object.keys(sec).length+' AM. Klik Publikasi supaya pesannya muncul di dashboard mereka.')}}
document.addEventListener('click',e=>{const m=e.target.closest('[data-msg]');if(m)msgDlg(m.dataset.msg);if(e.target.closest('[data-recap]'))recapDlg()});

/* ===== Daftar semua toko + pencarian ===== */
function daftarToko(R){const L=[...R.S].sort((a,b)=>a.name.localeCompare(b.name));
 return`<div class="hint">Menampilkan ${L.length} toko wajib cek${G.q?' yang cocok dengan “'+E(G.q)+'”':''}. Klik salah satu baris untuk melihat riwayat bulanannya. Angka di kotak adalah jumlah input valid per sesi.</div>`+
 tbl(['No','Kode','Nama Toko','Area','AM','AC','Pagi P1','Sore P1','Pagi P2','Sore P2','Prioritas','Status Suhu','% Suhu SESUAI','Tgl GO'],L.map((s,i)=>`<tr data-code="${E(s.code)}"><td>${i+1}</td><td>${E(s.code)}</td><td>${E(s.name)}</td><td>${E(s.area)}</td><td>${E(s.am)}</td><td>${E(s.ac)}</td>${[0,1,2,3].map(k=>`<td>${chip(s,k)}</td>`).join('')}<td><span class="pl ${prc[s.prio]}">${prn[s.prio]}</span></td><td><span class="pl ${thc[s.tn]}">${TL[s.tn]||s.tn}</span></td><td>${pct(s.ps)}</td><td>${fd(s.go)}</td></tr>`))}
document.addEventListener('click',e=>{if(e.target.closest('[data-greset]')){G={am:'',ar:'',tp:'',ac:'',q:''};fill();render()}});
let tq;document.addEventListener('input',e=>{const el=e.target;if(el.dataset&&el.dataset.g==='q'){G.q=el.value.trim();clearTimeout(tq);tq=setTimeout(render,250)}});
const rc=render;render=function(){rc();const gc=$('#gc');if(gc){const on=G.q||G.am||G.ar||G.tp||G.ac;gc.textContent=on&&byYM&&byYM.size?calc(Y,Mo).S.length+' toko cocok':''}};

const SN={'BELUM MULAI':'belum dimulai',BERJALAN:'sedang berjalan',SELESAI:'sudah selesai'};
const TL={SESUAI:'Sesuai','BELUM SESUAI':'Belum sesuai','BELUM ADA INPUT':'Belum ada input','BELUM GO':'Belum GO'};

/* ===== Tampilan & pengaturan khusus pengguna (berbeda dari admin) ===== */
const PREF=()=>{try{return JSON.parse(localStorage.swacPref||'{}')}catch(e){return{}}};
function applyPrefs(){try{const p=PREF(),r=document.documentElement;
 if(p.tema==='terang'||p.tema==='gelap')r.dataset.theme=p.tema==='gelap'?'dark':'light';else delete r.dataset.theme;
 if(p.huruf&&p.huruf!=='normal')r.dataset.fs=p.huruf;else delete r.dataset.fs;
 if(p.padat==='1')r.dataset.pd='padat';else delete r.dataset.pd}catch(e){}}
function setPref(k,v){const p=PREF();p[k]=v;try{localStorage.swacPref=JSON.stringify(p)}catch(e){}applyPrefs()}
function inisial(n){return String(n||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()}
function setelan(R){const p=PREF(),u=window.USER||{},seg=(k,o,cur)=>`<div class="seg">${o.map(([v,l])=>`<button type="button" data-pref="${k}" data-v="${v}" class="${cur===v?'on':''}">${l}</button>`).join('')}</div>`;
 return`<div class="sgrid">
 <div class="card prof"><span class="avatar big">${E(inisial(D.label))}</span><div><b style="font-size:17px">${E(D.label)}</b><div class="hint" style="margin:3px 0 0">${E(D.jabatan||'Pengguna')}</div><div class="hint" style="margin:0">NIK ${E(u.nik||'-')}</div></div></div>
 <div class="card"><h3>Tampilan</h3>
  <label>Tema</label>${seg('tema',[['auto','Otomatis'],['terang','Terang'],['gelap','Gelap']],p.tema||'auto')}
  <label>Ukuran huruf</label>${seg('huruf',[['normal','Normal'],['besar','Besar'],['sangat','Sangat besar']],p.huruf||'normal')}
  <label>Kerapatan tabel</label>${seg('padat',[['0','Nyaman'],['1','Padat']],p.padat||'0')}
  <label>Halaman awal saat masuk</label>${seg('tab',[['ringkas','Ringkasan'],['toko','Daftar Toko'],['tindak','Perlu Ditindaklanjuti']],p.tab||'ringkas')}
  <div class="hint">Pilihan ini hanya tersimpan di perangkat Anda.</div></div>
 <div class="card"><h3>Akun</h3><div class="hint">Nama dan jabatan Anda terbaca otomatis dari data karyawan. Untuk mengganti password, ajukan reset ke admin.</div>
  <div class="fl"><button class="s" data-act="reset">Ganti / reset password</button><button class="s" data-act="keluar">Keluar</button></div></div>
 <div class="card"><h3>Data &amp; aplikasi</h3><div class="hint">Data terakhir diperbarui: <b>${E(window.UPDATED||'-')}</b><br>Sumber: ${E(D.src||'-')}</div>
  <div class="fl"><button data-act="muat">Muat ulang data terbaru</button><button class="s pasang"${window.PWA_CAN?'':' hidden'}>⬇ Pasang aplikasi</button><button class="s" data-act="bersih">Bersihkan data offline</button></div><div id="act-msg" class="hint"></div></div>
 <div class="card"><h3>Cara membaca angka</h3><ul class="an" style="margin:0;padding-left:18px"><li>Periode 1 mencakup tanggal 1–15, Periode 2 tanggal 16 sampai akhir bulan.</li><li>Toko dianggap sudah mengisi bila ada minimal <b>${set.minIn}×</b> input valid pada sesi itu.</li><li>Suhu ruangan <b>sesuai</b> sampai ${set.ses}°C, <b>kurang sesuai</b> sampai ${set.kur}°C, dan <b>tidak sesuai</b> di atasnya. Input di bawah ${set.min}°C diabaikan.</li><li>Warna kepatuhan: hijau di atas ${pct(set.good)}, kuning di atas ${pct(set.fair)}, selebihnya merah.</li></ul></div>
 </div>`}
const say=m=>{const e=$('#act-msg');if(e)e.textContent=m};
document.addEventListener('click',async e=>{const c=e.target.closest&&e.target.closest('[data-pref]');
 if(c){setPref(c.dataset.pref,c.dataset.v);render();return}
 const a=e.target.closest&&e.target.closest('[data-act]');if(!a)return;const m=a.dataset.act;
 if(m==='keluar'){location.reload();return}
 if(m==='reset'){location.hash='#reset';location.reload();return}
 if(m==='muat'){if(!window.REFRESH){say('Tidak tersedia pada mode ini.');return}a.disabled=true;say('⏳ Memuat data terbaru…');
  try{await window.REFRESH();say('✅ Data sudah yang terbaru.')}catch(x){say('⚠ '+x.message)}return}
 if(m==='bersih'){try{const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)));say('✅ Data offline di perangkat ini sudah dibersihkan. Aplikasi tetap bisa dipakai saat online.')}catch(x){say('Tidak ada data offline yang perlu dibersihkan.')}}});
