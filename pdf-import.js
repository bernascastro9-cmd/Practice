/* Practice — Import from PDF.
   Reads a lead sheet (PDF) into the Fake Book:
   1. draws each page and finds the staves (5 lines) and the bar lines, so it knows where every measure is;
   2. reads the chord symbols above each staff — from the PDF's own text when it has text (exports from chart and notation apps),
      otherwise with OCR (Tesseract) for scanned pages;
   3. translates Real Book writing (AMI7, CMA7, BMI7(b5), G7…) into chord symbols;
   4. shows the measures it found, with anything it could not read marked, to correct before importing.
   pdf.js (Mozilla) and Tesseract.js are in vendor/ (Apache 2.0) and are only downloaded when a PDF is chosen. */
(function(){
 'use strict';
 const V='vendor/';
 const $=id=>document.getElementById(id);
 let libsReady=null,ocrWorker=null;

 function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('Could not load '+src));document.head.append(s)})}
 function libs(){
  if(!libsReady)libsReady=(async()=>{
   if(!window.pdfjsLib)await loadScript(V+'pdf.min.js');
   window.pdfjsLib.GlobalWorkerOptions.workerSrc=V+'pdf.worker.min.js';
  })();
  return libsReady;
 }
 async function ocr(progress){
  if(ocrWorker)return ocrWorker;
  if(!window.Tesseract)await loadScript(V+'tesseract.min.js');
  ocrWorker=await Tesseract.createWorker('eng',1,{
   workerPath:new URL(V+'tesseract-worker.min.js',location.href).href,
   corePath:new URL(V+'tesseract-core/',location.href).href,
   langPath:new URL(V+'lang',location.href).href,gzip:true,
   logger:m=>{if(progress&&m.status==='recognizing text')progress(m.progress)}
  });
  await ocrWorker.setParameters({tessedit_pageseg_mode:'11',preserve_interword_spaces:'1'});
  return ocrWorker;
 }

 /* ---------- chord symbols ---------- */
 const VALID=/^[A-G](#|b)?(m|maj|dim|aug|sus2|sus4|sus|o|h|\+|-)?(6\/9|69|6|7|9|11|13)?(maj7)?((b|#)(5|9|11|13)|add9|add11|sus4|sus2|alt)*(\/[A-G](#|b)?)?$/;
 // Real Book and OCR spellings → chord symbols the Fake Book understands
 function normChord(raw){
  let t=String(raw||'').trim();
  if(!t)return null;
  if(/^[(\[]/.test(t)||/[)\]]$/.test(t)&&!/\(b5\)|\(#5\)|\(b9\)|\(#9\)|\(#11\)|\(b13\)/i.test(t))return null;   // alternate chords in parentheses
  t=t.replace(/[’'`´‘]/g,'7').replace(/®/g,'7').replace(/[°º]/g,'o').replace(/ø|Ø/g,'h').replace(/♭/g,'b').replace(/♯/g,'#').replace(/[Δ∆△]/g,'maj')
     .replace(/\s+/g,'').replace(/[.,;:!]+$/,'');
  const m=/^([A-G])([#b])?(.*)$/.exec(t);if(!m)return null;
  let [,root,acc='',q]=m;
  // quality
  q=q.replace(/^(MI|Mi|mI|mi|MIN|min|Min|ui|Ui|uI|UI|Wi|wi|Ml|ml|M1|m1|-)(?=[^aA]|$)/,'m')
     .replace(/^(MA|Ma|mA|ma|MAJ|Maj|maj|Ā)/,'maj')
     .replace(/^(DIM|Dim|dim)/,'dim').replace(/^(AUG|Aug|aug|\+)/,'aug')
     .replace(/^(SUS|Sus)/,'sus');
  q=q.replace(/\((b|#)(5|9|11|13)\)/g,'$1$2').replace(/[()]/g,'');
  q=q.replace(/^m7?b5$/,'m7b5').replace(/^h7?$/,'m7b5').replace(/^o7?$/,'dim7').replace(/^maj$/,'maj7').replace(/^majj?7$/,'maj7');
  q=q.replace(/^m77$/,'m7').replace(/^77$/,'7');
  const chord=root+acc+q;
  return VALID.test(chord)?chord:null;
 }
 function looksLikeChord(t){return /^[A-G]/.test(String(t||'').trim())}
 // OCR of handwritten Real Book lettering: MI is read as w/wi/yn/ay/ye, MA as ma/ms/aas/oun, the raised 7 as ’ ' ” ? i,
 // (b5) as "5)" or a lone ")". Returns the chords of one measure and whether any of them had to be guessed.
 function normOcr(text){
  const toks=String(text||'').split(/[\s|\]\[]+/).filter(Boolean),merged=[];
  for(const t of toks){
   const last=merged[merged.length-1];
   if(last&&/^[A-G][#b]?$/.test(last)&&/^[a-zA-Z(’'”?0-9]/.test(t)&&!/^[A-G]/.test(t))merged[merged.length-1]+=t;
   else if(last&&/^[0-9()’'”?]/.test(t)&&/^[A-G]/.test(last))merged[merged.length-1]+=t;   // "(b5)" read apart from its chord
   else merged.push(t);
  }
  const out=[];let guess=false;
  for(let t of merged){
   if(/^[a-g][eé6’'7]?$/.test(t))t=t[0].toUpperCase()+t.slice(1);   // a small root letter on its own ("ce" → C6)
   t=t.replace(/^[^A-G]+/,'');if(!t||!/^[A-G]/.test(t))continue;
   t=t.replace(/^[A-G](?=[A-G])/,'');   // a stray letter read before the chord ("CG" → "G")
   const direct=normChord(t);if(direct&&!/^[A-G][#b]?$/.test(direct)){out.push(direct);continue}
   let root=t[0],rest=t.slice(1);
   if(/^[#b]/.test(rest)&&rest.length>1&&!/^.[5)]/.test(rest)){root+=rest[0];rest=rest.slice(1)}
   let q;
   if(/5\)|b5|\(5|ø/.test(rest))q='m7b5';
   else if(/^(w|wi|wl|ui|yn|y|un|mi|m|-|n)[^a]*™/i.test(rest))q='m7b5';   // ™: the raised 7(b5)
   else if(/^(o?ma|a?ma|ama|oma|ms|mMa|aa|as|oun|m4a|a(?!y))/i.test(rest)&&!/^(mi|ay|ye)/i.test(rest))q='maj7';
   else if(/^(w|wi|wl|ui|yn|ye|y|ay|un|mi|m|-|n)/i.test(rest))q=/\)/.test(rest)?'m7b5':'m7';
   else if(/^[eé6]/.test(rest))q='6';
   else if(/^(9|11|13)/.test(rest))q=rest.match(/^(9|11|13)/)[1];
   else if(/[’'”"?47i]/.test(rest))q='7';
   else{q='7';guess=true}   // a bare letter: its raised 7 was lost (lead sheets rarely write plain triads)
   out.push(root+q);
  }
  return {chords:out,guess};
 }

 /* ---------- page analysis ---------- */
 function gray(ctx,w,h){const d=ctx.getImageData(0,0,w,h).data,g=new Uint8Array(w*h);for(let i=0,j=0;i<g.length;i++,j+=4)g[i]=(d[j]*299+d[j+1]*587+d[j+2]*114)/1000;return g}
 function findStaves(g,w,h){
  const rows=[];for(let y=0;y<h;y++){let n=0;const o=y*w;for(let x=0;x<w;x++)if(g[o+x]<140)n++;rows.push(n/w)}
  const lines=[];for(let y=0;y<h;y++){if(rows[y]>.33){let e=y;while(e+1<h&&rows[e+1]>.33)e++;lines.push((y+e)/2);y=e}}
  const staves=[];
  for(let i=0;i+4<lines.length;i++){
   const d=[1,2,3,4].map(k=>lines[i+k]-lines[i+k-1]),s=d.reduce((a,b)=>a+b)/4;
   if(s<5||s>60)continue;
   if(d.every(x=>Math.abs(x-s)<s*.3)){staves.push({top:lines[i],bottom:lines[i+4],s});i+=4}
  }
  for(const st of staves){   // left and right edge of the staff, from its middle line
   const y=Math.round(st.top+st.s*2),o=y*w;let l=0,r=w-1;
   while(l<w&&g[o+l]>=140)l++;while(r>0&&g[o+r]>=140)r--;st.left=l;st.right=r;
  }
  return staves;
 }
 function findBarlines(g,w,h,st){
  const top=Math.round(st.top),bot=Math.round(st.bottom),H=bot-top+1,s=st.s,xs=[];
  const dark=(x,y0,y1)=>{let n=0;for(let y=Math.max(0,y0);y<=Math.min(h-1,y1);y++)if(g[y*w+x]<140)n++;return n/Math.max(1,y1-y0+1)};
  for(let x=st.left;x<=st.right;x++){
   if(dark(x,top,bot)<.93)continue;
   // a bar line stops at the staff; stems and other marks carry on above or below it
   // a bar line stops at the staff on at least one side (a tie or slur can pass over the other); stems are told apart by their notehead below
   if(dark(x,Math.round(top-1.1*s),Math.round(top-.35*s))>.35&&dark(x,Math.round(bot+.35*s),Math.round(bot+1.1*s))>.35)continue;
   xs.push(x);
  }
  const runs=[];for(const x of xs){const r=runs[runs.length-1];if(r&&x-r[1]<=Math.max(2,s*.9))r[1]=x;else runs.push([x,x])}
  // a note stem has a notehead beside it, between the staff lines; a bar line has nothing there
  const lines=[0,1,2,3,4].map(k=>st.top+k*(st.bottom-st.top)/4),inter=[];
  for(let y=top;y<=bot;y++)if(Math.min(...lines.map(l=>Math.abs(y-l)))>s*.22)inter.push(y);
  const head=(a,b)=>{let best=0;for(const [p,q] of [[a-Math.round(1.3*s),a-Math.round(.22*s)],[b+Math.round(.22*s),b+Math.round(1.3*s)]]){const x0=Math.max(0,p),x1=Math.min(w-1,q);if(x1<=x0)continue;for(const y of inter){let n=0;for(let x=x0;x<=x1;x++)if(g[y*w+x]<140)n++;best=Math.max(best,n/(x1-x0+1))}}return best};
  return runs.filter(r=>r[1]-r[0]<=s*1.4&&head(r[0],r[1])<.45).map(r=>(r[0]+r[1])/2);
 }
 function measuresOf(st,bars){
  const s=st.s,edges=[];
  if(!bars.length||bars[0]-st.left>s*2)edges.push(st.left);
  for(const b of bars)edges.push(b);
  if(st.right-edges[edges.length-1]>s*3)edges.push(st.right);
  const ms=[];for(let i=0;i+1<edges.length;i++)if(edges[i+1]-edges[i]>s*2.2)ms.push({x0:edges[i],x1:edges[i+1],chords:[],raw:[]});
  return ms;
 }

 /* ---------- reading one PDF ---------- */
 async function readPdf(file,status){
  await libs();
  const data=new Uint8Array(await file.arrayBuffer());
  const pdf=await pdfjsLib.getDocument({data}).promise;
  const systems=[];let title='',styleHint='';
  for(let pn=1;pn<=Math.min(pdf.numPages,8);pn++){
   status(`Reading page ${pn} of ${pdf.numPages}…`);
   const page=await pdf.getPage(pn),base=page.getViewport({scale:1}),scale=2400/base.width,vp=page.getViewport({scale});
   const cv=document.createElement('canvas');cv.width=Math.round(vp.width);cv.height=Math.round(vp.height);
   const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);
   await page.render({canvasContext:ctx,viewport:vp}).promise;
   const w=cv.width,h=cv.height,g=gray(ctx,w,h);
   const staves=findStaves(g,w,h);
   if(!staves.length)continue;
   // the PDF's own text, when it has any (exports); otherwise OCR on the band above each staff
   const tc=await page.getTextContent();
   const items=tc.items.filter(it=>it.str&&it.str.trim()).map(it=>{const [x,y]=vp.convertToViewportPoint(it.transform[4],it.transform[5]);return {str:it.str.trim(),x,y,w:it.width*scale}});
   const textChords=items.filter(it=>normChord(it.str));
   const useText=textChords.length>=4;
   if(pn===1){
    const firstTop=staves[0].top-staves[0].s*5;
    if(useText){const tops=items.filter(it=>it.y<firstTop);const big=tops.sort((a,b)=>a.y-b.y)[0];if(big)title=big.str;styleHint=(tops.find(it=>/swing|bossa|ballad|waltz|latin|funk|samba|blues/i.test(it.str))||{}).str||''}
    else{
     const wk=await ocr();await wk.setParameters({tessedit_pageseg_mode:'6'});
     const band=crop(g,w,h,0,0,w,Math.max(40,Math.round(firstTop)));
     const r=await wk.recognize(band);const lines=r.data.text.split('\n').map(x=>x.trim()).filter(x=>x.length>2);
     {const ln=(lines.find(x=>/[a-z]/i.test(x)&&!/^\d+$/.test(x))||'').split(/\s+/),keep=[];for(const t of ln){if(!/^[A-Za-zÀ-ÿ'’&-]+$/.test(t))break;keep.push(t)}title=keep.join(' ')}
     styleHint=(lines.find(x=>/swing|bossa|ballad|waltz|latin|funk|samba|blues/i.test(x))||'');
     await wk.setParameters({tessedit_pageseg_mode:'11'});
    }
   }
   for(let si=0;si<staves.length;si++){
    const st=staves[si],ms=measuresOf(st,findBarlines(g,w,h,st));if(!ms.length)continue;
    const y0=Math.max(0,Math.round(st.top-st.s*4.6)),y1=Math.round(st.top-st.s*.25);
    let words=[];
    if(useText){
     words=items.filter(it=>it.y>y0&&it.y<y1+st.s*.6).map(it=>({text:it.str,x:it.x+it.w/2,x0:it.x}));
    }else{
     status(`Reading the chords (OCR) — line ${systems.length+1}…`);
     const wk=await ocr();await wk.setParameters({tessedit_pageseg_mode:'7'});
     for(const m of ms){
      const a=Math.max(0,Math.round(m.x0-st.s*.6)),band=crop(g,w,h,a,y0,Math.max(8,Math.round(m.x1)-a),y1-y0,true,2);
      const r=await wk.recognize(band),res=normOcr(r.data.text);m.chords=res.chords;m.guess=res.guess||!res.chords.length;m.ocr=r.data.text.trim();
     }
     // a boxed section letter at the start of the line
     {const a=0,b=Math.round(ms[0].x0+st.s*.4);if(b-a>st.s){const r=await wk.recognize(crop(g,w,h,a,Math.round(st.top-st.s*4.6),b,Math.round(st.s*4.4),true,2));const t=r.data.text.trim();if(/^[A-D]$/.test(t))words.push({text:t,x:ms[0].x0,x0:0})}}
    }
    const sys={measures:ms,section:''};
    for(const wd of words.sort((a,b)=>a.x0-b.x0)){
     // a boxed section letter at the start of the line
     if(/^[A-D]$/.test(wd.text)&&wd.x<ms[0].x0+st.s*2.5&&!sys.section){sys.section=wd.text;continue}
     const m=ms.find(m=>wd.x>=m.x0-st.s*.6&&wd.x<m.x1)||null;if(!m)continue;
     const c=normChord(wd.text);
     if(useText){if(c)m.chords.push(c);else if(looksLikeChord(wd.text)&&!/^[(\[]/.test(wd.text))m.raw.push(wd.text)}
    }
    systems.push(sys);
   }
  }
  if(!systems.length)throw new Error('No music staves were found in this PDF.');
  return {title,styleHint,systems};
 }
 // a grey band of the page, cut out and cleaned for OCR (highlighter colours become white)
 function crop(g,w,h,x,y,cw,ch,clean,zoom=1){
  cw=Math.min(cw,w-x);ch=Math.min(ch,h-y);
  const c=document.createElement('canvas');c.width=cw;c.height=ch;const cx=c.getContext('2d'),im=cx.createImageData(cw,ch);
  for(let yy=0;yy<ch;yy++)for(let xx=0;xx<cw;xx++){const v=g[(y+yy)*w+x+xx],o=(yy*cw+xx)*4,b=clean?(v<150?0:255):v;im.data[o]=im.data[o+1]=im.data[o+2]=b;im.data[o+3]=255}
  cx.putImageData(im,0,0);if(zoom===1)return c;
  const z=document.createElement('canvas');z.width=cw*zoom;z.height=ch*zoom;const zx=z.getContext('2d');zx.imageSmoothingQuality='high';zx.drawImage(c,0,0,z.width,z.height);return z;
 }

 /* ---------- review before importing ---------- */
 function review(res){
  const d=document.createElement('dialog');d.className='rep-dialog pdf-review';
  const styles=(window.ppStyleOptions?ppStyleOptions():[['swing','Jazz Swing']]);
  const hint=(res.styleHint||'').toLowerCase();
  const guess=/bossa/.test(hint)?'bossa':/ballad/.test(hint)?'ballad':/waltz/.test(hint)?'waltz':/latin/.test(hint)?'latin':/funk/.test(hint)?'funk':/samba/.test(hint)?'samba':/blues/.test(hint)?'blues':'swing';
  const keys=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B','Cm','C#m','Dm','Ebm','Em','Fm','F#m','Gm','G#m','Am','Bbm','Bm'];
  const nMeasures=res.systems.reduce((a,s)=>a+s.measures.length,0);
  const bad=res.systems.reduce((a,s)=>a+s.measures.filter(m=>m.raw.length||!m.chords.length||m.guess).length,0);
  d.innerHTML=`<form method="dialog" class="pdf-form">
   <h3>Import from PDF</h3>
   <p class="pdf-sum">Found <b>${nMeasures}</b> measures on <b>${res.systems.length}</b> lines.${bad?` <span class="pdf-warn">${bad} need a look</span> (marked) — write the chords with spaces between them, or leave empty to continue the chord before.`:' Check them, then import.'}</p>
   <div class="pdf-meta"><label>Title<input class="pdf-title" maxlength="120"></label>
    <label>Style<select class="pdf-style">${styles.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label>
    <label>Key<select class="pdf-key">${keys.map(k=>`<option>${k}</option>`).join('')}</select></label></div>
   <div class="pdf-grid"></div>
   <div class="rep-dialog-actions"><button value="cancel" class="secondary" type="submit">Cancel</button><button value="ok" class="primary pdf-ok" type="submit">Import song</button></div>
  </form>`;
  d.querySelector('.pdf-title').value=res.title||'Untitled';d.querySelector('.pdf-style').value=guess;
  const grid=d.querySelector('.pdf-grid');let n=0;
  for(const sys of res.systems){
   const row=document.createElement('div');row.className='pdf-row';
   for(const [k,m] of sys.measures.entries()){
    n++;const cell=document.createElement('label');cell.className='pdf-m';
    const inp=document.createElement('input');inp.value=m.chords.join(' ');inp.dataset.section=k===0?sys.section:'';
    if(m.raw.length){inp.value=[...m.chords,...m.raw].join(' ');cell.classList.add('bad')}
    else if(!m.chords.length)cell.classList.add('empty');
    else if(m.guess)cell.classList.add('guess');
    if(m.ocr)cell.title='Read as: '+m.ocr;
    const num=document.createElement('span');num.textContent=(k===0&&sys.section?sys.section+' ':'')+n;
    inp.addEventListener('input',()=>{cell.classList.remove('guess');const toks=inp.value.trim().split(/\s+/).filter(Boolean);cell.classList.toggle('bad',toks.some(t=>!normChord(t)&&t!=='/'));cell.classList.toggle('empty',!toks.length)});
    cell.append(num,inp);row.append(cell);
   }
   grid.append(row);
  }
  document.body.append(d);d.showModal();
  d.addEventListener('close',()=>{
   if(d.returnValue==='ok'){
    const bars=[];let last=null;
    for(const inp of d.querySelectorAll('.pdf-m input')){
     const toks=inp.value.trim().split(/\s+/).filter(Boolean).map(t=>t==='/'?'/':normChord(t)).filter(Boolean);
     const chords=toks.length?toks:(last?[last]:['C']);last=[...chords].reverse().find(c=>c!=='/')||last;
     bars.push({chords,section:inp.dataset.section||''});
    }
    const style=d.querySelector('.pdf-style').value;
    window.ppImportSongs([{title:d.querySelector('.pdf-title').value.trim()||'Untitled',artist:'',key:d.querySelector('.pdf-key').value,meter:'4/4',style,bpm:style==='ballad'?70:120,bars,source:'PDF'}]);
   }
   d.remove();
  },{once:true});
 }

 /* ---------- the button in the Import window ---------- */
 function start(){
  const pick=$('repPdfPick'),input=$('repPdfFile');if(!pick||!input)return;
  pick.addEventListener('click',()=>input.click());
  input.addEventListener('change',async()=>{
   const file=input.files&&input.files[0];input.value='';if(!file)return;
   const msg=$('repImportError'),btn=pick;const status=t=>{if(msg)msg.textContent=t};
   btn.disabled=true;
   try{
    status('Opening the PDF…');
    const res=await readPdf(file,status);
    status('');const dlg=$('repImportDialog');if(dlg&&dlg.open)dlg.close();
    review(res);
   }catch(e){const m=String(e&&e.message||e);status(/Could not load vendor/.test(m)?'The PDF reader is not available on this page (it works on the GitHub site, where its files are).':'Could not read this PDF: '+m)}
   finally{btn.disabled=false}
  });
 }
 window.ppPdfTools={normChord,normOcr,readPdf};   // for tests
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
