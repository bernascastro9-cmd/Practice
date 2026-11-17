// ===== Practice history: days, minutes per exercise (from the timer) and one note per day =====
function altHistoryInit(shell,top,ICON){
 const $=id=>document.getElementById(id);
 const KEY='pp-practice-log-v1';
 let log={days:{}};try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s&&s.days)log=s}catch(e){}
 let dirty=false;const save=()=>{if(!dirty)return;try{localStorage.setItem(KEY,JSON.stringify(log));dirty=false}catch(e){}};
 const pad=n=>String(n).padStart(2,'0');
 const dkey=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
 const today=()=>dkey(new Date());
 const day=k=>log.days[k]||(log.days[k]={ex:{},done:[]});
 const daySecs=k=>{const d=log.days[k];return d?Object.values(d.ex).reduce((a,b)=>a+b,0):0};
 const fmt=s=>{const m=Math.round(s/60);if(m<60)return m+' min';return Math.floor(m/60)+' h '+pad(m%60)};
 // --- recording: follow the app's own timer (its remaining seconds), so a throttled background tab still counts right
 let lastIdx=null,lastRem=null;
 setInterval(()=>{
  if(typeof plan==='undefined'||typeof index==='undefined'||typeof remaining==='undefined')return;
  const isRun=typeof running!=='undefined'&&running;
  if(lastIdx===index&&lastRem!==null&&isRun){
   const d=lastRem-remaining;
   if(d>0&&d<3600){const p=plan[index];if(p){const k=today(),D=day(k);D.ex[p.name]=(D.ex[p.name]||0)+d;dirty=true;if(view==='history')renderSoon()}}
  }
  lastIdx=index;lastRem=remaining;
  if(typeof completedExercises!=='undefined'&&completedExercises.size){
   const D=day(today());for(const i of completedExercises){const p=plan[i];if(p&&!D.done.includes(p.name)){D.done.push(p.name);dirty=true}}
  }
 },1000);
 setInterval(save,8000);
 document.addEventListener('visibilitychange',save);window.addEventListener('pagehide',save);
 // --- tab
 const nav=top.querySelector('.alt-tabs');
 const tb=document.createElement('button');tb.type='button';tb.setAttribute('role','tab');tb.dataset.view='history';
 tb.innerHTML='<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>History';
 nav.append(tb);
 let view=shell.dataset.view;
 // --- view
 const hv=document.createElement('section');hv.className='alt-view alt-history';
 hv.innerHTML=`<h2 class="alt-h">History</h2>
  <div class="alt-hstats"><div class="alt-stat"><span>This week</span><b id="hWeek">0 min</b></div><div class="alt-stat"><span>Streak</span><b id="hStreak">0 days</b><small id="hStreakNote"></small></div><div class="alt-stat"><span>Days this month</span><b id="hMonth">0</b></div><div class="alt-stat"><span>All time</span><b id="hAll">0 min</b><small id="hAllNote"></small></div></div>
  <div class="alt-hgrid">
   <div class="alt-hcal-card"><div class="alt-hcal-head"><span>Last 18 weeks</span><span class="alt-hlegend"><em>Less</em><i data-l="0"></i><i data-l="1"></i><i data-l="2"></i><i data-l="3"></i><i data-l="4"></i><em>More</em></span></div><div class="alt-hcal" id="hCal" role="grid" aria-label="Practice calendar"></div></div>
   <div class="alt-hday"><div class="alt-hday-head"><h3 id="hDayTitle"></h3><span id="hDayTotal"></span></div><div id="hDayList" class="alt-hlist"></div>
    <div class="alt-hio"><button type="button" class="secondary alt-btn-ico" id="hExport">Export history</button><button type="button" class="secondary alt-btn-ico" id="hImport">Import history</button><input type="file" id="hImportFile" accept="application/json,.json" hidden></div>
   </div>
  </div>`;
 shell.append(hv);
 let sel=today();
 const level=s=>s<=0?0:s<15*60?1:s<30*60?2:s<60*60?3:4;
 function render(){
  // stats
  const now=new Date(),mon=new Date(now);mon.setHours(0,0,0,0);mon.setDate(mon.getDate()-((mon.getDay()+6)%7));
  let wk=0;for(let i=0;i<7;i++){const d=new Date(mon);d.setDate(mon.getDate()+i);wk+=daySecs(dkey(d))}
 // streak: practice days in a row, where up to two rest days in a row don't break it
  const REST=2,dayN=k=>Math.round(new Date(k+'T12:00:00').getTime()/864e5);
  const pd=Object.keys(log.days).filter(k=>daySecs(k)>=60).sort();
  let streak=0,restLeft=REST,resting=false;
  if(pd.length){const gap=dayN(today())-dayN(pd[pd.length-1]);
   if(gap<=REST+1){streak=1;for(let i=pd.length-2;i>=0;i--){if(dayN(pd[i+1])-dayN(pd[i])<=REST+1)streak++;else break}
    if(gap>=2){resting=true;restLeft=REST-(gap-1)}}   // rest days = full days already gone by without practice (today isn't over yet)
   var sGap=gap}
  const sn=$('hStreakNote');
  sn.textContent=!streak?'Up to 2 rest days in a row are fine':resting?(restLeft>0?'1 rest day taken · 1 more allowed':'2 rest days taken · play today to keep it'):(sGap===1?'Play today to add a day':'Up to 2 rest days in a row are fine');
  // all time
  let all=0,allDays=0;for(const k in log.days){const s=daySecs(k);all+=s;if(s>=60)allDays++}
  $('hAll').textContent=fmt(all);$('hAllNote').textContent=allDays+(allDays===1?' day':' days')+' practised';
  let md=0;for(const k in log.days){if(k.slice(0,7)===today().slice(0,7)&&daySecs(k)>=60)md++}
  $('hWeek').textContent=fmt(wk);$('hStreak').textContent=streak+(streak===1?' day':' days');$('hMonth').textContent=md;
  // calendar: 18 weeks, Monday first, today in the last column
  const cal=$('hCal');cal.innerHTML='';
  const start=new Date(mon);start.setDate(mon.getDate()-17*7);
  for(let w=0;w<18;w++){const col=document.createElement('div');col.className='alt-hcol';
   for(let d=0;d<7;d++){const dt=new Date(start);dt.setDate(start.getDate()+w*7+d);const k=dkey(dt);
    const b=document.createElement('button');b.type='button';b.className='alt-hcell';
    if(dt>now){b.disabled=true;b.classList.add('future')}
    const s=daySecs(k);b.dataset.l=level(s);
    if(k===sel)b.classList.add('sel');if(k===today())b.classList.add('today');
    b.title=dt.toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'})+(s?' · '+fmt(s):'');
    b.setAttribute('aria-label',b.title);b.onclick=()=>{sel=k;render()};col.append(b)}
   cal.append(col)}
  // the chosen day
  const dt=new Date(sel+'T12:00:00');
  $('hDayTitle').textContent=sel===today()?'Today':dt.toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});
  const D=log.days[sel]||{ex:{},done:[],note:''},tot=daySecs(sel);
  $('hDayTotal').textContent=tot?fmt(tot):'';
  const list=$('hDayList');list.innerHTML='';
  const items=Object.entries(D.ex).filter(([,s])=>s>=30).sort((a,b)=>b[1]-a[1]);
  if(!items.length){list.innerHTML='<p class="alt-hempty">'+(sel===today()?'No practice yet today. Start the timer and it’s recorded here.':'No practice recorded.')+'</p>'}
  const max=Math.max(1,...items.map(x=>x[1]));
  for(const [n,s] of items){const r=document.createElement('div');r.className='alt-hrow';
   r.innerHTML='<span class="n"></span><span class="bar"><i style="width:'+Math.max(4,Math.round(s/max*100))+'%"></i></span><span class="m"></span>';
   r.querySelector('.n').textContent=n+(D.done.includes(n)?' ✓':'');r.querySelector('.m').textContent=fmt(s);list.append(r)}
 }
 let rs=null;const renderSoon=()=>{if(!rs)rs=setTimeout(()=>{rs=null;render()},300)};
 $('hExport').onclick=()=>{save();const blob=new Blob([JSON.stringify(log,null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='piano-practice-history.json';document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)};
 $('hImport').onclick=()=>$('hImportFile').click();
 $('hImportFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());if(!d||!d.days)throw 0;
   for(const [k,v] of Object.entries(d.days)){const D=day(k);for(const [n,s] of Object.entries(v.ex||{}))D.ex[n]=Math.max(D.ex[n]||0,s);for(const n of v.done||[])if(!D.done.includes(n))D.done.push(n);if(v.note&&(!D.note||v.note.length>D.note.length))D.note=v.note}
   dirty=true;save();render()}catch(err){alert('That file isn’t a Piano Practice history.')}e.target.value=''};
 // keep the tab state in step with the shell
 new MutationObserver(()=>{view=shell.dataset.view;tb.setAttribute('aria-selected',view==='history');if(view==='history')render()}).observe(shell,{attributes:true,attributeFilter:['data-view']});
 tb.addEventListener('click',()=>{shell.dataset.view='history';nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-selected',b===tb));try{const s=JSON.parse(localStorage.getItem('pp-alt-shell')||'{}');s.view='history';localStorage.setItem('pp-alt-shell',JSON.stringify(s))}catch(e){};window.scrollTo({top:0})});
 if(shell.dataset.view==='history'){tb.setAttribute('aria-selected','true');render()}
 window.__altHistory={render,log:()=>log,save};
}

// Alternative interface: plan, tools and timer kept apart. Moves the app's own elements (their behaviour stays the same).
function altShellInit(){
 window.ppToolsAnytime=true;   // tools open at any time, so the Fake Book keeps playing whatever exercise is current
 document.title='Practice';
 const $=id=>document.getElementById(id);
 const ICON={plan:'<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',tools:'<svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-2.4z"/></svg>',
  ear:'<svg viewBox="0 0 48 48" class="alt-ico48"><path d="M12 22.4v-2.6a12.6 12.6 0 0 1 25.2 0c0 8.1-5.9 11.3-10.2 14.6-3.1 2.4-3.4 7.6-9.4 7.6-4.8 0-7.6-3.5-7.6-7.7"/><path d="M19 23v-3.4a5.6 5.6 0 0 1 11.2 0c0 3-1.7 5.3-4.1 6.8-2.4 1.5-3.7 2.8-3.7 5.5"/></svg>',
  dice:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h.01M15 15h.01M15 9h.01M9 15h.01"/></svg>',
  progressions:'<svg viewBox="0 0 24 24" class="alt-ico-chords"><ellipse cx="4.2" cy="20.2" rx="2.75" ry="1.85" transform="rotate(-24 4.2 20.2)"/><ellipse cx="4.2" cy="15.2" rx="2.75" ry="1.85" transform="rotate(-24 4.2 15.2)"/><ellipse cx="4.2" cy="10.2" rx="2.75" ry="1.85" transform="rotate(-24 4.2 10.2)"/><ellipse cx="12" cy="17.2" rx="2.75" ry="1.85" transform="rotate(-24 12 17.2)"/><ellipse cx="12" cy="12.2" rx="2.75" ry="1.85" transform="rotate(-24 12 12.2)"/><ellipse cx="12" cy="7.2" rx="2.75" ry="1.85" transform="rotate(-24 12 7.2)"/><ellipse cx="19.8" cy="14.2" rx="2.75" ry="1.85" transform="rotate(-24 19.8 14.2)"/><ellipse cx="19.8" cy="9.2" rx="2.75" ry="1.85" transform="rotate(-24 19.8 9.2)"/><ellipse cx="19.8" cy="4.2" rx="2.75" ry="1.85" transform="rotate(-24 19.8 4.2)"/></svg>',
  repertoire:'<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>'};
 const TOOLS=[['ear','Ear Training','earTraining'],['dice','Chord Dice','chordDice'],['progressions','Progressions','progressionGenerator'],['repertoire','Fake Book','repertoirePanel']];
 const main=document.querySelector('main'),oldHeader=main.querySelector('header');
 const shell=document.createElement('div');shell.className='alt-shell';
 let saved={};try{saved=JSON.parse(localStorage.getItem('pp-alt-shell')||'{}')||{}}catch(e){}
 shell.dataset.view=saved.view||'plan';shell.dataset.tool=saved.tool||'repertoire';
 const store=()=>{try{localStorage.setItem('pp-alt-shell',JSON.stringify({view:shell.dataset.view,tool:shell.dataset.tool}))}catch(e){}};
 // top bar
 const top=document.createElement('div');top.className='alt-top';top.setAttribute('role','banner');
 top.innerHTML='<div class="alt-brand"><span class="alt-logo" aria-hidden="true">♪</span><span>Practice</span></div>'+
  '<nav class="alt-tabs" role="tablist" aria-label="Sections"><button type="button" role="tab" data-view="plan">'+ICON.plan+'Plan</button><button type="button" role="tab" data-view="tools">'+ICON.tools+'Tools</button></nav><div class="alt-actions"></div>';
 const acts=oldHeader&&oldHeader.querySelector('.header-actions');if(acts)top.querySelector('.alt-actions').append(...acts.children);
 // timer bar
 const timerbar=document.createElement('div');timerbar.className='alt-timerbar';
 const tp=$('timerPanel');timerbar.append(tp);
 const info=document.createElement('div');info.className='alt-info';// look inside the panel: it has just been moved into a container that is not in the page yet
 info.append(tp.querySelector('#exercise'),tp.querySelector('#stepLabel'));tp.prepend(info);
 const openTool=document.createElement('button');openTool.type='button';openTool.className='alt-open-tool';openTool.hidden=true;tp.append(openTool);
 // plan view
 const planView=document.createElement('section');planView.className='alt-view alt-plan';
 planView.innerHTML='<div class="alt-plan-wrap"><h2 class="alt-h">Today’s plan</h2><p class="alt-sub">Pick an exercise to start the timer. Exercises with a tool open it in Tools.</p></div>';
 const wrap=planView.firstChild;const sidebar=document.querySelector('.apple-sidebar');if(sidebar)wrap.append(...sidebar.children);
 // tools view
 const toolsView=document.createElement('section');toolsView.className='alt-view alt-tools';
 toolsView.innerHTML='<h2 class="alt-h">Tools</h2><p class="alt-sub">Open any tool at any time; the timer keeps running at the top.</p><div class="alt-switch" role="group" aria-label="Choose a tool"></div><div class="alt-toolhost"></div>';
 const sw=toolsView.querySelector('.alt-switch'),host=toolsView.querySelector('.alt-toolhost');
 for(const [key,label,id] of TOOLS){
  const b=document.createElement('button');b.type='button';b.dataset.tool=key;b.innerHTML=ICON[key]+'<span>'+label+'</span>';sw.append(b);
  const el=$(id);if(el)host.append(el);
 }
 shell.append(top,timerbar,planView,toolsView);main.prepend(shell);
 if(oldHeader)oldHeader.hidden=true;
 // behaviour
 const setView=v=>{shell.dataset.view=v;top.querySelectorAll('.alt-tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.view===v));store();window.scrollTo({top:0})};
 const setTool=t=>{shell.dataset.tool=t;sw.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tool===t));store()};
 top.querySelectorAll('.alt-tabs button').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
 sw.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
 const toolOf=p=>typeof exerciseTool==='function'?exerciseTool(p):(p?(p.tool||(typeof inferTool==='function'?inferTool(p.name):null)):null);
 let lastIndex=-1;
 const sync=()=>{
  const p=(typeof plan!=='undefined'&&typeof index!=='undefined')?plan[index]:null,t=toolOf(p),tool=TOOLS.find(x=>x[0]===t);
  openTool.hidden=!tool||shell.dataset.view==='tools'&&shell.dataset.tool===t;
  if(tool&&openTool.dataset.tool!==t){openTool.dataset.tool=t;openTool.innerHTML=ICON[t]+'<span>Open '+tool[1]+'</span><span aria-hidden="true">→</span>'}
  openTool.onclick=()=>{if(tool){setTool(t);setView('tools')}};
  if(typeof index!=='undefined'&&index!==lastIndex){lastIndex=index;if(tool)setTool(t)}     // the current exercise's tool is pre-selected
  sw.querySelectorAll('button').forEach(b=>{let n=b.querySelector('.alt-now');if(b.dataset.tool===t){if(!n){n=document.createElement('span');n.className='alt-now';n.title='Current exercise';n.setAttribute('aria-label','current exercise');b.append(n)}}else if(n)n.remove()});
  badges();
 };
 // The app redraws the plan list every second while the timer runs; put the tool badges back in the same moment, before the screen updates
 function badges(){
  document.querySelectorAll('#schedule .item').forEach((it,i)=>{
   const left=it.querySelector('.left');
   if(left){let s=left.querySelector('.alt-step');if(!s){s=document.createElement('span');s.className='alt-step';s.setAttribute('aria-hidden','true');left.prepend(s)}
    const num=String(i+1);if(s.textContent!==num)s.textContent=num;}
   const nmEl=it.querySelector('.name');it.classList.toggle('alt-break',typeof isBreak==='function'?isBreak(typeof plan!=='undefined'?plan[i]:null):(!!nmEl&&/^(break|pausa)$/i.test(nmEl.textContent.trim())));
   const nm=it.querySelector('.name');const tt=toolOf(typeof plan!=='undefined'?plan[i]:null);const tl=TOOLS.find(x=>x[0]===tt);
   let bd=it.querySelector('.alt-badge');
   if(tl){if(!bd||bd.dataset.tool!==tt){if(bd)bd.remove();bd=document.createElement('span');bd.className='alt-badge';bd.dataset.tool=tt;bd.innerHTML=ICON[tt]+'<span>'+tl[1]+'</span>';(nm||it).after(bd)}}
   else if(bd)bd.remove();
  });
 }
 const sched=$('schedule');if(sched)new MutationObserver(()=>{badges();planSummary()}).observe(sched,{childList:true,subtree:true});
 // plan header: title, a one-line summary and the Edit button on one row, with a progress bar under it
 const pw=planView.querySelector('.alt-plan-wrap'),ph2=pw&&pw.querySelector('.alt-h');
 const phead=document.createElement('div');phead.className='alt-plan-head';
 const ptitle=document.createElement('div');ptitle.className='alt-plan-title';
 const psum=document.createElement('p');psum.className='alt-plan-sum';
 if(ph2){ph2.before(phead);ptitle.append(ph2,psum);phead.append(ptitle);const tw=pw.querySelector('.editor-toggle-wrap');if(tw)phead.append(tw)}
 const pbar=document.createElement('div');pbar.className='alt-plan-bar';pbar.innerHTML='<i></i>';phead.after(pbar);
 const fmtM=m=>m<60?m+' min':Math.floor(m/60)+' h '+String(m%60).padStart(2,'0');
 function planSummary(){
  if(typeof plan==='undefined')return;
  const tot=plan.reduce((a,p)=>a+(+p.minutes||0),0);let done=0,dm=0;
  plan.forEach((p,i)=>{if(typeof completedExercises!=='undefined'&&completedExercises.has(i)){done++;dm+=+p.minutes||0}});
  const t=done+' of '+plan.length+' done · '+fmtM(tot-dm)+' left of '+fmtM(tot);if(psum.textContent!==t)psum.textContent=t;
  pbar.firstChild.style.width=(tot?dm/tot*100:0)+'%';
 }
 planSummary();setInterval(planSummary,1000);
 // ---- the die: a drawn die with pips, following the app's own rolling glyph ----
 const FACES='⚀⚁⚂⚃⚄⚅',PIPS={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
 function makeDie(){const d=document.createElement('div');d.className='alt-die';d.setAttribute('aria-hidden','true');d.innerHTML='<div class="alt-die-body">'+[1,2,3,4,5,6,7,8,9].map(i=>'<i data-p="'+i+'"></i>').join('')+'</div><div class="alt-die-shadow"></div>';return d}
 const setFace=(d,n)=>{d.dataset.face=n;d.querySelectorAll('i').forEach(p=>p.classList.toggle('on',PIPS[n].includes(+p.dataset.p)))};
 const glyphFace=t=>{const k=FACES.indexOf((t||'').trim());return k<0?5:k+1};
 const rolling=$('rollingDie');
 if(rolling){
  const rd=makeDie();rd.classList.add('alt-die-roll');rolling.after(rd);setFace(rd,5);
  new MutationObserver(()=>{
   const on=rolling.classList.contains('rolling')&&rolling.style.display!=='none';
   rd.hidden=!on;if(on){setFace(rd,glyphFace(rolling.textContent));if(!rd.classList.contains('go')){rd.classList.remove('go');void rd.offsetWidth;rd.classList.add('go')}}else rd.classList.remove('go');
  }).observe(rolling,{attributes:true,childList:true,characterData:true,subtree:true});
  rd.hidden=true;
 }
 const dc=$('diceChord');
 const idleDie=()=>{if(!dc)return;const g=dc.querySelector('.die-idle');let d=dc.querySelector('.alt-die-idle');
  if(g&&!d){d=makeDie();d.classList.add('alt-die-idle');setFace(d,5);g.after(d)}else if(!g&&d)d.remove()};
 if(dc){new MutationObserver(idleDie).observe(dc,{childList:true,subtree:true});idleDie()}
 // the tools' start icons use the same icons as the tool switcher
 const swapStarters=()=>{
  for(const [hostId,key] of [['progressionGenerator','progressions']]){   // Ear Training keeps its original icon
   const h=$(hostId);if(!h)continue;
   h.querySelectorAll('svg.starter-svg:not([data-alt])').forEach(s=>{s.setAttribute('data-alt','1');s.setAttribute('viewBox','0 0 24 24');s.classList.add('alt-ico-chords');s.innerHTML=ICON.progressions.replace(/^<svg[^>]*>|<\/svg>$/g,'')});
  }
 };
 for(const id of ['earTraining','progressionGenerator']){const h=$(id);if(h)new MutationObserver(swapStarters).observe(h,{childList:true,subtree:true})}
 swapStarters();
 // Repertoire order: song, player, settings, chart; sound settings inside the mixer panel
 const ws=$('repSongWorkspace');
 if(ws){
  const head=ws.querySelector('.rep-song-head'),tr=ws.querySelector('.rep-transport'),stt=$('repPlayingStatus'),tb=ws.querySelector('.rep-toolbar');
  if(head&&tr&&tb){const pl=document.createElement('div');pl.className='alt-player';pl.append(tr);if(stt)pl.append(stt);head.after(pl)}
  const mix=ws.querySelector('.rep-mixer-disclosure'),ps=ws.querySelector('.rep-practice-settings');
  if(mix&&ps){mix.append(ps);const sm=mix.querySelector('summary');if(sm)sm.textContent='Sound & mixer'}
  const vol=$('repVolume');if(mix&&vol){const blk=vol.closest('.rep-ctrl')||vol;if(!mix.contains(blk)){blk.classList.add('alt-bandvol');mix.append(blk)}}   // only the band volume; the loop bar stays with the chart
 }
 // Repertoire side column: the song list, then sound and mixer, then print / export
 {
  const lay=document.querySelector('#repertoirePanel .rep-layout'),mix=document.querySelector('#repertoirePanel .rep-mixer-disclosure'),pr=$('repPrint');
  if(lay&&mix){const snd=document.createElement('div');snd.className='alt-rep-sound';snd.append(mix);lay.append(snd);if(matchMedia('(min-width:980px)').matches)mix.open=true}
  if(lay&&pr){const ex=document.createElement('div');ex.className='alt-rep-export';ex.append(pr.parentElement);lay.append(ex)}
 }
 const rr=$('repRepeats');if(rr)rr.title='Repeats: how many times the song plays';
 // tonal buttons: give the chosen buttons an icon, drop the old "+" from labels, keep icon-only buttons named
 for(const id of ['repNew','repImport','repExport','repEdit','repDuplicate','repDelete','repPrint','repExportSong','reset','toggleEditor','hExport','hImport','repImportPickFile','addExercise','addBreak']){const el=$(id);if(el)el.classList.add('alt-btn-ico')}
 for(const id of ['repNew','addExercise','addBreak']){const el=$(id);if(el)el.textContent=el.textContent.replace(/^\+\s*/,'')}
 const dup=$('repDuplicate'),del=$('repDelete');if(dup)dup.setAttribute('aria-label','Copy song');if(del)del.setAttribute('aria-label','Delete song');
 // tools' start buttons: short, clear labels instead of "TAP TO …"
 const LABELS=[[/^tap to start$/i,'Start'],[/^tap to generate$/i,'Generate'],[/^tap to roll again$/i,'Roll again'],[/^tap to roll$/i,'Roll'],[/^tap to reveal$/i,'Reveal']];
 const relabel=root=>{root.querySelectorAll('.starter-label,#diceEyebrow,#earHint').forEach(el=>{const t=(el.textContent||'').trim();for(const [re,l] of LABELS)if(re.test(t)&&t!==l){el.textContent=l;break}
   el.classList.toggle('alt-hide',/^rolling/i.test(t))})};   // no "Rolling…" text: the die says it
 for(const id of ['earTraining','chordDice','progressionGenerator']){const h=$(id);if(h){relabel(h);new MutationObserver(()=>relabel(h)).observe(h,{childList:true,subtree:true,characterData:true})}}
 // phones: the song list folds into one bar ("Songs · 3 · current song"), so the song and its Play come first
 {const lib=document.querySelector('#repertoirePanel .rep-library');
  if(lib){
   const bar=document.createElement('button');bar.type='button';bar.className='alt-songs-bar';bar.setAttribute('aria-expanded','false');
   bar.innerHTML='<span class="alt-songs-l">Songs <b></b></span><span class="alt-songs-cur"></span><span class="alt-songs-chev" aria-hidden="true"></span>';
   lib.prepend(bar);
   const narrow=matchMedia('(max-width:979px)');
   const setOpen=o=>{lib.classList.toggle('alt-open',o);bar.setAttribute('aria-expanded',String(o))};
   // writes only when the text really changes, and ignores its own changes: otherwise a browser that reports every
   // rewrite as a change (Safari) would make the bar react to itself forever and the page would never finish loading
   const setText=(el,v)=>{if(el&&el.textContent!==v)el.textContent=v};
   const fill=muts=>{if(muts&&muts.every(m=>bar.contains(m.target)))return;
    setText(bar.querySelector('b'),($('repSongCount')||{}).textContent||'');setText(bar.querySelector('.alt-songs-cur'),($('repTitle')||{}).textContent||'')};
   bar.addEventListener('click',()=>setOpen(!lib.classList.contains('alt-open')));
   lib.addEventListener('click',e=>{if(narrow.matches&&e.target.closest('.rep-list-item'))setTimeout(()=>{setOpen(false);const w=$('repSongWorkspace');if(w)w.scrollIntoView({block:'start',behavior:'smooth'})},60)});
   new MutationObserver(fill).observe(document.getElementById('repertoirePanel'),{childList:true,subtree:true,characterData:true});fill();setOpen(false);
  }}
 // Fake Book bar under the timer: shown only while the Play / Stop above the chart are out of view
 {const play=$('repPlay'),stopB=$('repStop'),tb=document.querySelector('.alt-timerbar'),panel=$('repertoirePanel');
  if(play&&stopB&&tb&&panel){
   const ICON={play:'<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',pause:'<svg viewBox="0 0 24 24"><rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>',stop:'<svg viewBox="0 0 24 24"><rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor"/></svg>'};
   const bar=document.createElement('div');bar.className='alt-fbbar';bar.setAttribute('role','region');bar.setAttribute('aria-label','Fake Book player');
   bar.innerHTML='<svg class="fb-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17.5V6l10-2v11.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.5" cy="17.5" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16.5" cy="15.5" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/></svg><div class="fb-info"><div class="fb-title"></div><div class="fb-status"></div><div class="fb-prog"><i></i></div></div><button type="button" class="fb-play" aria-label="Play"></button><button type="button" class="fb-stop" aria-label="Stop">'+ICON.stop+'</button>';
   // like the timer bar: a full-width band in the page colour behind it, fading out at the bottom
   const wrap=document.createElement('div');wrap.className='alt-fbwrap';wrap.append(bar);document.body.append(wrap);
   const set=(el,v,html)=>{if(html){if(el.innerHTML!==v)el.innerHTML=v}else if(el.textContent!==v)el.textContent=v};
   bar.querySelector('.fb-play').addEventListener('click',()=>play.click());bar.querySelector('.fb-stop').addEventListener('click',()=>stopB.click());
   let offscreen=false;
   const sync=()=>{
    const st=($('repPlayingStatus')||{}).textContent||'',bpm=(($('repTempoLabel')||{}).textContent||($('repTempo')||{}).value||'').trim();
    set(bar.querySelector('.fb-title'),($('repTitle')||{}).textContent||'');
    const short=st.replace(/^Measure\s+(\d+)\s+of\s+(\d+)/,'$1 / $2');   // "12 / 36 · Chorus 1" fits a phone
    set(bar.querySelector('.fb-status'),short+(bpm&&!/bpm/.test(st)?' · '+bpm.replace(/\s*bpm/i,'')+' bpm':''));
    const m=/Measure\s+(\d+)\s+of\s+(\d+)/.exec(st);bar.querySelector('.fb-prog i').style.width=m?Math.round(m[1]/m[2]*100)+'%':'0%';
    const playing=/Pause/.test(play.textContent||'');const pb=bar.querySelector('.fb-play');set(pb,playing?ICON.pause:ICON.play,true);pb.setAttribute('aria-label',playing?'Pause':'Play');
   };
   const place=()=>{const r=tb.getBoundingClientRect(),card=tb.firstElementChild?tb.firstElementChild.getBoundingClientRect():r;wrap.style.top=Math.round(Math.max(0,card.bottom))+'px';bar.style.marginLeft=Math.round(card.left)+'px';bar.style.width=Math.round(card.width)+'px'};
   const update=()=>{const sh=document.querySelector('.alt-shell'),inFb=sh&&sh.dataset.view==='tools'&&sh.dataset.tool==='repertoire';
    const pr=play.getBoundingClientRect(),hidden=pr.bottom<tb.getBoundingClientRect().bottom+4||pr.top>innerHeight;offscreen=inFb&&hidden&&play.offsetParent!==null;
    if(offscreen){place();sync()}wrap.classList.toggle('show',offscreen);bar.classList.toggle('show',offscreen)};
   addEventListener('scroll',update,{passive:true});addEventListener('resize',update);
   new MutationObserver(()=>{if(offscreen)sync();update()}).observe(panel,{subtree:true,childList:true,characterData:true});
   new MutationObserver(update).observe(document.querySelector('.alt-shell'),{attributes:true,attributeFilter:['data-view','data-tool']});
   update();
  }}
 // shorter helper texts
 const foot=document.querySelector('.rep-chart-foot span');if(foot)foot.textContent='Drag across bars to loop';
 const st=$('repPlayingStatus');if(st&&st.querySelector('.rep-shortcuts'))st.textContent='Ready to play';
 const pb=$('repPlay');if(pb)pb.title='Space: play/pause · Esc: stop';
 // one button for play and pause: it drives the app's own Start and Pause buttons
 const stB=$('start'),paB=$('pause');
 if(stB&&paB){
  const pp=document.createElement('button');pp.type='button';pp.className='alt-playpause';pp.innerHTML='<span class="alt-ico" aria-hidden="true"></span>';
  stB.before(pp);
  const upd=()=>{const running=!paB.disabled;pp.classList.toggle('is-pause',running);
   const label=running?'Pause':((stB.textContent||'').trim()||'Start');pp.setAttribute('aria-label',label);pp.title=label;
   pp.disabled=!running&&stB.disabled};
  pp.addEventListener('click',()=>{if(!paB.disabled)paB.click();else if(!stB.disabled)stB.click();upd()});
  new MutationObserver(upd).observe(stB,{attributes:true,childList:true,characterData:true,subtree:true});
  new MutationObserver(upd).observe(paB,{attributes:true});upd();
 }
 // the status light: green while the timer runs (or the plan is finished), yellow while it's stopped
 const ss=$('sessionState');
 if(ss){const st=()=>{const t=(ss.textContent||'').toLowerCase();ss.dataset.state=t.includes('progress')?'running':t.includes('finish')?'finished':'stopped'};
  new MutationObserver(st).observe(ss,{childList:true,characterData:true,subtree:true});st()}
 // centre the timer digits on the ring, measured with whatever font is actually in use
 function alignClock(){
  const c=$('clock'),face=tp.querySelector('.timer-face');if(!c||!face)return;
  c.style.transform='';
  const cs=getComputedStyle(c),cv=document.createElement('canvas').getContext('2d');
  cv.font=cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;const m=cv.measureText(c.textContent||'00:00');
  const r=document.createRange();r.selectNodeContents(c);const g=r.getBoundingClientRect();if(!g.height)return;
  const base=g.top+(g.height+(m.fontBoundingBoxAscent-m.fontBoundingBoxDescent))/2;
  const ink=base+(m.actualBoundingBoxDescent-m.actualBoundingBoxAscent)/2;
  const fr=face.getBoundingClientRect(),d=(fr.top+fr.height/2)-ink;
  if(Math.abs(d)>.4)c.style.transform='translateY('+d.toFixed(1)+'px)';
 }
 alignClock();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(alignClock);
 window.addEventListener('resize',()=>requestAnimationFrame(alignClock));
 setView(shell.dataset.view);setTool(shell.dataset.tool);sync();
 if(typeof altHistoryInit==='function')altHistoryInit(shell,top,ICON);
 setInterval(sync,700);
}
let altStarted=false;
function altStart(){if(altStarted)return;altStarted=true;
 try{altShellInit()}catch(e){console.error('Practice interface could not start; showing the classic layout',e);try{document.querySelector('.alt-shell')?.classList.remove('alt-shell');document.body.classList.remove('alt-body')}catch(_){}}
}
// start once the page and the app's own scripts are ready (not after every download, such as sounds)
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(altStart,0));else setTimeout(altStart,0);
window.addEventListener('load',altStart);   // after the app has finished building its own layout
