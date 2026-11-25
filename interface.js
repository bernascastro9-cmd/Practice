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
 let others={days:{}};try{const o=JSON.parse(localStorage.getItem('pp-sync-others')||'null');if(o&&o.days)others=o}catch(e){}
 const allDays=()=>{const out={};for(const src of [log.days,others.days])for(const [k,v] of Object.entries(src||{})){const D=out[k]||(out[k]={ex:{},done:[]});for(const [n,s] of Object.entries(v.ex||{}))D.ex[n]=(D.ex[n]||0)+s;for(const n of v.done||[])if(!D.done.includes(n))D.done.push(n);for(const n of v.free||[]){if(!D.free)D.free=[];if(!D.free.includes(n))D.free.push(n)}}return out};
 let VD=null;const days=()=>VD||allDays();
 const daySecs=k=>{const d=days()[k];return d?Object.values(d.ex).reduce((a,b)=>a+b,0):0};
 window.ppHistoryOwn=()=>log;window.ppHistoryOthers=o=>{others=o&&o.days?o:{days:{}};try{localStorage.setItem('pp-sync-others',JSON.stringify(others))}catch(e){}if(view==='history')renderSoon()};
 window.ppHistorySave=()=>{dirty=true;save()};
 const fmt=s=>{const m=Math.round(s/60);if(m<60)return m+' min';return Math.floor(m/60)+' h '+pad(m%60)};
 // --- recording: follow the app's own timer (its remaining seconds), so a throttled background tab still counts right
 let lastIdx=null,lastRem=null,lastFreeRem=null;
 setInterval(()=>{
  if(typeof plan==='undefined'||typeof index==='undefined'||typeof remaining==='undefined')return;
  const isRun=typeof running!=='undefined'&&running;
  if(lastIdx===index&&lastRem!==null&&isRun){
   const d=lastRem-remaining;
   if(d>0&&d<3600){const p=plan[index];if(p){const k=today(),D=day(k);D.ex[p.name]=(D.ex[p.name]||0)+d;dirty=true;if(view==='history')renderSoon()}}
  }
  lastIdx=index;lastRem=remaining;
  // the free timer counts too, as "Free timer"
  {const f=typeof free!=='undefined'?free:null;if(f&&f.running&&lastFreeRem!==null){const d=lastFreeRem-f.remaining;if(d>0&&d<3600){const D=day(today());D.ex['Free timer']=(D.ex['Free timer']||0)+d;if(!D.free)D.free=[];if(!D.free.includes('Free timer'))D.free.push('Free timer');dirty=true;if(view==='history')renderSoon()}}lastFreeRem=f?f.remaining:null}
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
  VD=allDays();try{renderInner()}finally{VD=null}
 }
 function renderInner(){
  // stats
  const now=new Date(),mon=new Date(now);mon.setHours(0,0,0,0);mon.setDate(mon.getDate()-((mon.getDay()+6)%7));
  let wk=0;for(let i=0;i<7;i++){const d=new Date(mon);d.setDate(mon.getDate()+i);wk+=daySecs(dkey(d))}
 // streak: practice days in a row, where up to two rest days in a row don't break it
  const REST=2,dayN=k=>Math.round(new Date(k+'T12:00:00').getTime()/864e5);
  const pd=Object.keys(days()).filter(k=>daySecs(k)>=60).sort();
  let streak=0,restLeft=REST,resting=false;
  if(pd.length){const gap=dayN(today())-dayN(pd[pd.length-1]);
   if(gap<=REST+1){streak=1;for(let i=pd.length-2;i>=0;i--){if(dayN(pd[i+1])-dayN(pd[i])<=REST+1)streak++;else break}
    if(gap>=2){resting=true;restLeft=REST-(gap-1)}}   // rest days = full days already gone by without practice (today isn't over yet)
   var sGap=gap}
  const sn=$('hStreakNote');
  sn.textContent=!streak?'Up to 2 rest days in a row are fine':resting?(restLeft>0?'1 rest day taken · 1 more allowed':'2 rest days taken · play today to keep it'):(sGap===1?'Play today to add a day':'Up to 2 rest days in a row are fine');
  // all time
  let all=0,allDays=0;for(const k in days()){const s=daySecs(k);all+=s;if(s>=60)allDays++}
  $('hAll').textContent=fmt(all);$('hAllNote').textContent=allDays+(allDays===1?' day':' days')+' practised';
  let md=0;for(const k in days()){if(k.slice(0,7)===today().slice(0,7)&&daySecs(k)>=60)md++}
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
  const D=days()[sel]||{ex:{},done:[],note:''},tot=daySecs(sel);
  $('hDayTotal').textContent=tot?fmt(tot):'';
  const list=$('hDayList');list.innerHTML='';
  const items=Object.entries(D.ex).filter(([,s])=>s>=30).sort((a,b)=>b[1]-a[1]);
  if(!items.length){list.innerHTML='<p class="alt-hempty">'+(sel===today()?'No practice yet today. Start the timer and it’s recorded here.':'No practice recorded.')+'</p>'}
  const max=Math.max(1,...items.map(x=>x[1]));
  for(const [n,s] of items){const r=document.createElement('div');r.className='alt-hrow';
   r.innerHTML='<span class="n"></span><span class="bar"><i style="width:'+Math.max(4,Math.round(s/max*100))+'%"></i></span><span class="m"></span>';
   r.querySelector('.n').textContent=n+(D.done.includes(n)?' ✓':'');r.querySelector('.m').textContent=fmt(s);list.append(r);
   // a free-timer row: click its name to rename it right there (Enter or clicking away saves, Esc cancels)
   if((D.free||[]).includes(n)){const nm=r.querySelector('.n');nm.classList.add('alt-hrename');nm.title='Click to rename';
    nm.addEventListener('click',()=>{if(nm.querySelector('input'))return;const inp=document.createElement('input');inp.type='text';inp.value=n;inp.maxLength=60;inp.className='alt-hrename-in';inp.setAttribute('aria-label','Name');
     nm.replaceChildren(inp);inp.focus();inp.select();let done=false;
     const finish=ok=>{if(done)return;done=true;const v=inp.value.trim().replace(/\s+/g,' ').slice(0,60);
      if(ok&&v&&v!==n){const own=log.days[sel];if(own&&own.ex[n]){own.ex[v]=(own.ex[v]||0)+own.ex[n];delete own.ex[n];own.free=(own.free||[]).filter(x=>x!==n);if(!own.free.includes(v))own.free.push(v);if(own.done){own.done=own.done.map(x=>x===n?v:x)}dirty=true;save()}}
      render()};
     inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();finish(true)}else if(e.key==='Escape'){e.preventDefault();finish(false)}});inp.addEventListener('blur',()=>finish(true));inp.addEventListener('click',e=>e.stopPropagation())})}
  }
 }
 let rs=null;const renderSoon=()=>{if(!rs)rs=setTimeout(()=>{rs=null;render()},300)};
 // ===== Sync across devices through the person's own GitHub account (a secret Gist) =====
 // Each device keeps its own practice log; the Gist holds every device's log side by side (so nothing is ever counted twice),
 // the songs (a union, minus deleted ones) and the plan (the most recent change wins).
 {const API='https://api.github.com',FILE='practice-sync.json',DESC='Practice app sync (do not edit)';
  const ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}},del:k=>{try{localStorage.removeItem(k)}catch(e){}}};
  let dev=ls.get('pp-device-id');if(!dev){dev='d'+Math.random().toString(36).slice(2,10);ls.set('pp-device-id',dev)}
  const devName=()=>/iPhone|iPad|Android|Mobile/i.test(navigator.userAgent)?'Phone':'Computer';
  const card=document.createElement('div');card.className='alt-hcard alt-sync';hv.append(card);
  let busy=false,lastMsg='';
  const tok=()=>ls.get('pp-sync-token');
  const gh=async(path,opt={})=>{const r=await fetch(API+path,{...opt,headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+tok(),'X-GitHub-Api-Version':'2022-11-28',...(opt.body?{'Content-Type':'application/json'}:{})}});
   if(r.status===401)throw new Error('the key was not accepted (check it has the Gists permission)');if(!r.ok)throw new Error('GitHub answered '+r.status);return r.status===204?null:r.json()};
  const findGist=async()=>{let id=ls.get('pp-sync-gist');if(id)return id;
   for(let page=1;page<=3;page++){const list=await gh('/gists?per_page=100&page='+page);const g=list.find(x=>x.description===DESC&&x.files&&x.files[FILE]);if(g){ls.set('pp-sync-gist',g.id);return g.id}if(list.length<100)break}
   const g=await gh('/gists',{method:'POST',body:JSON.stringify({description:DESC,public:false,files:{[FILE]:{content:JSON.stringify({version:1,devices:{},songs:[],deleted:[],plan:null})}}})});ls.set('pp-sync-gist',g.id);return g.id};
  const readGist=async id=>{const g=await gh('/gists/'+id);const f=g.files&&g.files[FILE];if(!f)return {version:1,devices:{},songs:[],deleted:[],plan:null};
   const txt=f.truncated?await (await fetch(f.raw_url)).text():f.content;try{return JSON.parse(txt)}catch(e){return {version:1,devices:{},songs:[],deleted:[],plan:null}}};
  const SONGS='piano-practice-repertoire-v1',PLAN='piano-study-custom-plan-v1';
  async function sync(){
   if(busy||!tok())return;busy=true;draw('Syncing…');
   try{
    const id=await findGist();const remote=await readGist(id);
    // practice: the other devices' logs are shown next to this one's
    const othersDays={};for(const [d,v] of Object.entries(remote.devices||{}))if(d!==dev)for(const [k,day] of Object.entries(v.days||{})){const D=othersDays[k]||(othersDays[k]={ex:{},done:[]});for(const [n,s] of Object.entries(day.ex||{}))D.ex[n]=(D.ex[n]||0)+s;for(const n of day.done||[])if(!D.done.includes(n))D.done.push(n)}
    window.ppHistoryOthers&&window.ppHistoryOthers({days:othersDays});
    // songs: everything from both sides, without the ones deleted anywhere
    const delLocal=JSON.parse(ls.get('pp-sync-deleted')||'[]'),deleted=[...new Set([...(remote.deleted||[]),...delLocal])].slice(-1000);
    // a song is recognised by its content (title, artist, chords), so the same song made on two devices is one song
    const sig=s=>[String(s.title||'').trim().toLowerCase(),String(s.artist||'').trim().toLowerCase(),(s.bars||[]).length,(s.bars||[]).slice(0,4).map(b=>(b.chords||[]).join(' ')).join(',')].join('|');
    const local=JSON.parse(ls.get(SONGS)||'[]');const bySig=new Map();for(const s of [...(remote.songs||[]),...local])if(s&&s.id&&!deleted.includes(sig(s)))bySig.set(sig(s),s);
    const merged=[...bySig.values()];const changed=JSON.stringify(merged.map(sig).sort())!==JSON.stringify(local.map(sig).sort());
    ls.set(SONGS,JSON.stringify(merged));ls.set('pp-sync-deleted',JSON.stringify(deleted));if(changed&&window.ppReloadSongs)window.ppReloadSongs();
    // plan: a change made here since the last sync wins; otherwise take the one in the Gist
    const lp=ls.get(PLAN),last=ls.get('pp-sync-plan-last');let planOut=remote.plan||null;
    if(lp&&lp!==last)planOut={data:lp,updated:Date.now()};
    else if(remote.plan&&remote.plan.data&&remote.plan.data!==lp){ls.set(PLAN,remote.plan.data);try{if(typeof loadPlan==='function'){plan=loadPlan();if(index>=plan.length)index=0;render()}}catch(e){}}
    if(planOut)ls.set('pp-sync-plan-last',planOut.data);
    // write back this device's log with everything else
    window.ppHistorySave&&window.ppHistorySave();
    const own=window.ppHistoryOwn?window.ppHistoryOwn():{days:{}};
    const out={version:1,updated:new Date().toISOString(),devices:{...(remote.devices||{}),[dev]:{name:devName(),updated:new Date().toISOString(),days:own.days||{}}},songs:merged,deleted,plan:planOut};
    await gh('/gists/'+id,{method:'PATCH',body:JSON.stringify({files:{[FILE]:{content:JSON.stringify(out)}}})});
    ls.set('pp-sync-last',String(Date.now()));ls.set('pp-sync-devices',String(Object.keys(out.devices).length));lastMsg='';
   }catch(e){lastMsg='Sync failed: '+(e&&e.message||e)}
   finally{busy=false;draw()}
  }
  function draw(state){
   if(!tok()){
    card.innerHTML='<h3>Sync across devices</h3><p class="alt-sync-p">Keep the same history, songs and plan on your computer and your phone, through your own GitHub account. Create a key with only the <b>Gists</b> permission, paste it here, and do the same on the other device.</p>'+
     '<p class="alt-sync-p"><a href="https://github.com/settings/tokens/new?scopes=gist&description=Practice%20app%20sync" target="_blank" rel="noopener">Create the key on GitHub →</a></p>'+
     '<div class="alt-sync-row"><input type="password" class="alt-sync-key" placeholder="Paste the key (ghp_…)" autocomplete="off" spellcheck="false" aria-label="GitHub key"><button type="button" class="alt-btn-primary alt-sync-connect">Connect</button></div><p class="alt-sync-msg"></p>';
    card.querySelector('.alt-sync-connect').addEventListener('click',async()=>{const v=card.querySelector('.alt-sync-key').value.trim();if(!v)return;ls.set('pp-sync-token',v);ls.del('pp-sync-gist');await sync();if(lastMsg){ls.del('pp-sync-token');draw()}});
    if(lastMsg)card.querySelector('.alt-sync-msg').textContent=lastMsg;return;
   }
   const t=Number(ls.get('pp-sync-last')||0),n=Number(ls.get('pp-sync-devices')||1);
   const when=t?new Date(t).toLocaleString([], {hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}):'not yet';
   card.innerHTML='<h3>Sync across devices</h3><p class="alt-sync-p"><span class="alt-sync-dot'+(lastMsg?' bad':'')+'"></span>'+(state||lastMsg||('Connected · last synced '+when+' · '+n+' device'+(n===1?'':'s')))+'</p>'+
    '<div class="alt-sync-row"><button type="button" class="secondary alt-sync-now">Sync now</button><button type="button" class="secondary alt-sync-off">Disconnect</button></div>';
   card.querySelector('.alt-sync-now').addEventListener('click',sync);
   card.querySelector('.alt-sync-off').addEventListener('click',()=>{ls.del('pp-sync-token');ls.del('pp-sync-gist');lastMsg='';draw()});
  }
  draw();
  if(tok()){setTimeout(sync,2500);setInterval(sync,120000)}
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')sync()});
  window.ppSyncNow=sync;
 }
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
 // Metronome next to Restart plan: one button; it opens a small panel with play/stop and the tempo (own audio engine)
 {const rs=$('reset');
  if(rs){
   const ICO='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 3h7l3.5 18H5z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M12 15.5 17.5 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M6.6 15.5h10.8" stroke="currentColor" stroke-width="1.6"/></svg>';
   const wrap=document.createElement('div');wrap.className='alt-metro';
   wrap.innerHTML='<button type="button" class="secondary alt-metro-btn" aria-expanded="false" title="Metronome" aria-label="Metronome">'+ICO+'<i class="alt-metro-led"></i></button>'+
    '<div class="alt-metro-pop" hidden><button type="button" class="alt-metro-play" aria-label="Start metronome"></button>'+
    '<button type="button" class="alt-metro-step" data-d="-1" aria-label="Slower">−</button><label class="alt-metro-bpm"><input type="number" min="30" max="300" step="1" aria-label="Tempo in bpm"><span>bpm</span></label><button type="button" class="alt-metro-step" data-d="1" aria-label="Faster">+</button>'+
    '<input class="alt-metro-range" type="range" min="30" max="300" step="1" aria-label="Tempo"></div>';
   rs.before(wrap);
   const btn=wrap.querySelector('.alt-metro-btn'),pop=wrap.querySelector('.alt-metro-pop'),play=wrap.querySelector('.alt-metro-play'),num=wrap.querySelector('.alt-metro-bpm input'),range=wrap.querySelector('.alt-metro-range'),led=wrap.querySelector('.alt-metro-led');
   const PLAY='<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',STOP='<svg viewBox="0 0 24 24"><rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor"/></svg>';
   let bpm=100;try{bpm=Math.min(300,Math.max(30,Number(localStorage.getItem('pp-metro-bpm'))||100))}catch(e){}
   let ctx=null,on=false,next=0,beat=0,timer=null;
   const setBpm=v=>{bpm=Math.min(300,Math.max(30,Math.round(Number(v)||bpm)));num.value=bpm;range.value=bpm;try{localStorage.setItem('pp-metro-bpm',String(bpm))}catch(e){}};
   // a mechanical (wind-up) metronome: a short dry knock of the escapement inside a wooden case, alternating tic and tac;
   // the first beat of each bar is the same knock, stronger and a little fuller
   let noise=null,tick2=0;
   // real wood-block recordings (VCSL, CC0), trimmed to a metronome's tick; WAV so there is no MP3 lead-in delay
   const WOOD={"tic": "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", "tac": "UklGRjoSAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YRYSAAAAAPn/of8oAJH+Nvzx/JgC2gXoBOwEHgQXAmb+a/4//o357vgR//f+vvUY9bT/9QUqC3cMrQn8CYsFSADX+S/z0PU6/AH8fPfo91/8EvvWAPELVgzsCwQLYAnjCNMEdgEB+/71PvNC7fvuH/Q9+eH/VAXDCQUNnxCNEp8P0gj1Asz8cfY18mnu8Os/7bnzTP73Bl4LTg1qDbkP9RDwDhAJRP4j9dvujOwh7zHygPb8+iH/hAWWDDwSKRTBEawLXwNz/T75f/Rg8V7v6O318dn5XQEBCLkLrg0TEE4Rfw5JB8n/J/uf7HrsfOsa5xb5dQiwEwoMBw6BE+kHGQBu9NH+qwNOBlP60Om+6xXy/fkD9JT5zQUOIrEn7hS0E+gXOfvF5u78GfDw4FrhJvDe+D/iZvx4/XMPxyt7GxwjaRRXJZwiYOkn2FnintDm25f4ZvIJAqkDzw0GEGUUySA3ESARoAtY+4/5sPLp6Fr2+uom5lDiY90cH4pCWTDDGQEBI+KX5T0DGhOKBPXpPNAHwjvqpwnKG+cZ8Co7NW4YXhaPBRH/zQZ+8KLQ3K6ovRvoKe0SCJ4fQyAiKnsoNCUqMzYxVhyd/nrU3KoQqcbPP+DB4U/4MAcpDugoTlHvSKInETIILjQMKevg4bG/bpLOjMe8W+cmB3kenDy5UetP801AQRAY3/lr92PdScLnsKy0uLllzon0JwgSIQE6FkP8S5RCkD+KLo4Nl+DxrNaqsbTWtt7M0eUU/ZgShS9lVJhYHEL3J0MWTAYR8l3YP8NIt866+8GH0xr2IRgeMI87qEMqRydC2yysDOnqddYqxM2zjLR9wjPXdvDzCVQldDd9SRpN1TtGNOcezwBY4XHAC6+RrP+3Ucq72g8DvCoLOdxUrF6yQiIllxe1BKHhGMknvD290MNxvk3dcwhiIp4wcy/8KpY5V0CFHK0DUf7W6snG5LkGvn7QVedn7YX+5xmwMNZB30MaNb0lYhLm84re1tte0MHJXcrV0DPpSQacFzwqNjd9L/YlpiPnHFL/tOh03pXM6ciz1/7iAPRzB2gZrx2LIPwqjCtUI44K3//s8YvUDNYx1UvWsubs74UJORm0Hk8oNiY6JQ0b5Q1z9cTm+Oi33yvT3dc97FD4agAYC3YcliT4IwYh9xQhDTUHJPjh5qziD9/93BbkLvEU/rYCqg5JIGAkPyJYHo4THACo74jmducK6eDjHOiE8yH6qvknCJQXsh6aKdok8hbCC4n7XPA26NTgdeBn4/7mm+sE/CgJIhfRIvAdYBoRFp0IWQJtANf4wfF756/dReGN7Q33pANqCGsKJxH+FTUcyBrgEjYKJAB28BnrdO8N7VjkuON98tX8fASuEaYUUhDEEbcSDxETBtn+kwA/+EnqKOgi9sb7p/gn9zP/LQ3MCpH7Gv3sDKgLrApTCzAI9gHD+Ib32vTA7kPvMf0mADoAQAjfBJ8EJAdlCMQICwTtASf/oQGZ+mfx7/iX+YP87AF8/Cv9qAWDC7cLkAXQAX0A2fsw/Gf+TgI1+1r22vqC+uX8DgJmBUMGsAXsBr4A2fuX/qACBgPV+jr2aftL/Yn+dAKuAngBuARRBKsCZwjeB+YBs/2Q+f7yn/ZK9tX47gCGAYMBrAQiCIEJsQsnCdIJgQLU+p33tfMw8iX0LvbZ9Pf+4QaKBwUNExOrEkIMgP8z+Rj8RPnj9F70uvSf9L/32voyANkLMhEnDW0K1QhUB7UEhvte8o/1r/rS9NvyG/qgAcYDkQWoBSwHwwzOC6oGqwI7ABf8EPik87H1+Pcd9/f7+AATAlQFDgs6DVQLVwY5ARv94Px/+036u/cb9Lb1lfhO/hgGWArLDDQI5QNqBVEGAgJZ/oL8kPi982/zAPnF/I3/2wNhBF4CwgbuCscK9QZQBG4Bavly9Nj0kPdM+n/6Ev84/tP+tQX0CEANMQo7BoAEsP8I+yz6avxf/Dj9Dvod9A/2CvxDAKwF7ArFDawLOAh/A3j/h/8E/cD3IPSY9AP2rPgsAA4DAAU1Ba0Ggwu/CpIIFwUgALf8G/f996T60veS91z5Jfz3/Q8CWAgTC3cJNAdYBMAC+f86/sv8R/qE+AT3ePoJ/XH/LgItBVYETgN8BQ0GlwOZAZsDEv/u9/X2oPcA+Zj8sgHpA0kEcQfiBY8CGwKBAO/+agBv/lD7p/vC/C7+Zv9/AoQChQGzAWwB0f9BAeoCrgH5AAAACP13+cD5of1BAcEBjQBlAZoCuQGRAlgCAQJN/3j8CP8G/jH9pwHrA4EAvfvV/1gEKwJjAnYBYP6E+975//zh/sQATgHF/hP/iwB7BbIHbwV8A6IAxPyO+l35yvtf/iD+NQAX/5D/xgIjBCMEegPtAmQAsv5D/8r/Of7S/If9Hv7+/Aj9gP9xAgME6gL2ACgCKwTZAe39OP4u/8j8Y/rY+5MBhgILAr0CoQFZANYALAKaAA3/Gf4N/ub/a/78/Gf9F/5n/5EB8QLCA1ME7wIKARUAUP/w/+H/Z/xz+2r8i//WAi4BkP+uANIAff+RADQDYAJ7/5P/4f43/IX72f0EAIUANQLXAzwDQgTMAnD/qf2t/Qv/Jv5Q/t39TPyl/WP/5QBEAnQCiAINBKkEPQKR/zX/EP+m/Wb8KPzJ/Jb9C/7z/tcBJgQLBPcBwwEFBGMCuwAwALv92vvL+kL7O/3t/nQBLAJgAJEARwPnBBUDdQO+A+L/wfyf+1b7A/3C/cP8YP3W//gALwINBLIFEwagAt3/3/9t/8z8rvwL/YH7gPvS/XMAxgGsAncDQgOHA3QDCQLoAE7/Bf48/NX6ivu3/Gv+Yf87AGsC/wKJAwAEFQTxAwsCBAA1/vv8v/uF+3v7Ufxx/qv+uAB6A18EoQT+AxsEcgF1/pr9kP3//SP+wP2M/BD9iP9vACIB5wK4A98DygIWAWAA2/8T/zT+yf1D/dv8Lv4DABQBuwBWAAoBdAF6AjwCJQHp/3H/Cv/D/ZX9P/7C/tT+bACjAaEBAwK7AugBm/84/8L/P/+u/lr+R/78/tr+ov+AATEBQQH4ACYBMgE8ADcA0f8IAAz/D/6V/l3+AP/OAPUBAAF//5MAwgB9/zcBmgJWAQ7/h/4v/n79Hf/G//X/JQDGAKIA5v88AFUBfAHSAFMA3//E/+z/eP/1/nn/Uv8+/9/+Tv9sAMYBIQIfANj/ngD//6//PADeAPn/Vv9S/17+bv+kAAgAb/+d/0gAWwBrAHYACACYAHgBlgC6/zYA6gBc/7v9nf41//n+9v7F//0AQwGMAfkBHgGdAJYAnv/2/v3+JwDa/xv/9P72/un+A/+vAHwBAwHnALMA2v+dAOIAIgDl/z7/k/6I/s/+3v8FAYQAOf9//2ABfAKuAbYAggDr/9T+HP77/sD/f//J/jb/vP+x/0AAggCoAA4BGgH+AEoBHgFcAHv/aP8l/7z++v6C/tL+uP8oAJoAGgAHAK4AvQBLAeIBmAF3ADn/8v7c/k//n/8Z/63/3P+W/pz+VADOAakBnQBrAGIAmAAQADsAnADg//v+nf4K//X+dv/Q/3L/5f9jAO0AwQEEAloCEQGj/6r/Tv/5/oH+bP73/pT+lf7c/qL/zQAoAecBPAL2ASoCsQFnABH/gf6i/jL+vf3w/aX+/v6I/3QAggHDAZoBfQJgApgBCAFWAHX/Kf4j/Sv9Zf2C/nD/vv9VADAAlgGbAn4CXgLXAYIBBAB0/h3+5v3U/eT98v37/vX/zQCPAfABXQIKAnABqACS/2z/dP/L/n7+nv7K/qP+Bf/n/2AAUAEEApMBXgEXAZIAKwDZ/6z/y/4D/mD+r/7I/lT/TwBJAWwBRQGVATcBkQC1AD0AO/+k/sX+Vf/r/sD+G/96/7X/SQA4AXoBxAHlAXwBqwCG/xj/CP/e/vj+0/4L/xv/bP8NADkA0ABbAUkBKgEXAfUATgCe/3L/8v5Z/nf+4/4+//H/XgBpAMIAHgHsABgBPAGSAFEAwv/K/sb+EP/1/hv/h/8JAAoAOADYAD0BUAGzAJcAXwB6/1//M/8B/1z/Dv8a/7X/XgD/ACQBNQHsAKUAigCf/5v/gf/1/hb/7f7u/j7/sv9iAAIBTwFrAQgB7AC8AG8A0/8a/wX/xf5x/sb+Iv+g/0AAdwD7AD4BUgFvAQkBdgD0/7X/gv///q7+h/7i/mf/yv9ZAH8AigDUAPMAIwEdAcgAYACf/wv/0v7s/iX/Uf9f/1b/1v/PAGIBKQE+AScBYADU/5X/d/8y/y7/IP8B/y//pv8oAKkA/wAKAQ0BogA8ACcAIQBOAOb/9/7D/uj+L/9w/+L/awCyALAAXwCUAN4AigBOADwArP9D/xj/Pf+F/3r/zP8mAH0AwQCtALAAigBEABEAsv9t/yz/XP+N/4D/ff/E/3EAxQDUAAABGgGdAO//rf+j/2L/EP8Q/0j/R/97/yUAkQDoADgB9gCSAEYABAD4//7/s/8z/+3+wP73/qH/NwDVACsBuQA+AGcAvgDDAJAACQBN/9z+sP7Q/k7/0P8eAC4AFABzABABLgFFAQ8BbACr/xH/3P7a/iP/Z/+F/6f/4P9RAMgAEQFAAScBgwD6/7n/ef9v/1X/Rf9r/0H/TP/N/1QAyQD7AMkAgwCSAIQAKADx/6b/W/8k/xf/Xf+t//H/PwBjAEkAaACaAKEApgB5APv/oP9y/07/ZP+X/8P/0f/f/+r/FACHAOMAqwBTABwA7f/F/8D/2f/Y/7T/oP+S/5n/GgB+AG4ATgA6ABcA4f/p/wAAFAAgAAAAy/+y/7v/7v8iAD0ALQDq/8P/1v8BAAMAHQAnAAIACwAbABwASABEABUAzP+a/77/8P/o/7n/yf8AAOr/6P8zAGAAaABGAEIAXQBDAPr/uv+E/2H/c/+R/6n/AgBNAFEAbQCTAIYAYQArAPz/7//W/67/af9R/4D/xP/2/yUAWwBXAD0AcACsAH8AQwAYALD/YP9Y/5T/w/+v/7X/zP8DADIAXwChALAAqQBnABQAvP+N/6P/nv+Q/5n/m//A//P/KgBcAJEAngBcADgAIAAPAP//5f/I/5L/V/9q/63/AAA6AD4ARwBCAEcARwA9ADwANAAQAK7/gv+p/8z/9f/z/+T/1//2/ysAPABfAGsASAASANz/zP/h/9v/yP/B/8r/2f/p/w8ARABPAEAANwAeAAUACQAIAPL/3P/I/7j/rP/A/+D/JQBRAFAAVAAoABwADgAJAPr/6f/L/7j/2//f/8//6f/8/xAAMgAxADAAMAAvACMADADt/9z/4v/X/8r/2P/Y/+n//P8OACAAMQA+ACMADwAWABIABAD4/+v/7//s/9n/yf/F/+v/GQAnACUADgABABUALQAzABMA+//v/+D/3//o//v/DgD0/9T/0v/t/xgAMQA2AA4A/f8AAAgAJgArAAgA3//O/8T/2P8AAAAA//8QAAsADAASABwAGwAWABYA9v/T/87/8P8PABAA/P/o//P/FgAxACsAGwAOAO7/t/+8/+L/7f8TACIABQD4/wsANQBLAC8AAADn/+b/5f/V/+b/+P/s/97/2v8CACEAJgBMAEoAKwAPAPH/4f/N/9r/9P/a/8L/yP/a/wMAPABXAE0APAAtAA8ABAAHAOL/zP+4/5v/p//n/yIAKQArACcAIQA1AEMAPgAnAAQA1/+u/6f/t//H/9j/+v8PABgAIAA/AFUARgA8ACoABQDZ/77/wP/A/7z/v//P//T/EQA+AF0AVgBLADIADwDs/+7/+f/d/7z/uP+r/7z/6v8bADwAQwBNADQAIQAvACIABADk/8P/sv+r/73/7P8QACAAEgAGABgAMABKAEEAIwAIAN//zP/F/8H/0P/Y/+X//f8UACkAOABKAEEAKQAUAPX/3f/c/+D/0v/B/83/5P/4/wgAKwBEAD8ANAASAP7/CQAUAPP/x//J/9D/0P/o/wAAFQAkAB8AIQAjACoAIgACAOb/4P/j/9n/4v/y//z/AwADAAkAEwATABQAGQAQAP7/AAD5//D/8//x//X/8P/u//v/BQAVABkAEAALAAIA///9/wAAAAD5//j/+P/7/wAAAQADAAIAAAD+//3/AwAGAAMAAAABAAAA//8AAAAA/v8AAAAAAAD//wAAAQAAAP////8AAAAAAAAAAAAA", "acc": "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LwAgAPj/pP9Y/z3/dP/w/1EAYwA7ABIAAwAZAFQAZQAxAPH/uv+a/7D/6/8EAAkA6P/B/9b/FQBhAIEAZwAqAOv/wf/K/+v/9P/a/7T/pv/D/wQATABrAF0AUgA1AA4AAQAFAPP/o/9w/3z/nf/w/0QAawBsAGEATQAsABwAHAD+/7v/g/9z/4f/wP8HADIAPAA/AEgASQBbAGgAMwDw/8L/kf9v/2r/nf/m/xQAPQBTAF8AewCIAGsAOADy/5r/YP9W/3f/rP/o/xAAGAA2AHQAnQCYAHYAMADW/5//nf+r/6b/mv+o/9D/AwA5AGAAagBgAFcAVAA1AP7/xP+h/6P/o/+e/6b/wf/3/y8AXQCDAJUAfQBOABoA5P/C/7X/ov+J/3v/kv/R/w8ANgBLAGkAjwB4AEEAGgAGAPj/zP+a/4j/lv+z/83/5/8RADoARABLAFYAVgBGACAA9v/V/8X/vf+6/8z/4P/j/+j//f8NABsANwBPAEYAMQAkABMAAQD2/9r/rf+W/7D/1P/x/xIAJQAtADwARgBDADgAJAD+/9P/wv+7/73/1//p//H/DQAtADAALQAwACEAEAABANj/vf/a//3/8f/n/wAAEQANABgAKgAoAB0ACQDq/9v/2v/O/9X/+P8TABUACQANAB4AKgArAAoA7//z//T/5f/e/+7//v/4/+z//v8UABkAIgAjABMA+v/q/+z/AAALAAMA8f/t//v/AAD9/wIAEQAYAAcA6//h/+7/BwAhACQADQD4/+v/8P8KABIA///u/+z/6//q/wAAJgA9ACsA+//b/93/9f/9//f/+//6/+L/4v8NADYAPgAlAAYA9f/x//H/8//2/+//3//S/9///P8ZADIANQAmABkACwAKABIABgDn/8b/uf/C/9v/+f8UACIAIwAlAC4APgBEAC8ABADU/67/qf/F/+P/7v/2/wcADwAXACoAOABCADkAFQDp/8//2//x//X/6//d/9b/6P8JAB4AKAAmABsAEgADAPb/9/8BAAYAAAD3//P/7f/x//f/7//s//b/AAAIABoANAA5ACYAHAAFAOL/0v/K/8X/0v/s//j/AQATACwAPQA+ADYAFQD8//P/5//g/93/0P/J/9P/6v8IACYAQABJAD0AMAAVAO//2v/W/9X/0//O/9L/6/8OACkAMwA3ADIAIgAOAPz/9v/z/+r/2//N/8n/2f/4/xQAJAAlACIAJwArACAAEAD6/97/y//A/8r/5/8JACEAHQANAAkAEwAaABkACwD3/+3/7v/1//v//v/6//b/9v/6/wQAEgAaABkADQD8/+7/7P/z//v/+//5//7/BgAPABQAEAAEAP3/+//5//b/9v/4//r//f8BAAQABgAHAAYABQAEAAMAAAD+//3//P/9//3//v///wAAAAAAAAAA"};let wood=null,woodFor=null;
   const loadWood=c=>{if(woodFor===c)return;woodFor=c;wood=null;const dec=b64=>new Promise((ok,no)=>{const s=atob(b64),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);c.decodeAudioData(u.buffer,ok,no)});
    Promise.all([dec(WOOD.tic),dec(WOOD.tac),dec(WOOD.acc)]).then(([tic,tac,acc])=>{if(woodFor===c)wood={tic,tac,acc}}).catch(()=>{})};
   const click=(t,acc)=>{
    if(wood){const tac=(tick2++)%2===1,src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=acc?wood.acc:(tac?wood.tac:wood.tic);
     g.gain.value=(acc?.95:.55)*Math.pow(10,(Math.random()*2-1)*.4/20);src.connect(g);g.connect(ctx.destination);src.start(t);
     const ms=Math.max(0,(t-ctx.currentTime)*1000);setTimeout(()=>{led.classList.toggle('acc',acc);led.classList.add('on');setTimeout(()=>led.classList.remove('on'),90)},ms);return}
    if(!noise||noise.sampleRate!==ctx.sampleRate){const n=Math.round(ctx.sampleRate*.03);noise=ctx.createBuffer(1,n,ctx.sampleRate);const d=noise.getChannelData(0);let sd=20251;for(let i=0;i<n;i++){sd=(sd*16807)%2147483647;d[i]=(sd/1073741823.5-1)*Math.exp(-i/(ctx.sampleRate*.0045))}}   // the same knock every session
    const tac=(tick2++)%2===1,src=ctx.createBufferSource();src.buffer=noise;
    const knock=ctx.createBiquadFilter();knock.type='bandpass';knock.frequency.value=(tac?1650:1850)*(acc?.92:1);knock.Q.value=1.8;     // the click of the escapement
    const body=ctx.createBiquadFilter();body.type='bandpass';body.frequency.value=(tac?820:900);body.Q.value=7;                        // the wooden case ringing
    const kg=ctx.createGain(),bg=ctx.createGain();kg.gain.value=1;bg.gain.value=acc?5.2:3.8;
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=4000;lp.Q.value=.5;
    const g=ctx.createGain();const lvl=(acc?1.3:.95)*Math.pow(10,(Math.random()*2-1)*.6/20);
    g.gain.setValueAtTime(lvl,t);g.gain.exponentialRampToValueAtTime(.001,t+.028);
    src.connect(knock);src.connect(body);knock.connect(kg);body.connect(bg);kg.connect(lp);bg.connect(lp);lp.connect(g);g.connect(ctx.destination);src.start(t);src.stop(t+.035);
    const ms=Math.max(0,(t-ctx.currentTime)*1000);setTimeout(()=>{led.classList.toggle('acc',acc);led.classList.add('on');setTimeout(()=>led.classList.remove('on'),90)},ms)};
   const tick=()=>{while(next<ctx.currentTime+.12){click(next,beat%4===0);beat++;next+=60/bpm}};
   const start=async()=>{const AC=window.AudioContext||window.webkitAudioContext;
    if(!ctx){try{ctx=new AC({latencyHint:'interactive'})}catch(e){try{ctx=new AC()}catch(e2){ctx=window.ppSharedAudio?window.ppSharedAudio():null}}}   // phones allow only a few audio engines
    if(!ctx)return;loadWood(ctx);try{await ctx.resume()}catch(e){}if(!wood)await new Promise(r=>setTimeout(r,60));on=true;beat=0;next=ctx.currentTime+.05;tick();timer=setInterval(tick,25);play.innerHTML=STOP;play.setAttribute('aria-label','Stop metronome');wrap.classList.add('running')};
   const stopM=()=>{on=false;clearInterval(timer);timer=null;if(ctx&&!(window.ppSharedAudio&&ctx===window.ppSharedAudio())){const c=ctx;setTimeout(()=>{if(!on){try{c.suspend()}catch(e){}}},150)}play.innerHTML=PLAY;play.setAttribute('aria-label','Start metronome');wrap.classList.remove('running')};
   btn.addEventListener('click',()=>{const open=pop.hidden;pop.hidden=!open;btn.setAttribute('aria-expanded',String(open));wrap.classList.toggle('open',open)});
   play.addEventListener('click',()=>on?stopM():start());
   wrap.querySelectorAll('.alt-metro-step').forEach(b=>b.addEventListener('click',()=>setBpm(bpm+Number(b.dataset.d))));
   num.addEventListener('change',()=>setBpm(num.value));range.addEventListener('input',()=>setBpm(range.value));
   document.addEventListener('click',e=>{if(!pop.hidden&&!wrap.contains(e.target)){pop.hidden=true;btn.setAttribute('aria-expanded','false');wrap.classList.remove('open')}});
   play.innerHTML=PLAY;setBpm(bpm);
  }}
 // Fake Book side panel: a button in the song list's header slides the list (and the mixer) away; a narrow "Songs" rail
 // takes its place and brings it back (remembered; desktop only)
 {const lay=document.querySelector('#repertoirePanel .rep-layout'),lib=lay&&lay.querySelector('.rep-library');
  if(lay&&lib){
   const L='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6 8.5 12l6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
         R='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
   const hdr=lib.querySelector(':scope>label');
   const hide=document.createElement('button');hide.type='button';hide.className='alt-lib-hide';hide.innerHTML=L;hide.title='Hide the song list';hide.setAttribute('aria-label',hide.title);
   if(hdr){hdr.classList.add('alt-lib-head');hdr.append(hide)}else lib.prepend(hide);
   // the rail names both things it hides: the songs and the mixer
   const MIX='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4v16M12 4v16M19 4v16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="3" y="13" width="4" height="3" rx="1" fill="currentColor"/><rect x="10" y="7" width="4" height="3" rx="1" fill="currentColor"/><rect x="17" y="11" width="4" height="3" rx="1" fill="currentColor"/></svg>';
   const rail=document.createElement('div');rail.className='alt-rail';
   rail.innerHTML='<button type="button" class="alt-rail-songs" title="Show the song list and the mixer" aria-label="Show the song list and the mixer">'+R+'</button>';   // just the arrow
   lay.append(rail);
   const set=(on,anim)=>{if(!anim)lay.classList.add('alt-noanim');lay.classList.toggle('alt-side-hidden',on);hide.setAttribute('aria-expanded','true');
    try{localStorage.setItem('pp-fb-side',on?'hidden':'shown')}catch(e){}if(!anim)requestAnimationFrame(()=>requestAnimationFrame(()=>lay.classList.remove('alt-noanim')))};
   hide.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();set(true,true)});
   rail.querySelector('.alt-rail-songs').addEventListener('click',()=>set(false,true));

   let on=false;try{on=localStorage.getItem('pp-fb-side')==='hidden'}catch(e){}set(on,false);
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
