/* Practice — Fake Book: song library, chart, practice band (engine) and player. */
/* Repertoire — chord charts, song import, and an original Web Audio practice band.
   All storage and parsing are local. No external API, account or CDN needed (sounds are the files in samples/). */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const importer=window.SongImporter;
const STORE='piano-practice-repertoire-v1';
const PITCH={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11,'B#':0,Fb:4,'E#':5};
const SHARP=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const FLAT=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const ROOTS=['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const CHORD_TYPES=[['maj','Major'],['m','Minor'],['5','Power chord'],['6','6'],['m6','Minor 6'],['7','Dominant 7'],['maj7','Major 7'],['m7','Minor 7'],['mMaj7','Minor major 7'],['maj9','Major 9'],['9','Dominant 9'],['m9','Minor 9'],['maj11','Major 11'],['11','Dominant 11'],['m11','Minor 11'],['maj13','Major 13'],['13','Dominant 13'],['m13','Minor 13'],['sus2','Sus2'],['sus4','Sus4'],['7sus4','7sus4'],['dim','Diminished'],['dim7','Diminished 7'],['m7b5','Half diminished'],['aug','Augmented'],['7b5','7♭5'],['7#5','7♯5'],['7b9','7♭9'],['7#9','7♯9'],['7b13','7♭13'],['add9','Add9']];
const MAX_SONGS=4000;
function safeText(s,max=140){return String(s??'').slice(0,max)}
function limit(n,lo,hi,fallback){n=Number(n);return Number.isFinite(n)?Math.min(hi,Math.max(lo,Math.round(n))):fallback}
function makeId(){return 'song-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9)}
function demoSong(title,style,key,bpm,chart,artist='Practice example'){
 return {id:makeId(),title,artist,style,styleLabel:'Original study example',key,meter:'4/4',bpm,bars:chart.split('|').map(chunk=>chunk.trim()).filter(Boolean).map(chords=>({chords:chords.split(/\s+/)})),source:'Example',transpose:0};
}
function demoSongs(){return [
 demoSong('ii–V–I Practice','swing','C',120,'Dm7 G7 | Cmaj7 | Am7 D7 | Gmaj7 | Em7 A7 | Dm7 G7 | Cmaj7 | Cmaj7'),
 demoSong('Bossa Study','bossa','F',105,'Gm7 | C7 | Fmaj7 | Dm7 | Gm7 C7 | Am7 D7 | Gm7 C7 | Fmaj7'),
 demoSong('Pop Changes','pop','G',92,'G | D | Em | C | G | D | C | G')
]}
// jumps a measure can carry, as chosen in the measure editor
const JUMPS={fine:'Fine','dc-fine':'D.C. al Fine','dc-coda':'D.C. al Coda','dc':'D.C.','ds-fine':'D.S. al Fine','ds-coda':'D.S. al Coda','ds':'D.S.'};
function cleanBar(input){
 const b=input&&typeof input==='object'?input:{};
 const chords=Array.isArray(b.chords)?b.chords:typeof b.chords==='string'?b.chords.split(/\s+/):[];
 const out={chords:chords.slice(0,8).map(c=>safeText(c,36)).filter(Boolean),section:safeText(b.section||'',20),repeatStart:!!b.repeatStart,ending:safeText(b.ending||'',5),note:safeText(b.note||'',90)};
 if(b.repeatEnd)out.repeatEnd=true;if(b.segno)out.segno=true;if(b.coda)out.coda=true;   // keep the navigation marks, so the form survives saving and backups
 if(['2/4','3/4','4/4','5/4','6/8','7/8','9/8','12/8'].includes(b.meter))out.meter=b.meter;
 if(JUMPS[b.jump])out.jump=b.jump;
 {const t=Math.round(Number(b.times));if(t>=3&&t<=8)out.times=t}
 return out;
}
// the instruments chosen for a song (only known values are kept)
function cleanInstruments(i){
 return {};   // the per-song instrument picker was removed; older choices are dropped
 if(!i||typeof i!=='object')return {};
 const o={};if(['piano','ep','organ','vibes'].includes(i.keys))o.keys=i.keys;if(['on','off'].includes(i.perc))o.perc=i.perc;if(['upright','electric'].includes(i.bass))o.bass=i.bass;if(['sticks','brushes'].includes(i.drums))o.drums=i.drums;
 return Object.keys(o).length?{instruments:o}:{};
}
function cleanSong(s){
 if(!s||typeof s!=='object'||!Array.isArray(s.bars))throw new Error('Invalid song data.');
 const bars=s.bars.slice(0,1024).map(cleanBar);
 if(!bars.length)throw new Error('This song has no measures.');
 return {id:safeText(s.id,80)||makeId(),title:safeText(s.title,120)||'Untitled',artist:safeText(s.artist,120),style:['swing','bossa','pop','rock','funk','ballad','waltz','reggae','blues','samba','swing2','even8','even16','latin','afro','secondline','boogaloo','slowblues','partido'].includes(s.style)?s.style:'swing',styleLabel:safeText(s.styleLabel,80),key:safeText(s.key,8)||'C',meter:['2/4','3/4','4/4','5/4','6/8','7/8','9/8','12/8'].includes(s.meter)?s.meter:'4/4',bpm:limit(s.bpm,40,240,120),bars,source:safeText(String(s.source||'My chart').replace(/i\s*real\s*(pro|book)?/gi,'Imported'),80),transpose:limit(s.transpose,-11,11,0),...cleanInstruments(s.instruments)};
}
function loadSongs(){
 try{
  const parsed=JSON.parse(localStorage.getItem(STORE)||'null');
  if(Array.isArray(parsed))return parsed.slice(0,MAX_SONGS).map(cleanSong);
 }catch(e){console.warn('Repertoire read error',e)}
 return demoSongs();
}
let songs=loadSongs(),selected=songs[0]?.id||null;
let editorSong=null,editingBar=-1,editMode='new';
let playback=null;
function save(){
 try{localStorage.setItem(STORE,JSON.stringify(songs));return true}
 catch(e){notice('Browser storage is full or unavailable. Export a backup to keep your changes.',true);return false}
}
function current(){return songs.find(s=>s.id===selected)||null}
function notice(message,isError=false){const el=$('repNotice');el.textContent=message;el.style.color=isError?'#ffbdbd':'#9fcdfa';}
function rootName(name){return /^([A-G](?:#|b)?)/.exec(name||'')?.[1]||'C'}
function pc(root){return PITCH[root]??0}
function movedKey(key,shift){
 const m=/^([A-G][#b]?)(.*)$/.exec(key||'C');if(!m)return key;
 const palette=/b/.test(m[1])?FLAT:SHARP;
 return palette[(pc(m[1])+shift+120)%12]+m[2];
}
function moveChord(raw,shift,preferFlats){
 if(!shift||!raw||raw==='N.C.')return raw;
 const regex=/^([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?$/;
 const m=regex.exec(raw);if(!m)return raw;
 const palette=preferFlats?FLAT:SHARP;
 const pitch=x=>palette[(pc(x)+shift+120)%12];
 return pitch(m[1])+m[2]+(m[3]?'/'+pitch(m[3]):'');
}
function displayChords(b,s){return b.chords.map(c=>c==='/'?'/':moveChord(c,s.transpose||0,/b/.test(s.key))).filter(Boolean)}
function titleText(node,text){node.textContent=text}
function renderList(){
 const search=$('repSearch').value.trim().toLowerCase();const el=$('repSongList');el.replaceChildren();
 const filtered=songs.filter(s=>(s.title+' '+s.artist+' '+s.key).toLowerCase().includes(search));
 for(const song of filtered){
  const b=document.createElement('button');b.type='button';b.className='rep-list-item';b.setAttribute('aria-current',String(song.id===selected));
  const name=document.createElement('span');name.textContent=song.title;
  const sub=document.createElement('small');sub.textContent=(song.artist? song.artist+' · ':'')+movedKey(song.key,song.transpose||0);
  b.append(name,sub);b.addEventListener('click',()=>selectSong(song.id));el.append(b);
 }
 if(!filtered.length){const empty=document.createElement('p');empty.className='rep-sidebar-empty';empty.textContent=songs.length?'No matching songs':'Import songs to start';el.append(empty)}
 $('repSongCount').textContent='('+songs.length+')';
}
function loopOptions(s){
 const start=$('repLoopStart'),end=$('repLoopEnd');const prevStart=start.value,prevEnd=end.value;
 start.replaceChildren();end.replaceChildren();
 s.bars.forEach((_,i)=>{
  for(const el of [start,end]){const o=document.createElement('option');o.value=String(i);o.textContent='Measure '+(i+1);el.append(o)}
 });
 start.value=prevStart && Number(prevStart)<s.bars.length?prevStart:'0';
 end.value=prevEnd && Number(prevEnd)<s.bars.length?prevEnd:String(s.bars.length-1);
 if(Number(start.value)>Number(end.value))start.value='0';
}
let loopAnchor=null;
function selectLoopMeasure(i){
 stop();
 const first=loopAnchor===null?i:Math.min(loopAnchor,i);
 const last=loopAnchor===null?i:Math.max(loopAnchor,i);
 const starting=loopAnchor===null;
 loopAnchor=starting?i:null;
 $('repLoopStart').value=String(first);$('repLoopEnd').value=String(last);
 $('repLoopEnabled').checked=true;$('repLoopBar').hidden=true;
 const s=current();if(s)renderChart(s);
 notice(starting?'Loop start: measure '+(i+1)+'. Tap the last measure (or the same measure for a one-bar loop).':'Loop: measures '+(first+1)+'–'+(last+1)+'. Press Play to practise.');
}
function paintLoop(first,last){
 $('repLoopStart').value=String(first);$('repLoopEnd').value=String(last);
 $('repLoopEnabled').checked=true;
 document.querySelectorAll('#repChart .rep-bar').forEach(bar=>bar.classList.toggle('in-loop',Number(bar.dataset.bar)>=first&&Number(bar.dataset.bar)<=last));
}
function bindLoopGesture(button,i){
 let timer=null,origin=null,dragging=false,suppressClick=false,last=i,mouse=false;
 const finish=()=>{
  clearTimeout(timer);timer=null;origin=null;
  if(dragging){dragging=false;loopAnchor=null;notice('Loop: measures '+(Math.min(i,last)+1)+'–'+(Math.max(i,last)+1)+'. Hold and drag to change; tap a selected measure to clear.');}
 };
 button.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;suppressClick=false;last=i;origin={x:e.clientX,y:e.clientY};mouse=e.pointerType==='mouse';
  if(mouse){button.setPointerCapture(e.pointerId);return}
  timer=setTimeout(()=>{
   timer=null;dragging=true;suppressClick=true;stop();loopAnchor=null;
   button.setPointerCapture(e.pointerId);paintLoop(i,i);
   notice('Drag over the measures to select your loop.');
  },450);
 });
 button.addEventListener('pointermove',e=>{
  if(mouse&&origin&&!dragging&&(e.buttons&1)&&Math.hypot(e.clientX-origin.x,e.clientY-origin.y)>5){dragging=true;suppressClick=true;stop();loopAnchor=null;paintLoop(i,i)}
  if(dragging){
   e.preventDefault();const bar=document.elementFromPoint(e.clientX,e.clientY)?.closest('#repChart .rep-bar');
   if(bar){last=Number(bar.dataset.bar);paintLoop(Math.min(i,last),Math.max(i,last))}
  }else if(origin&&Math.hypot(e.clientX-origin.x,e.clientY-origin.y)>10){clearTimeout(timer);timer=null;origin=null}
 },{passive:false});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,finish);
 button.addEventListener('pointerleave',()=>{if(!dragging&&!mouse){clearTimeout(timer);timer=null}});
 button.addEventListener('contextmenu',e=>e.preventDefault());
 button.addEventListener('keydown',e=>{if(e.shiftKey&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selectLoopMeasure(i)}});
 button.addEventListener('click',e=>{
  if(suppressClick){suppressClick=false;e.preventDefault();return}
  if(loopAnchor!==null){selectLoopMeasure(i);return}
  if($('repLoopEnabled').checked&&i>=Number($('repLoopStart').value)&&i<=Number($('repLoopEnd').value)){
   stop();$('repLoopEnabled').checked=false;const s=current();if(s)renderChart(s);notice('Loop cleared.');return;
  }
  editBar(i);
 });
}
function renderChart(s){
 const el=$('repChart');el.replaceChildren();
 s.bars.forEach((bar,i)=>{
  const b=document.createElement('button');b.type='button';b.className='rep-bar';
  if($('repLoopEnabled').checked && i>=Number($('repLoopStart').value) && i<=Number($('repLoopEnd').value))b.classList.add('in-loop');
  b.dataset.bar=i;b.title='Hold and drag to loop; tap selected measure to clear; Shift+Enter for keyboard';b.setAttribute('aria-label','Measure '+(i+1)+': '+displayChords(bar,s).join(', '));
  const num=document.createElement('span');num.className='rep-bar-num';num.textContent=String(i+1);b.append(num);
  if(bar.section||bar.ending){const section=document.createElement('span');section.className='rep-bar-section';section.textContent=(bar.section||'')+(bar.ending?' '+bar.ending+'.':'');b.append(section)}
  if(bar.repeatStart)b.classList.add('rep-rs');if(bar.repeatEnd||/repeat end/i.test(bar.note||''))b.classList.add('rep-re');
  {// segno and coda are drawn (system fonts often lack the music symbols); the "To Coda" sign sits at the end of its measure
   const SEGNO='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.6 6.6c-1.1-1.7-5.2-2-5.8.6-.7 3.1 6.8 3.9 5.8 7.8-.8 3-5.8 2.5-6.8.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 19.5 17 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="7.3" cy="10.2" r="1.4" fill="currentColor"/><circle cx="16.7" cy="13.8" r="1.4" fill="currentColor"/></svg>',CODA='<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="5.4" ry="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v19M3 12h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
   const toCoda=bar.coda&&s.bars.some((x,k)=>k>i&&x.coda);
   const left=[];if(bar.meter)left.push('<span>'+bar.meter+'</span>');if(bar.segno)left.push(SEGNO);if(bar.coda&&!toCoda)left.push(CODA);
   if(left.length){const mk=document.createElement('span');mk.className='rep-bar-marks'+(bar.section||bar.ending?' after-section':'');mk.innerHTML=left.join(' ');b.append(mk)}
   if(toCoda){const tc=document.createElement('span');tc.className='rep-bar-tocoda';tc.title='To Coda';tc.innerHTML=CODA;b.append(tc)}
   const txt=[bar.jump?JUMPS[bar.jump]:'',bar.times?bar.times+'x':'',String(bar.note||'').replace(/(^|\s·\s)?Repeat end/i,'').trim()].filter(Boolean).join(' · ');
   if(txt){const nt=document.createElement('span');nt.className='rep-bar-note';nt.textContent=txt;b.append(nt)}}
  const wrap=document.createElement('span');wrap.className='rep-bar-chords'+(bar.chords.length<=1?' one':'');
  const labels=displayChords(bar,s);
  if(labels.length){for(const chord of labels){const span=document.createElement('span');span.textContent=chord;wrap.append(span)}}
  else{const span=document.createElement('span');span.textContent='—';span.className='rep-bar-empty';wrap.append(span)}
  b.append(wrap);bindLoopGesture(b,i);el.append(b);
 });
 $('repMeasureCount').textContent=s.bars.length+' measures';
}
const STYLE_LABELS={swing:'Jazz Swing',swing2:'Swing Two-Feel',waltz:'Jazz Waltz',ballad:'Ballad',even8:'Jazz Even 8ths',even16:'Even 16ths',boogaloo:'Boogaloo',latin:'Latin Jazz',afro:'Afro 12/8',secondline:'Second Line',bossa:'Bossa Nova',samba:'Samba',partido:'Partido Alto',blues:'Blues Shuffle',slowblues:'Slow Blues',pop:'Pop',rock:'Rock',funk:'Funk',reggae:'Reggae'};
const STYLE_DESC={swing:'Ride with a real swing feel, walking bass and two-hand piano comping.',swing2:'Two-beat feel: bass in half notes, light ride, heavier kick on 1 and 3.',waltz:'Jazz waltz in 3/4: ride in three, walking bass, piano on 2 and 3.',ballad:'Brushes, long bass notes and soft, sustained piano.',even8:'Straight-eighth jazz: ride in 8ths, cross-stick on 4, straight walking bass.',even16:'16th-note groove with Rhodes and a syncopated bass.',boogaloo:'Blue Note boogaloo: kick on the "and" of 2 and on 4, backbeat, bass riff.',latin:'Latin jazz: son clave, tumbao bass and kick, montuno-style piano.',afro:'Afro 12/8: the 6/8 bell pattern, kick on the four main beats, bass in triplets.',secondline:'New Orleans second line: street snare beat and a tuba-like bass.',bossa:'Bossa nova: bass on 1 and 3, cross-stick clave, guitar-like piano.',samba:'Samba with brushes: surdo-style kick and bass, brushed 8ths, cross-stick.',partido:'Partido alto: samba kick and bass, piano on the partido syncopations.',blues:'Chicago shuffle: kick on every beat, backbeat, triplet hi-hat, boogie bass.',slowblues:'Slow 12/8 blues: triplet pulse, backbeat, bass pickups on the last triplet.',pop:'Pop: syncopated kick, 8th hi-hat and soft 8th-note piano.',rock:'Rock: ride 8ths, driving bass, piano playing the riff.',funk:'Funk: 16th hi-hat, slap bass riff, Rhodes chords and stabs.',reggae:'One-drop reggae: piano skank, organ bubble, dub bass.'};
function styleInfoText(s){return (STYLE_LABELS[s.style]||s.style)+' — '+(STYLE_DESC[s.style]||'')+(s.styleLabel&&s.styleLabel!==STYLE_LABELS[s.style]&&s.styleLabel!=='Original study example'?' (original style: '+s.styleLabel+')':'')}
function renderSong(){
 if(!songs.some(s=>s.id===selected))selected=songs[0]?.id||null;
 const s=current();renderList();$('repEmpty').hidden=!!s;$('repSongWorkspace').hidden=!s;
 if(!s)return;
 $('repTitle').textContent=s.title;$('repArtist').textContent=s.artist||'My chord chart';
 $('repStyle').value=s.style;$('repTempo').value=s.bpm;$('repTempoLabel').textContent=s.bpm;
 $('repTransValue').textContent=movedKey(s.key,s.transpose||0);
 $('repChartInfo').textContent=(STYLE_LABELS[s.style]||s.style)+' · '+s.meter+' · '+s.source;
 $('repStyleInfo').textContent=styleInfoText(s);
 {const ins=s.instruments||{};for(const [id,k] of [['repKeys','keys'],['repBassPick','bass'],['repDrumPick','drums'],['repPercPick','perc']]){const el=$(id);if(el)el.value=ins[k]||''}}
 $('repChartKey').textContent='Key: '+movedKey(s.key,s.transpose||0);
 loopOptions(s);renderChart(s);
}
function warmSounds(){const s=current();if(s&&!samplesDisabled&&!banksReady(s)&&!loadingSounds)loadBanks(s).catch(()=>{})}
function selectSong(id){loopAnchor=null;if(playback)stop();selected=id;renderSong();notice('');warmSounds()}
function parseManualChart(text){
 const bars=[];let section='';
 for(const line of String(text).split(/\n/)){
  const raw=line.trim();if(!raw)continue;
  const match=/^([^|:\n]{1,20}):\s*(.*)$/.exec(raw);let part=raw;
  if(match){section=match[1].trim();part=match[2]}
  const chunks=part.split('|').map(x=>x.trim()).filter(Boolean);
  for(const chunk of chunks){
   const chords=chunk==='-'||chunk==='—'?[]:chunk.split(/\s*,\s*|\s+/).filter(Boolean);
   bars.push({chords,section,repeatStart:false,ending:'',note:''});section='';
  }
 }
 if(!bars.length)throw new Error('Write at least one measure separated by |.');
 return bars;
}
function chartAsText(s){
 let text='';
 for(const b of s.bars){
  if(b.section)text+='\n'+b.section+': ';
  text+='| '+b.chords.join(' ')+' ';
 }
 return text.trim()+' |';
}
function showModal(el){
 if(typeof el.showModal==='function')el.showModal();else el.setAttribute('open','');
}
function hideModal(el){if(typeof el.close==='function')el.close();else el.removeAttribute('open')}
// a key the key menu offers (C# ↔ Db and so on)
const ENH={'C#':'Db','Db':'C#','D#':'Eb','Eb':'D#','F#':'Gb','Gb':'F#','G#':'Ab','Ab':'G#','A#':'Bb','Bb':'A#'};
function keyOption(k){const sel=$('repFormKey');const has=v=>[...sel.options].some(o=>o.value===v);if(has(k))return k;const m=/^([A-G][#b]?)(.*)$/.exec(k);if(m&&ENH[m[1]]&&has(ENH[m[1]]+m[2]))return ENH[m[1]]+m[2];return k}
let editorBars=null,editorBaked=false;
function editSong(mode){
 const s=current();if(mode!=='new'&&!s)return;
 editMode=mode;editorSong=mode==='new'?null:s.id;
 let draft=mode==='new'?{title:'',artist:'',key:'C',meter:'4/4',style:'swing',bpm:120,bars:[{chords:['Cmaj7']},{chords:['Am7']},{chords:['Dm7','G7']},{chords:['Cmaj7']}]}:s;
 // a transposed song opens in the key the chart shows; saving makes that its key (transpose back to 0)
 if(mode!=='new'&&s.transpose){const t=s.transpose,fl=/b/.test(s.key);draft={...s,key:keyOption(moveChord(s.key,t,fl)),bars:s.bars.map(b=>({...b,chords:b.chords.map(c=>c==='/'?'/':moveChord(c,t,fl))}))}}
 editorBars=mode==='new'?null:draft.bars;editorBaked=mode!=='new'&&!!s.transpose;
 $('repEditorHeading').textContent=mode==='new'?'New song':mode==='copy'?'Duplicate song':'Edit song';
 $('repFormTitle').value=mode==='copy'?draft.title+' (copy)':draft.title;
 $('repFormArtist').value=draft.artist;$('repFormKey').value=draft.key;
 if(!$('repFormKey').value)$('repFormKey').value='C';
 $('repFormMeter').value=draft.meter;$('repFormStyle').value=draft.style;$('repFormBpm').value=draft.bpm;
 $('repFormChart').value=chartAsText(draft);$('repSongError').textContent='';showModal($('repSongDialog'));
}
function renderChordRows(chords){
 const host=$('repChordRows');host.replaceChildren();
 const values=chords.length?chords:['Cmaj7'];
 values.slice(0,8).forEach(symbol=>{
  const match=/^([A-G](?:#|b)?)(.*)$/.exec(symbol)||['','C','maj7'];
  const row=document.createElement('div');row.className='rep-chord-row';
  const root=document.createElement('select');root.className='rep-chord-root';root.setAttribute('aria-label','Chord root');
  ROOTS.forEach(n=>{const o=document.createElement('option');o.value=n;o.textContent=n;root.append(o)});
  root.value=PITCH[match[1]]===undefined?'C':match[1];
  const type=document.createElement('select');type.className='rep-chord-type';type.setAttribute('aria-label','Chord type');
  CHORD_TYPES.forEach(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;type.append(o)});
  const normalized=match[2]||'maj';type.value=CHORD_TYPES.some(([v])=>v===normalized)?normalized:'maj';
  const remove=document.createElement('button');remove.type='button';remove.className='secondary rep-remove-chord';remove.textContent='×';remove.setAttribute('aria-label','Remove chord');
  remove.addEventListener('click',()=>{if(host.children.length>1)row.remove()});
  row.append(root,type,remove);host.append(row);
 });
}
function selectedChords(){return [...$('repChordRows').querySelectorAll('.rep-chord-row')].map(row=>row.querySelector('.rep-chord-root').value+row.querySelector('.rep-chord-type').value)}
function editBar(i){
 const s=current();if(!s)return;editingBar=i;
 const b=s.bars[i];$('repBarHeading').textContent='Measure '+(i+1);
 renderChordRows(b.chords.filter(c=>c!=='/').map(c=>moveChord(c,s.transpose||0,/b/.test(s.key))));   // as the chart shows it$('repBarSection').value=b.section||'';$('repBarError').textContent='';
 $('repBarRepStart').checked=!!b.repeatStart;$('repBarRepEnd').checked=!!(b.repeatEnd||/repeat end/i.test(b.note||''));$('repBarTimes').value=String(b.times||Number((/(\d+)\s*x\b/i.exec(b.note||'')||[])[1])||2);
 $('repBarEnding').value=b.ending||'';$('repBarSegno').checked=!!b.segno;$('repBarCoda').checked=!!b.coda;$('repBarJump').value=b.jump||'';$('repBarMeter').value=b.meter||'';
 showModal($('repBarDialog'));
}
function readEditor(){
 const bars=parseManualChart($('repFormChart').value);
 if(editorBars)bars.forEach((b,i)=>{const o=editorBars[i];if(!o)return;for(const k of ['repeatStart','repeatEnd','ending','segno','coda','jump','times','meter'])if(o[k]&&!b[k])b[k]=o[k];if(o.note&&!b.note)b.note=o.note});
 return cleanSong({id:editMode==='edit'&&editorSong?editorSong:makeId(),title:$('repFormTitle').value.trim(),artist:$('repFormArtist').value.trim(),key:$('repFormKey').value,meter:$('repFormMeter').value,style:$('repFormStyle').value,bpm:Number($('repFormBpm').value),bars,source:'My chart',transpose:editMode==='edit'?current()?.transpose||0:0});
}
function addImported(list){
 let added=0,duplicates=0;
 const keys=new Set(songs.map(s=>s.title.toLowerCase()+'|'+s.artist.toLowerCase()+'|'+s.bars.length));
 for(const input of list){
  if(songs.length>=MAX_SONGS)break;
  let s;try{s=cleanSong({...input,id:makeId()})}catch(e){continue}
  const key=s.title.toLowerCase()+'|'+s.artist.toLowerCase()+'|'+s.bars.length;
  if(keys.has(key)){duplicates++;continue}
  songs.push(s);keys.add(key);added++;
  if(added===1)selected=s.id;
 }
 if(playback)stop();save();renderSong();
 return {added,duplicates};
}
function importContent(content,name='file'){
 if(content.length>5*1024*1024)throw new Error('File too large (max 5 MB). Split the playlist into smaller files.');
 if((name.toLowerCase().endsWith('.json')||content.trim().startsWith('{'))){
  let data;try{data=JSON.parse(content)}catch(e){throw new Error('This JSON backup is not valid.')}
  if(!data||!Array.isArray(data.songs))throw new Error('The JSON file is not a Repertoire backup.');
  return {...addImported(data.songs),errors:[],playlist:'Backup'};
 }
 const parsed=importer.parse(content);
 return {...addImported(parsed.songs),errors:parsed.errors,playlist:parsed.playlist};
}
function presentImport(result){
 const bits=[result.added+' '+(result.added===1?'song':'songs')+' imported'];
 if(result.duplicates)bits.push(result.duplicates+' already in library');
 if(result.errors.length)bits.push(result.errors.length+' could not be read');
 notice(bits.join(' · ')+(result.errors.length?'. Some charts may need manual editing.':''),result.errors.length>0&&result.added===0);
}
function downloadFile(name,content,mime='application/json'){
 const url=URL.createObjectURL(new Blob([content],{type:mime+';charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function filename(s){return s.replace(/[^a-z0-9-_]+/gi,'-').replace(/^-|-$/g,'').slice(0,60)||'repertoire'}
function beatsOf(s){const [count,unit]=s.meter.split('/').map(Number);return {beats:count,scale:unit===8?.5:unit===2?2:1}}
function chordInfo(symbol){
 if(!symbol||symbol==='N.C.')return null;
 symbol=String(symbol).replace('6/9','69');
 const match=/^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(symbol);
 if(!match)return null;
 const root=pc(match[1]);
 let q=match[2].replace(/^mM(?=\d)/,'mmaj').replace(/^M(?!aj)/,'maj').replace(/[\^\u0394]/g,'maj').replace(/\u00f8/g,'m7b5').replace(/[\u00b0o]/g,'dim').replace(/^-/,'m').replace(/^\+/,'aug').replace(/^h(?=\d)/,'m7b5').toLowerCase();
 q=q.replace(/\(|\)/g,'');
 const minor=/^(m(?!aj)|min)/.test(q);
 let ints=[0,4,7];
 if(minor)ints=[0,3,7];
 if(/^dim/.test(q))ints=[0,3,6];
 const halfDim=/m7b5|^half/.test(q);
 if(halfDim)ints=[0,3,6,10];
 if(/^aug/.test(q))ints=[0,4,8];
 if(/sus2/.test(q))ints=[0,2,7];else if(/sus/.test(q))ints=[0,5,7];
 if(/^5$/.test(q))ints=[0,7];
 if(/#5|\+5/.test(q))ints=ints.map(n=>n===7?8:n);
 else if(/b5/.test(q)&&!halfDim&&!/^dim/.test(q))ints=ints.map(n=>n===7?6:n);
 const isDim7=/^dim/.test(q)&&/7/.test(q);
 const sixth=/(?:^|[^#b\d])6/.test(q);
 const addOnly=/add/.test(q);
 const maj7=/maj(7|9|11|13)/.test(q);
 const ext=/(7|9|11|13)/.test(q.replace(/add\d+/,''));
 if(maj7)ints.push(11);
 else if(ext&&!halfDim&&!(sixth&&!/7|13/.test(q.replace(/69|6/g,''))&&!/(?:^|[^b#])(7|11|13)/.test(q.replace(/69/g,''))))ints.push(isDim7?9:10);
 if(sixth&&!ints.includes(9))ints.push(9);
 // upper extensions, with alterations
 const q2=q.replace(/add\d+/g,'');                                       // the "add" tones are handled on their own below
 const b9=/b9/.test(q),s9=/#9/.test(q);
 if(b9)ints.push(13);
 if(s9)ints.push(15);
 if(!b9&&!s9&&!/sus2/.test(q)&&/(?:^|[^#b])(9|13|11)/.test(q2))ints.push(14);      // 9, 11 and 13 chords imply the natural 9th
 if(/#11/.test(q))ints.push(18);else if(/(?:^|[^#b\d])11/.test(q2))ints.push(17);
 if(/b13/.test(q))ints.push(20);else if(/(?:^|[^b#])13/.test(q2))ints.push(21);
 if(minor&&/(?:^|[^b#])13/.test(q2)&&!ints.includes(17))ints.push(17);               // a minor 13th chord includes the 11th
 if(/b6/.test(q))ints.push(8);                                                       // m7b6, mb6, ...
 for(const m of q.matchAll(/add(\d+)/g)){                                           // added tones: add2, add3, add4, add9, add11, add13
  const v={2:14,3:4,4:17,9:14,11:17,13:21}[Number(m[1])];if(v!==undefined)ints.push(v);
 }
 if(/alt/.test(q)){ints=[0,4,10,13,8]}
 // a plain dominant 11th has no major third (it would clash with the 11th)
 if(/(?:^|[^#b\d])11/.test(q)&&!minor&&!/sus|maj|#11|add/.test(q))ints=ints.filter(n=>n!==4);
 if(ints.includes(10)&&ints.includes(4)&&!ints.includes(21)&&(b9||s9||ints.includes(20)||/b6/.test(q)))ints=ints.filter(n=>n!==7);   // altered dominants (b9, #9, b13) leave out the natural 5th, as reference does
 ints=[...new Set(ints)];
 return {root, bass:match[3]?pc(match[3]):root, intervals:ints.slice(0,8)};
}
/*ENGINE-START*/
// Accompaniment engine: sampled instruments (samples/ folder: Salamander Grand Piano, Big Rusty Drums, Meatbass, Black and Blue Basses, jRhodes3d, FluidR3_GM organ) with a built-in Web Audio synth as fallback.
// Each style has its own drum groove, bass line, piano/organ comping and instrument timbres.
let audio=null,noiseBuffer=null,waves={};
function setupAudioAssets(){
 waves={};banks={};bankLoading={};samplesManifest=null;
 const len=audio.sampleRate;
 noiseBuffer=audio.createBuffer(1,len,audio.sampleRate);
 const a=noiseBuffer.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;
}
function getAudio(){
 if(!audio){audio=new (window.AudioContext||window.webkitAudioContext)();setupAudioAssets()}
 if(audio.state==='suspended')audio.resume();
 return audio;
}
// Mix EQ per instrument, to keep the band clear instead of muddy: the piano leaves the low end to the bass and gives up
// some 300 Hz, the bass gives up some 280 Hz, the cymbals get a little air, and the reverb only carries the mids and highs.
const MIX_EQ={piano:[['highpass',120,0,.7],['peaking',300,-3,1],['peaking',2500,1.5,.8]],bass:[['peaking',280,-3,1.1],['peaking',900,1.5,1]],drums:[['peaking',400,-2,1],['highshelf',6000,3,.7]]};
const REVERB_SEND={piano:.22,drums:.12,bass:.04};   // one shared room for the whole band
function buildMixer(bus,reverb,levels,style){
 const rin=audio.createBiquadFilter(),rlp=audio.createBiquadFilter();
 rin.type='highpass';rin.frequency.value=300;rlp.type='lowpass';rlp.frequency.value=7000;rin.connect(rlp);rlp.connect(reverb);
 bus.channels={};
 for(const key of ['piano','bass','drums']){
  const ch=audio.createGain();ch.gain.value=levels[key]??1;let node=ch;
  for(const [type,f,g,q] of MIX_EQ[key]){const b=audio.createBiquadFilter();b.type=type;b.frequency.value=f;if(type!=='highpass')b.gain.value=g;b.Q.value=q;node.connect(b);node=b}
  node.connect(bus);bus.channels[key]=ch;
  if(REVERB_SEND[key]){const sd=audio.createGain();sd.gain.value=REVERB_SEND[key]*(key==='piano'&&PEDAL[style]?1+.35*PEDAL[style]:1)*(key==='drums'&&((KIT_FOR[style]==='kit_virt'&&samplesManifest&&samplesManifest.kit_virt)||KIT_FOR[style]==='kit_rustybrush')?.5:1);node.connect(sd);sd.connect(rin)}   // the jazz kit already carries its room
 }
}
function makeReverb(){
 // a small-room impulse: a few early reflections (walls), then a diffuse tail that darkens as it decays; channels decorrelated
 const rate=audio.sampleRate,len=Math.floor(rate*1.6),buf=audio.createBuffer(2,len,rate),RT=.9;
 const taps=[[.0071,.52],[.0113,.4],[.0167,.34],[.0229,.28],[.0307,.22],[.0409,.17],[.0533,.12]];
 for(let c=0;c<2;c++){
  const d=buf.getChannelData(c);let lp=0,e1=0,e0=0;
  for(let i=0;i<len;i++){
   const t=i/rate,env=Math.pow(10,-3*t/RT),damp=Math.min(.93,.15+t*.95);
   lp+=(1-damp)*((Math.random()*2-1)-lp);
   d[i]=lp*env*(t<.014?t/.014:1);
  }
  for(const [tt,gv] of taps){const k=Math.floor((tt+(c?.0011+tt*.07:0))*rate);if(k<len)d[k]+=gv*(c&&tt>.02?-1:1)}
  // same overall energy as the old reverb, so the mix balance stays where it was measured
  for(let i=0;i<len;i++){const t=i/len;e0+=Math.pow(1-t,6.4)/3;e1+=d[i]*d[i]}
  const k=Math.sqrt(e0/Math.max(e1,1e-9));for(let i=0;i<len;i++)d[i]*=k;
 }
 const conv=audio.createConvolver();conv.buffer=buf;return conv;
}
/* ---------- small helpers ---------- */
const hz=m=>440*Math.pow(2,(m-69)/12);
const rnd=(a,b)=>a+Math.random()*(b-a);
const humanAmt=.55;   // how "live" the band feels: 0 (machine) .. 1 (loose). Fixed, no user control.
let curDyn=0;         // this bar's dynamic offset
const gauss=()=>(Math.random()+Math.random()+Math.random()-1.5)*2;           // ~ normal, sd 1
let curLag=0,curJitK=1;   // slow tempos: players sit a little behind the beat and loosen up
const jit=ms=>(Math.random()-.5)*2*ms/1000*(.4+1.2*humanAmt)*curJitK;        // micro-timing
const hv=(v,r=.08)=>Math.max(.02,v*(1+gauss()*r*(.5+2*humanAmt)));           // per-hit velocity spread
const dv=(v,sd)=>Math.max(.02,v*(1+curDyn)*(1+gauss()*sd*humanAmt));        // bar dynamics + small extra spread
const clampN=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
function wave(name,harm){
 if(!waves[name]){const re=new Float32Array(harm.length+1),im=new Float32Array(harm.length+1);for(let i=0;i<harm.length;i++)im[i+1]=harm[i];waves[name]=audio.createPeriodicWave(re,im)}
 return waves[name];
}
function outNode(bus,kind){return bus.channels?.[kind]||bus}
function gateNode(bus,kind,start,dur,rel){
 const g=audio.createGain();
 g.gain.setValueAtTime(1,start);g.gain.setValueAtTime(1,start+dur);g.gain.setTargetAtTime(0,start+dur,rel/4);
 g.connect(outNode(bus,kind));return g;
}
function noiseSrc(start,dur){
 const s=audio.createBufferSource();s.buffer=noiseBuffer;s.loop=true;s.start(start,rnd(0,.5));s.stop(start+dur+.02);return s;
}
function pluck(param,start,peak,atk,pts){
 // pts: [[timeOffset, gainMultiplier], ...] exponential decay path
 param.setValueAtTime(.0001,start);
 param.linearRampToValueAtTime(Math.max(.0002,peak),start+atk);
 for(const [t,m] of pts)param.exponentialRampToValueAtTime(Math.max(.0001,peak*m),start+t);
}
/* ---------- sampled instruments (see samples/CREDITS.txt for sources and licences) ---------- */
const sampleIO={
 buf:url=>fetch(url).then(r=>{if(!r.ok)throw new Error(url+' '+r.status);return r.arrayBuffer()}),
 json:url=>fetch(url).then(r=>{if(!r.ok)throw new Error(url+' '+r.status);return r.json()})
};
const STYLE_BANKS={swing:['piano','bass_upright','kit_virt'],bossa:['piano','bass_upright','kit_virt'],waltz:['piano','bass_upright','kit_virt'],
 ballad:['piano','bass_upright','kit_rustybrush'],pop:['piano','bass_finger','kit_rusty'],rock:['piano','bass_pick','kit_rusty'],
 funk:['ep','bass_slap','kit_rusty'],reggae:['organ','piano','bass_dub','kit_rusty'],
 blues:['piano','bass_finger','kit_virt'],samba:['piano','bass_finger','kit_rustybrush'],
 swing2:['piano','bass_upright','kit_virt'],even8:['piano','bass_upright','kit_virt'],even16:['ep','bass_finger','kit_rusty'],latin:['piano','bass_upright','kit_virt'],
 afro:['piano','bass_upright','kit_virt'],secondline:['piano','bass_upright','kit_virt'],boogaloo:['piano','bass_upright','kit_virt'],slowblues:['piano','bass_finger','kit_virt'],partido:['piano','bass_finger','kit_virt']};
// instruments chosen for the current song ('' = the style's own)
let curKeys='',curBassPick='';
const keysFor=t=>!curKeys?t:curKeys==='piano'?(t==='ep'||t==='organ'?'grand':t):curKeys;
const bassFor=k=>!curBassPick?k:curBassPick==='upright'?'upright':(k==='upright'?'finger':k);
const KIT_FOR={swing:'kit_virt',bossa:'kit_virt',waltz:'kit_virt',ballad:'kit_rustybrush',pop:'kit_rusty',rock:'kit_rusty',funk:'kit_rusty',reggae:'kit_rusty',blues:'kit_virt',samba:'kit_rustybrush',swing2:'kit_virt',even8:'kit_virt',even16:'kit_rusty',latin:'kit_virt',afro:'kit_virt',secondline:'kit_virt',boogaloo:'kit_virt',slowblues:'kit_virt',partido:'kit_virt'};
const BANK_GAIN={kit_virt:1,piano:.425,piano_ext:.425,piano_rel:.425,ep:.127,organ:.124,bass_upright:.66,bass_finger:.55,bass_pick:.47,bass_slap:.3,bass_dub:.6,kit_rusty:1,kit_rustybrush:1};
const KIT_GAIN={kick:.6,snare:.5,rim:.45,hat:.3,pedal:.3,open:.25,ride:.2,bell:.22,crash:.35,tom:.6};
const BASS_REL={upright:.12,finger:.12,pick:.08,slap:.06,dub:.15};
const STYLE_MASTER={afro:0.984,ballad:1.342,blues:1.073,boogaloo:0.963,bossa:0.894,even16:1.664,even8:1.1,funk:1.496,latin:0.744,partido:0.861,pop:0.908,reggae:1.227,rock:0.833,samba:1.181,secondline:1,slowblues:1.099,swing:0.685,swing2:0.759,waltz:0.813};   // every style plays at about the same overall loudness
const STYLE_BASS_TRIM={afro:0.716,ballad:0.725,blues:0.69,boogaloo:0.582,bossa:0.922,even16:0.548,even8:0.573,funk:0.987,latin:0.942,partido:0.894,pop:0.95,reggae:0.532,rock:1.211,samba:0.72,secondline:0.468,slowblues:0.71,swing:0.925,swing2:0.977,waltz:0.659};
let curBassTrim=1;
const STYLE_DRUM_TRIM={afro:1.472,ballad:1.687,blues:1.477,boogaloo:1.526,bossa:2.233,even16:1.218,even8:1.646,funk:0.908,latin:1.624,partido:1.646,pop:1.834,reggae:1.838,rock:1.415,samba:1.308,secondline:1.176,slowblues:2.346,swing:2.514,swing2:2.557,waltz:2.269};   // starting-point mix, set from K-weighted loudness of each instrument alone   // set by measuring each instrument alone: jazz drums had been 15-18 dB under the piano
let banks={},bankLoading={},samplesManifest=null,samplesDisabled=false,curKit='kit_rusty',curTrim=1,loadingSounds=false;
function decodeAudio(ab){return new Promise((res,rej)=>{try{const p=audio.decodeAudioData(ab,res,rej);if(p&&typeof p.catch==='function')p.catch(rej)}catch(e){rej(e)}})}
function loadBank(name){
 if(name==='kit_virt'){const mf=samplesManifest?Promise.resolve(samplesManifest):sampleIO.json('samples/manifest.json').then(x=>samplesManifest=x);
  return mf.then(x=>x&&x.kit_virt?loadBankRaw('kit_virt'):loadBankRaw('kit_rusty').then(()=>{banks.kit_virt=banks.kit_rusty}))}
 return loadBankRaw(name);
}
function loadBankRaw(name){
 if(banks[name])return Promise.resolve(banks[name]);
 if(bankLoading[name])return bankLoading[name];
 getAudio();
 const manifest=samplesManifest?Promise.resolve(samplesManifest):sampleIO.json('samples/manifest.json').then(m=>samplesManifest=m);
 return bankLoading[name]=Promise.all([manifest,sampleIO.buf('samples/'+name+'.mp3')]).then(([man,ab])=>decodeAudio(ab).then(buf=>{
  let map=man[name];if(!map)throw new Error('missing bank '+name);
  // some browsers (Safari) keep the MP3 encoder's silent lead-in (~25 ms): find where the sound really starts and move every slice by it
  {const d=buf.getChannelData(0),sr=buf.sampleRate;let i=0;while(i<d.length&&Math.abs(d[i])<.02)i++;
   const pad=i/sr-.003;if(pad>.012&&pad<.06){const m2={};for(const k of Object.keys(map)){const e=map[k];m2[k]=[e[0]+pad,e[1],e[2]]}map=m2}}
  const bk={buf,map,gain:BANK_GAIN[name]||1,notes:{},vars:{},last:{}};
  for(const key of Object.keys(map)){const base=key.split('~')[0];(bk.vars[base]||(bk.vars[base]=[])).push(map[key])}
  if(!name.startsWith('kit_'))for(const base of Object.keys(bk.vars)){
   const i=base.lastIndexOf(':'),n=Number(base.slice(i+1));
   if(Number.isFinite(n))(bk.notes[base.slice(0,i)]||(bk.notes[base.slice(0,i)]=[])).push(n);
  }
  for(const l of Object.keys(bk.notes))bk.notes[l].sort((a,b)=>a-b);
  return banks[name]=bk;
 })).catch(e=>{delete bankLoading[name];throw e});
}
// the sounds a song needs: its style's own, plus the instruments chosen for that song
function songBanks(s){
 const style=typeof s==='string'?s:s.style,base=(STYLE_BANKS[style]||STYLE_BANKS.swing).slice(),ins=(typeof s==='object'&&s.instruments)||{};
 const add=n=>{if(!base.includes(n))base.push(n)};
 if(ins.keys==='piano')add('piano');if(ins.keys==='ep')add('ep');if(ins.keys==='organ')add('organ');if(ins.keys==='vibes')add('vibes');
 if(typeof s==='object'&&percOn(s))add('perc');
 if(base.includes('piano'))add('piano_rel');
 if(ins.bass==='upright')add('bass_upright');if(ins.bass==='electric')add(base.some(n=>n.startsWith('bass_')&&n!=='bass_upright')?base.find(n=>n.startsWith('bass_')&&n!=='bass_upright'):'bass_finger');
 if(ins.drums==='sticks')add('kit_rusty');if(ins.drums==='brushes')add('kit_rustybrush');
 return base;
}
function loadBanks(s){return Promise.all(songBanks(s).map(loadBank))}
function banksReady(s){return songBanks(s).every(n=>banks[n])}
function pickVar(bk,base){
 const v=bk.vars[base];if(!v)return null;if(v.length===1)return v[0];
 let i;do{i=Math.floor(Math.random()*v.length)}while(i===bk.last[base]);bk.last[base]=i;return v[i];
}
function sampleTone(bk,m,start,dur,vel,bus,kind,opt){
 let layer;
 const vl=Object.keys(bk.notes).filter(l=>/^v\d+$/.test(l));
 if(vl.length){                                                    // numbered velocity layers (Salamander v1..v16): pick the nearest to this touch
  const target=1+clampN(vel*.8,0,1)*15;                          // a softer touch: the same playing lands on gentler layers
  layer=vl.reduce((a,b)=>Math.abs(+b.slice(1)-target)<Math.abs(+a.slice(1)-target)?b:a);
 }else{
  const layers=['soft','mid','loud','a'].filter(l=>bk.notes[l]);if(!layers.length)return false;
  layer=layers.length===3?(vel<.58?'soft':vel<.76?'mid':'loud'):layers.length===2?(vel<.62?layers[0]:layers[1]):layers[0];
 }
 const list=bk.notes[layer];
 let n=list[0];for(const x of list)if(Math.abs(x-m)<Math.abs(n-m))n=x;
 const e=pickVar(bk,layer+':'+n);if(!e)return false;
 const src=audio.createBufferSource();src.buffer=bk.buf;src.playbackRate.value=Math.pow(2,(m-n+(Math.random()*2-1)*.03)/12);   // ±3 cents
 let rel=opt.rel||.15;
 {const avail=e[1]/src.playbackRate.value;if(dur+rel*.8>avail)dur=Math.max(.05,avail-rel*.8)}   // never run past the end of the recording
 if(kind==='piano'&&rel>=.2)rel=Math.max(rel,Math.min(.55,Math.max(.2,.55-(m-36)*.008)));   // low notes ring longer after the key is released
 const g=audio.createGain(),peak=Math.min(2.5,vel*(opt.g||1)*bk.gain/Math.max(e[2],.05))*Math.pow(10,(Math.random()*2-1)*.4/20);
 g.gain.setValueAtTime(peak,start);g.gain.setValueAtTime(peak,start+dur);g.gain.setTargetAtTime(0,start+dur,rel/3);
 if(opt.filter){const f=audio.createBiquadFilter();f.type=opt.filter[0];f.frequency.value=opt.filter[1];if(opt.filter[2]!=null)f.gain.value=opt.filter[2];src.connect(f);f.connect(g)}else src.connect(g);
 g.connect(outNode(bus,kind));
 src.start(start,e[0],e[1]);src.stop(start+dur+rel+.2);
 return true;
}
// where each drum sits across the stereo field, as heard from in front of the kit
const KIT_PAN={hat:.3,open:.3,pedal:.26,hihat:.3,ride:-.26,bell:-.26,crash:-.34,tom:.12,stir:-.06,brush:-.04};
// Virtuosity Drums (CC0) level per piece, matched to the Big Rusty the mix was balanced on (measured)
const VIRT_TRIM={"kick": 0.44, "snare": 0.8, "rim": 1.45, "hat": 2.16, "open": 3.28, "pedal": 1.23, "ride": 1.77, "bell": 1.23, "crash": 0.66, "tom": 0.6};
const CYMBALS=new Set(['hat','open','pedal','ride','bell','crash']),BRUSHED=new Set(['stir','snare','brush','rim']);
function kitHit(key,vel,start,bus,gk){
 if(samplesDisabled)return false;
 const bk=banks[curKit],e=bk&&pickVar(bk,key);if(!e)return false;
 const src=audio.createBufferSource();src.buffer=bk.buf;
 src.playbackRate.value=1+(Math.random()*2-1)*.012;                       // no two hits exactly alike
 const isVirt=bk===banks.kit_virt&&banks.kit_virt!==banks.kit_rusty;   // the real Virtuosity kit, not the Big Rusty standing in for it
 const vt=isVirt?(VIRT_TRIM[String(key).split(/[:~]/)[0]]||1):1;
 const g=audio.createGain();g.gain.value=Math.min(4,vel*gk*bk.gain*curTrim*vt/Math.max(e[2],.05))*Math.pow(10,(Math.random()*2-1)*.8/20);
 const piece=String(key).split(/[:_~]/)[0],pan=KIT_PAN[piece]||0;
 let head=g;
 if(bk===banks.kit_rustybrush&&BRUSHED.has(piece)&&audio.createBiquadFilter){const sh=audio.createBiquadFilter();sh.type='highshelf';sh.frequency.value=4000;sh.gain.value=-4;g.connect(sh);head=sh}   // brushes: less hiss
 else if(isVirt&&CYMBALS.has(piece)&&audio.createBiquadFilter){const sh=audio.createBiquadFilter();sh.type='highshelf';sh.frequency.value=5500;sh.gain.value=-3;g.connect(sh);head=sh}   // cymbals a touch less bright
 src.connect(g);
 if(pan&&audio.createStereoPanner){const pn=audio.createStereoPanner();pn.pan.value=pan;head.connect(pn);pn.connect(outNode(bus,'drums'))}
 else head.connect(outNode(bus,'drums'));
 src.start(start,e[0],e[1]);
 return true;
}
/* ---------- melodic instruments ---------- */
// the damper falling back on the strings when a piano key is released (Salamander release recordings):
// about 31 dB under the note, following the touch, a little softer after a long note
let liveKey=false;   // a MIDI key: its damper noise plays at the real key-up, not at a planned note end
function damperNoise(m,at,vel,held,bus){
 const bk=banks.piano_rel;if(!bk||samplesDisabled)return;
 sampleTone(bk,m,at,.35,Math.max(.01,vel*.028*Math.pow(10,-2*Math.min(held,6)/20)),bus,'piano',{rel:.12});
}
function piano(m,start,dur,vel,bus,timbre='grand'){
 timbre=keysFor(timbre);
 vel=dv(vel,.04);
 const ctx=audio,f=hz(m);dur=Math.max(.04,dur);
 if(!samplesDisabled){
  if(timbre==='vibes'&&m<53)m+=12;   // the vibraphone starts at F3: lower notes move up an octave
  const bk=timbre==='ep'?banks.ep:timbre==='organ'?banks.organ:timbre==='vibes'?banks.vibes:((m<39||m>81)&&banks.piano_ext?banks.piano_ext:banks.piano);   // piano_ext: the low and high ends of an 88-key keyboard
  if(bk){
   const opt=timbre==='organ'?{rel:.05}:timbre==='vibes'?{rel:.5,g:.185,filter:['highshelf',3500,-2]}:timbre==='ep'?{rel:.25}:timbre==='soft'?{rel:.25,filter:['highshelf',3500,-3.5]}:timbre==='bright'?{rel:.2,filter:['highshelf',3000,1]}:{rel:.22,filter:['highshelf',3500,-2.5]};
   if(sampleTone(bk,m,start,dur,vel,bus,'piano',opt)){if(!liveKey&&(bk===banks.piano||bk===banks.piano_ext))damperNoise(m,start+dur,vel,dur,bus);return}
  }
 }
 if(timbre==='organ'){
  const gate=gateNode(bus,'piano',start,dur,.05),amp=ctx.createGain();amp.connect(gate);
  pluck(amp.gain,start,vel*.17,.005,[[.06,.8],[Math.max(.07,dur),.7]]);
  const o=ctx.createOscillator();o.setPeriodicWave(wave('organ',[1,.75,.55,.33,.2,.14,.09]));o.frequency.value=f;o.connect(amp);o.start(start);o.stop(start+dur+.4);
  if(f*4<14000){const k=ctx.createOscillator(),kg=ctx.createGain();k.frequency.value=f*4;kg.gain.setValueAtTime(vel*.12,start);kg.gain.exponentialRampToValueAtTime(.0001,start+.07);k.connect(kg);kg.connect(gate);k.start(start);k.stop(start+.1)}
  return;
 }
 const gate=gateNode(bus,'piano',start,dur,timbre==='ep'?.25:.2),amp=ctx.createGain();
 if(timbre==='ep'){
  const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=Math.min(9000,f*10);amp.connect(lp);lp.connect(gate);
  pluck(amp.gain,start,vel*.26,.003,[[.5,.55],[3,.14]]);
  const car=ctx.createOscillator(),mod=ctx.createOscillator(),mg=ctx.createGain();
  car.frequency.value=f;mod.frequency.value=f;mg.gain.setValueAtTime(f*(.7+2.4*vel),start);mg.gain.exponentialRampToValueAtTime(f*.1,start+.5);
  mod.connect(mg);mg.connect(car.frequency);car.connect(amp);car.start(start);mod.start(start);car.stop(start+dur+.7);mod.stop(start+dur+.7);
  if(f*14<15000){const t=ctx.createOscillator(),tg=ctx.createGain();t.frequency.value=f*14;tg.gain.setValueAtTime(vel*.07,start);tg.gain.exponentialRampToValueAtTime(.0001,start+.05);t.connect(tg);tg.connect(gate);t.start(start);t.stop(start+.08)}
  return;
 }
 const br=timbre==='bright'?1.15:timbre==='soft'?.5:.8;
 const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.Q.value=.4;
 lp.frequency.setValueAtTime(Math.min(15000,f*(4+18*vel*br)),start);lp.frequency.exponentialRampToValueAtTime(Math.max(f*2.3,700),start+.7);
 amp.connect(lp);lp.connect(gate);
 const ds=m<55?1.5:m>76?.65:1;
 pluck(amp.gain,start,vel*.21,.004,[[.4*ds,.42],[3.4*ds,.1]]);
 const w=wave('grand',[1,.62,.4,.27,.18,.12,.08,.05,.03]);
 for(const d of [-3,3]){const o=ctx.createOscillator();o.setPeriodicWave(w);o.frequency.value=f;o.detune.value=d+rnd(-1,1);o.connect(amp);o.start(start);o.stop(start+dur+.6)}
 const n=noiseSrc(start,.03),bp=ctx.createBiquadFilter(),ng=ctx.createGain();
 bp.type='bandpass';bp.frequency.value=clampN(f*3,500,5000);bp.Q.value=1;
 ng.gain.setValueAtTime(vel*.07,start);ng.gain.exponentialRampToValueAtTime(.0001,start+.022);
 n.connect(bp);bp.connect(ng);ng.connect(gate);
}
const BASS_KINDS={
 upright:{h:[1,.55,.28,.14,.07],lp0:9,lp1:3.4,tau:.25,atk:.009,pts:[[.2,.55]],tail:.4,rel:.07},
 finger:{h:[1,.5,.4,.3,.22,.15,.1],lp0:14,lp1:5,tau:.3,atk:.005,pts:[[.3,.6]],tail:.3,rel:.08},
 pick:{h:[1,.7,.55,.45,.35,.28,.2,.15],lp0:22,lp1:8,tau:.15,atk:.003,pts:[[.15,.7]],tail:.15,rel:.05},
 slap:{h:[1,.85,.7,.6,.5,.45,.4,.3,.25,.2],lp0:38,lp1:5,tau:.09,atk:.002,pts:[[.12,.42]],tail:.1,rel:.04},
 dub:{h:[1,.3,.07],lp0:3.6,lp1:3.2,tau:.5,atk:.014,pts:[[.5,.82]],tail:.2,rel:.1}
};
function bass(m,start,dur,vel,bus,kind='upright'){
 kind=bassFor(kind);
 vel=dv(vel,.04);
 const ctx=audio,f=hz(m),k=BASS_KINDS[kind]||BASS_KINDS.upright;dur=Math.max(.05,dur);
 if(!samplesDisabled&&banks['bass_'+kind]&&sampleTone(banks['bass_'+kind],m,start,dur,vel,bus,'bass',{rel:BASS_REL[kind]||.1,g:curBassTrim,filter:kind==='upright'?['lowshelf',110,3]:undefined}))return;   // a little more low end on the double bass
 const gate=gateNode(bus,'bass',start,dur,k.rel),amp=ctx.createGain(),lp=ctx.createBiquadFilter();
 lp.type='lowpass';lp.Q.value=kind==='slap'?2.5:.7;
 lp.frequency.setValueAtTime(clampN(f*k.lp0,250,3500),start);lp.frequency.exponentialRampToValueAtTime(clampN(f*k.lp1,120,1500),start+k.tau);
 amp.connect(lp);lp.connect(gate);
 const pts=k.pts.slice();pts.push([Math.max(.4,dur),.35]);
 pluck(amp.gain,start,vel*.52,k.atk,pts);
 const o=ctx.createOscillator();o.setPeriodicWave(wave('b'+kind,k.h));o.frequency.value=f;o.connect(amp);o.start(start);o.stop(start+dur+k.tail+.3);
 if(kind==='upright'||kind==='slap'){
  const n=noiseSrc(start,.03),hp=ctx.createBiquadFilter(),ng=ctx.createGain();
  hp.type='highpass';hp.frequency.value=kind==='slap'?1800:1200;ng.gain.setValueAtTime(vel*(kind==='slap'?.16:.05),start);ng.gain.exponentialRampToValueAtTime(.0001,start+.012);
  n.connect(hp);hp.connect(ng);ng.connect(gate);
 }
}
/* ---------- drums ---------- */
const KICKS={jazz:[95,55,.13,0],boss:[105,55,.14,.1],rock:[140,48,.22,.4],pop:[125,46,.2,.28],funk:[120,50,.13,.32],dub:[90,42,.28,.1]};
function kick(start,vel,bus,kind='rock'){
 vel=dv(vel,.07);start+=jit(1.8);
 if(kitHit(vel<.4?'kick:lo':vel<.75?'kick:mid':'kick:hi',vel,start,bus,KIT_GAIN.kick))return;
 const ctx=audio,[f0,f1,len,click]=KICKS[kind]||KICKS.rock,o=ctx.createOscillator(),g=ctx.createGain(),out=outNode(bus,'drums');
 o.frequency.setValueAtTime(f0,start);o.frequency.exponentialRampToValueAtTime(f1,start+len*.55);
 g.gain.setValueAtTime(Math.max(.0002,vel*.95),start);g.gain.exponentialRampToValueAtTime(.0001,start+len);
 o.connect(g);g.connect(out);o.start(start);o.stop(start+len+.02);
 if(click>0){const n=noiseSrc(start,.01),hp=ctx.createBiquadFilter(),cg=ctx.createGain();hp.type='highpass';hp.frequency.value=2500;cg.gain.setValueAtTime(vel*click*.5,start);cg.gain.exponentialRampToValueAtTime(.0001,start+.008);n.connect(hp);hp.connect(cg);cg.connect(out)}
}
const SNARES={rock:[3600,.22,190,.5,.75],funk:[4200,.13,215,.4,.6],jazz:[3000,.1,220,.35,.45],ghost:[4000,.07,215,.25,.35],brush:[4600,.24,0,0,.4]};
function snare(start,vel,bus,kind='rock'){
 vel=dv(vel,.07);start+=jit(1.8);
 if(kitHit(kind==='brush'?'snare:mid':kind==='ghost'||vel<.3?'snare:lo':vel<.62?'snare:mid':'snare:hi',vel,start,bus,KIT_GAIN.snare))return;
 const ctx=audio,[nf,len,tf,tg,ng]=SNARES[kind]||SNARES.rock,out=outNode(bus,'drums');
 const n=noiseSrc(start,len),bp=ctx.createBiquadFilter(),g=ctx.createGain();
 bp.type='bandpass';bp.frequency.value=nf;bp.Q.value=kind==='brush'?.45:.7;
 if(kind==='brush'){g.gain.setValueAtTime(.0001,start);g.gain.linearRampToValueAtTime(vel*ng,start+.016);}else g.gain.setValueAtTime(vel*ng,start);
 g.gain.exponentialRampToValueAtTime(.0001,start+len);
 n.connect(bp);bp.connect(g);g.connect(out);
 if(tf>0){const o=ctx.createOscillator(),og=ctx.createGain();o.type='triangle';o.frequency.setValueAtTime(tf*1.25,start);o.frequency.exponentialRampToValueAtTime(tf,start+.04);og.gain.setValueAtTime(vel*tg,start);og.gain.exponentialRampToValueAtTime(.0001,start+Math.min(.12,len*.7));o.connect(og);og.connect(out);o.start(start);o.stop(start+.14)}
}
function rim(start,vel,bus){
 vel=dv(vel,.07);start+=jit(1.8);
 if(kitHit('rim',vel,start,bus,KIT_GAIN.rim))return;
 const ctx=audio,out=outNode(bus,'drums'),o=ctx.createOscillator(),g=ctx.createGain();
 o.type='triangle';o.frequency.setValueAtTime(900,start);o.frequency.exponentialRampToValueAtTime(620,start+.025);
 g.gain.setValueAtTime(vel*.45,start);g.gain.exponentialRampToValueAtTime(.0001,start+.045);o.connect(g);g.connect(out);o.start(start);o.stop(start+.06);
 const n=noiseSrc(start,.04),bp=ctx.createBiquadFilter(),ng=ctx.createGain();bp.type='bandpass';bp.frequency.value=2600;bp.Q.value=5;
 ng.gain.setValueAtTime(vel*.55,start);ng.gain.exponentialRampToValueAtTime(.0001,start+.03);n.connect(bp);bp.connect(ng);ng.connect(out);
}
function metal(start,dur,vel,bus,o){
 const ctx=audio,out=outNode(bus,'drums'),bp=ctx.createBiquadFilter(),hp=ctx.createBiquadFilter(),g=ctx.createGain();
 bp.type='bandpass';bp.frequency.value=o.bp;bp.Q.value=o.q||.8;hp.type='highpass';hp.frequency.value=o.hp;
 g.gain.setValueAtTime(.0001,start);g.gain.linearRampToValueAtTime(vel,start+.002);
 if(o.pts)for(const [t,m] of o.pts)g.gain.exponentialRampToValueAtTime(Math.max(.0001,vel*m),start+t);
 g.gain.exponentialRampToValueAtTime(.0001,start+dur);
 bp.connect(hp);hp.connect(g);g.connect(out);
 for(const r of [263,400,421,474,587,845]){const s=ctx.createOscillator(),sg=ctx.createGain();s.type='square';s.frequency.value=r*(o.pitch||1);sg.gain.value=.16;s.connect(sg);sg.connect(bp);s.start(start);s.stop(start+dur+.02)}
}
function hat(start,vel,bus,kind='closed'){
 vel=dv(vel,.07);start+=jit(1.8);
 if(kitHit(kind==='open'?'open':kind==='pedal'?'pedal':vel<.25?'hat:lo':vel<.38?'hat:mid':'hat:hi',vel,start,bus,KIT_GAIN[kind==='open'?'open':kind==='pedal'?'pedal':'hat']))return;
 const ctx=audio,out=outNode(bus,'drums');
 if(kind==='open'){metal(start,.32,vel*.32,bus,{bp:9000,hp:6500,pts:[[.05,.5]]});return}
 const n=noiseSrc(start,.1),hp=ctx.createBiquadFilter(),bp=ctx.createBiquadFilter(),g=ctx.createGain();
 if(kind==='pedal'){hp.type='highpass';hp.frequency.value=3500;bp.type='bandpass';bp.frequency.value=5200;bp.Q.value=.7;g.gain.setValueAtTime(vel*.55,start);g.gain.exponentialRampToValueAtTime(.0001,start+.055)}
 else{hp.type='highpass';hp.frequency.value=7000;bp.type='bandpass';bp.frequency.value=10000;bp.Q.value=.6;g.gain.setValueAtTime(vel*.62,start);g.gain.exponentialRampToValueAtTime(.0001,start+.042)}
 n.connect(hp);hp.connect(bp);bp.connect(g);g.connect(out);
}
function ride(start,vel,bus,bell){
 vel=dv(vel,.07);start+=jit(1.8);
 if(kitHit(bell?'bell':vel<.45?'ride:lo':vel<.65?'ride:mid':'ride:hi',vel,start,bus,KIT_GAIN[bell?'bell':'ride']))return;
 metal(start,bell?.8:.38,vel*.3,bus,{bp:bell?5600:6800,hp:4200,q:.6,pitch:bell?1.3:1.08,pts:[[.025,.5],[.12,.14]]});
}
function crash(start,vel,bus){vel=dv(vel,.07);start+=jit(1.8);if(kitHit('crash',vel,start,bus,KIT_GAIN.crash))return;metal(start,1.5,vel*.4,bus,{bp:5200,hp:2800,q:.5,pitch:1.15,pts:[[.1,.6],[.6,.25]]})}
function tom(start,vel,bus,f0){
 vel=dv(vel,.07);start+=jit(1.8);
 if(kitHit(f0>=200?'tom:50':f0>=170?'tom:48':f0>=130?'tom:45':'tom:41',vel,start,bus,KIT_GAIN.tom))return;
 const ctx=audio,o=ctx.createOscillator(),g=ctx.createGain();
 o.frequency.setValueAtTime(f0,start);o.frequency.exponentialRampToValueAtTime(f0*.55,start+.2);
 g.gain.setValueAtTime(vel*.85,start);g.gain.exponentialRampToValueAtTime(.0001,start+.26);o.connect(g);g.connect(outNode(bus,'drums'));o.start(start);o.stop(start+.28);
}
function click(start,vel,bus,high){
 const ctx=audio,o=ctx.createOscillator(),g=ctx.createGain();
 o.frequency.value=high?1700:1150;g.gain.setValueAtTime(vel*.6,start);g.gain.exponentialRampToValueAtTime(.0001,start+.05);
 o.connect(g);g.connect(outNode(bus,'drums'));o.start(start);o.stop(start+.07);
}
/* ---------- harmony helpers ---------- */
const lowest=(pc,ref,lo,hi)=>{let best=null;for(let m=lo;m<=hi;m++)if(((m%12)+12)%12===pc&&(best===null||Math.abs(m-ref)<Math.abs(best-ref)))best=m;return best};
function toneInfo(chord){
 const q=chord.intervals,has=n=>q.includes(n);
 const third=has(3)?3:has(4)?4:has(2)?2:has(5)?5:null;       // null: power chord
 const fifth=has(6)?6:has(8)?8:7;
 const seventh=has(11)?11:has(10)?10:null;
 const six=has(9)&&seventh===null;
 return {third,fifth,seventh,six,minor:third===3,dim:has(3)&&has(6)&&!has(10),
  ext:[13,14,15,17,18,20,21].filter(has)};                    // 9ths, 11ths and 13ths, natural or altered, as written in the symbol
}
function clashCost(notes){
 // harshness of a set of notes: semitones and minor ninths hurt; low seconds are muddy
 let c=0;
 for(let i=0;i<notes.length;i++)for(let j=i+1;j<notes.length;j++){
  const d=notes[j]-notes[i];
  if(d===1)c+=40;else if(d===13)c+=14;
  else if(d===2)c+=notes[i]<57?10:2;
  else if(d===14&&notes[i]<53)c+=3;
  else if(d===11&&j===i+1)c+=3;
 }
 return c;
}
function stackVoicing(root,offsets,lo,hi,prevCenter,bottomTarget,variety=0){
 // Try every rotation of the chord stack in two registers; keep the smoothest, least clashing one.
 const sorted=[...new Set(offsets)].sort((a,b)=>a-b);
 let best=null;
 for(let k=0;k<sorted.length;k++){
  const order=sorted.slice(k).concat(sorted.slice(0,k));
  for(const shift of [0,12]){
   const notes=[];let prev=null;
   for(const off of order){
    const p=(root+off)%12;let m;
    if(prev===null)m=lowest(p,bottomTarget+shift,lo,hi+12);
    else{m=prev+1;while(m%12!==p)m++}
    notes.push(m);prev=m;
   }
   const top=Math.max(...notes),bottom=Math.min(...notes),center=notes.reduce((a,b)=>a+b,0)/notes.length;
   const cost=Math.abs(center-prevCenter)+(top>hi+4?20:0)+(bottom<lo-3?20:0)+(top-bottom>15?8:0)+clashCost([...notes].sort((a,b)=>a-b))+(variety?Math.random()*variety:0);
   if(!best||cost<best.cost)best={notes:notes.sort((a,b)=>a-b),cost,center};
  }
 }
 return best;
}
function fullVoicing(chord,mem){
 // Two-hand shapes: the bass note low (MIDI 41-52), then the chord tones stacked above it:
 // R-5-7-3, R-7-3-5, R-3-7-R, and with extensions R-7-9-3 ...
 const t=toneInfo(chord),S=t.seventh!==null?t.seventh:(t.six?9:null),T=t.third,F=t.fifth;
 const ext=t.ext.filter(n=>n!==16),stacks=[];
 const add=a=>{if(a.every(x=>x!==null&&x!==undefined))stacks.push(a)};
 add([0,F,S,T]);add([0,S,T,F]);add([0,T,S,12]);add([0,F,T,S]);                // R-5-7-3, R-7-3-5, R-3-7-R, R-5-3-7
 if(ext.length){
  const e=ext[0];
  add([0,S,e,T]);add([0,F,e,T,S]);add([0,S,T,e]);                                  // R-7-9-3, R-5-9-3-7, R-7-3-9
  add([0,S,e,T,F]);add([0,F,S,e,T]);add([0,F,T,S,e]);                              // R-7-9-3-5, R-5-7-9-3, R-5-3-7-9
  add([0,e,S,T]);add([0,F,T,e,S]);                                                 // R-#11-7-3, R-5-3-#11-7 (and the same with other tensions)
  if(S!==null){add([0,S,e,T,S]);add([0,S,T,S,e]);add([0,S,T,e,S])}                 // shapes with the 7th doubled
  if(ext.length>1){const e2=ext[1];add([0,S,e,T,e2]);add([0,F,e,T,e2,S]);add([0,e2,S,e,T])}   // two tensions: 9 and 11, 9 and 13
 }
 if(t.third===3&&F===6&&S===9){add([0,F,S,0,T]);add([0,S,0,T,F]);add([0,0,T,F,S])}   // diminished 7th: minor thirds with the root doubled
 if(S===null&&F===8){add([0,F,0,T]);add([0,F,T,F])}                                // augmented triad
 if(S===null){add([0,F,T,12]);add([0,T,F,12])}
 if(!stacks.length)add([0,F,12]);
 let best=null;
 for(const st of stacks){
  const notes=[lowest(chord.bass,46,41,52)];
  for(let k=1;k<st.length;k++){let m=notes[k-1]+1;const p=(chord.root+st[k])%12;while(m%12!==p)m++;notes.push(m)}
  const upper=notes.slice(1),center=upper.reduce((a,b)=>a+b,0)/upper.length;
  const top=notes[notes.length-1],cost=Math.abs(center-(mem.pf??58))+clashCost(notes)+(top>76?20:0)+(top-notes[0]>20?10:0)+Math.random()*1.5;
  if(!best||cost<best.cost)best={notes,cost,center};
 }
 mem.pf=best.center;
 return best.notes;
}
function voicing(chord,kind,mem){
 if(kind==='full')return fullVoicing(chord,mem);
 const t=toneInfo(chord),root=chord.root;
 let offsets,lo,hi,target;
 if(kind==='jazz'){
  offsets=[];
  if(t.third!==null)offsets.push(t.third);
  if(t.seventh!==null)offsets.push(t.seventh);else if(t.six)offsets.push(9);
  if(t.fifth!==7)offsets.push(t.fifth);
  for(const n of t.ext)offsets.push(n);
  if(!t.ext.length&&(t.seventh!==null||t.six)){
   if(t.minor&&t.fifth===6&&t.seventh===10)offsets.push(17);
   else if(t.third!==2&&t.third!==5&&t.fifth===7)offsets.push(14);
  }
  if(t.seventh===null&&!t.six&&!t.ext.length){offsets.push(t.fifth);offsets.push(12)}
  if(new Set(offsets).size<3)offsets.push(7);
  lo=52;hi=72;target=55;
 }else if(kind==='seventh'){
  offsets=[0,t.fifth];if(t.third!==null)offsets.push(t.third);
  if(t.seventh!==null)offsets.push(t.seventh);else if(t.six)offsets.push(9);
  lo=50;hi=70;target=54;
 }else{ // triad
  offsets=[0,t.fifth];if(t.third!==null)offsets.push(t.third);
  lo=50;hi=70;target=55;
 }
 const v=stackVoicing(root,offsets,lo,hi,mem.pc??62,target,1.2);
 mem.pc=v.center;
 return v.notes;
}
function scaleFor(chord){
 // the main scale for each kind of chord (standard chord-scale theory)
 const q=chord.intervals,has=n=>q.includes(n),t=toneInfo(chord);
 if(t.third===3&&t.fifth===6&&t.six)return [0,2,3,5,6,8,9,11];                 // diminished 7th: whole-half diminished
 if(t.third===3&&t.fifth===6&&t.seventh===10)return [0,1,3,5,6,8,10];          // half-diminished: locrian
 if(t.third===4&&t.fifth===8&&t.seventh===null)return [0,2,4,6,8,10];           // augmented: whole tone
 if(t.seventh===10&&t.third!==3){                                              // dominant (and sus)
  if(has(13)&&has(8))return [0,1,3,4,6,8,10];                                  // altered
  if(has(13)||has(20)||has(8))return [0,1,4,5,7,8,10];                         // mixolydian b9 b13
  if(has(18))return [0,2,4,6,7,9,10];                                          // lydian dominant
  return [0,2,4,5,7,9,10];                                                     // mixolydian
 }
 if(t.seventh===11&&t.third===3)return [0,2,3,5,7,9,11];                       // minor-major: melodic minor
 if(t.seventh===11)return has(18)?[0,2,4,6,7,9,11]:[0,2,4,5,7,9,11];           // lydian or major
 if(t.third===3)return [0,2,3,5,7,9,10];                                       // minor: dorian
 if(t.third===null)return [0,2,4,7,9];                                         // power chord: major pentatonic
 return [0,2,4,5,7,9,11];                                                      // major
}
function chordTonesPc(chord){
 const t=toneInfo(chord),r=chord.root;
 const set=[0,t.fifth];if(t.third!==null)set.push(t.third);
 if(t.seventh!==null)set.push(t.seventh);else if(t.six)set.push(9);
 return set.map(o=>(r+o)%12);
}
/* ---------- bass line helpers ---------- */
function walkNote(seg,beat,isStart,isLast,nextPc,mem){
 const c=seg.c,lo=28,hi=46,last=mem.bassLast??36,rootPc=c.bass;   // walking register E1 to A#2, where a jazz bassist spends most of the time
 let m;
 if(isStart)m=lowest(rootPc,last,lo,hi);
 else if(isLast&&nextPc!=null){
  const target=lowest(nextPc,last,lo,hi);
  m=target+(target>=last?-1:1);
  if(m===last)m=target+(Math.random()<.5?1:-1);
 }else{
  const pcs=chordTonesPc(c);
  if(beat%2===1)for(const x of scaleFor(c))pcs.push((c.root+x)%12);         // weak beats may pass through the chord's scale; strong beats stay on chord tones
  const dir=mem.dir||1;let cands=[];
  for(let x=lo;x<=hi;x++){const d=x-last;if(pcs.includes(x%12)&&x!==last&&((dir>0&&d>0&&d<=5)||(dir<0&&d<0&&d>=-5)))cands.push(x)}
  if(!cands.length){mem.dir=-dir;for(let x=lo;x<=hi;x++){const d=x-last;if(pcs.includes(x%12)&&x!==last&&Math.abs(d)<=5)cands.push(x)}}
  if(!cands.length)cands=[lowest(rootPc,last,lo,hi)];
  cands.sort((a,b)=>Math.abs(a-last)-Math.abs(b-last));
  m=cands[Math.min(cands.length-1,Math.random()<.35?1:0)];
  if(Math.random()<.18)mem.dir=-(mem.dir||1);
 }
 m=clampN(m,lo-1,hi+1);
 mem.bassLast=m;
 return m;
}
function rootNote(chord,mem,lo=28,hi=43,ref){
 const m=lowest(chord.bass,ref??mem.bassLast??36,lo,hi);mem.bassLast=m;return m;
}
function fifthNote(chord,mem,lo=28,hi=47){
 const t=toneInfo(chord),m=lowest((chord.root+t.fifth)%12,mem.bassLast??36,lo,hi);return m;
}
/* ---------- the groove engine ---------- */

/* ---------- pattern styles: each one is a table of drum / bass / piano events, run by the same engine ----------
   Drum lines: [instrument, position, probability, velocity, extra, barParity]. Measured on reference drum loops where noted
   (ride, hi-hat and bass drum); the snare parts are written by hand because the loops could not separate them reliably. */
const SWING_CELLS=[[[0,.9,.8],[1.5,.5,.7]],[[1.5,.5,.7],[3,.8,.75]],[[0,.5,.7],[2.5,.5,.7],[3.5,.4,.6]],[[1,.5,.65],[3.5,.5,.7]],[[0,.8,.8],[2.5,.6,.7]],[[0.5,.5,.65],[2,.9,.75]]];
const EVEN_CELLS=[[[0,.9,.78],[1.5,.5,.68]],[[.5,.5,.68],[2,.9,.74]],[[1,.5,.66],[2.5,.5,.7],[3.5,.4,.6]],[[0,.6,.75],[2.5,.9,.7]]];
const PATTERN_STYLES={
 swing2:{ // Swing two-feel ("Swing Two/Four", "Trad Jazz"): bass in half notes, ride as measured, heavier kick on 1 and 3
  drums:[['ride',0,1,.72],['ride',1,1,.8],['ride',2,1,.66],['ride',3,1,.8],['ride',1.5,.85,.55],['ride',3.5,.8,.6],['ride',.5,.35,.5],['ride',2.5,.3,.55],
   ['pedal',1,1,.45],['pedal',3,1,.45],['kick',0,.95,.34],['kick',2,.8,.3],['kick',1,.6,.18],['kick',3,.65,.18]],
  fillOut:3,fill:[[2.5,'snare',.4],[3,'kick',.45],[3.5,'snare',.6]],crash:.45,
  bass:{kind:'upright',notes:[[0,1.9,.92,'R'],[2,1.4,.85,'5'],[3.5,.4,.6,'A',.35]]},
  piano:{cells:SWING_CELLS,kind:'full',timbre:'grand'}},
 even8:{ // Jazz even 8ths ("Even 8ths"): straight ride 8ths with accents on the beats, cross-stick on 4, sparse kick
  drums:[['ride',0,1,.76],['ride',.5,1,.52],['ride',1,1,.77],['ride',1.5,.9,.56],['ride',2,1,.75],['ride',2.5,1,.52],['ride',3,1,.72],['ride',3.5,1,.6],
   ['rim',3,.85,.5],['rim',1,.3,.4],['pedal',1,.8,.35],['pedal',3,.8,.35],
   ['kick',0,.5,.4],['kick',1,.4,.25],['kick',1.5,.35,.35],['kick',2.5,.45,.3],['kick',3.5,.5,.3]],
  fillOut:3,fill:[[3,'snare',.45],[3.25,'snare',.4],[3.5,'tom',.5,190],[3.75,'tom',.55,140]],crash:.45,
  bass:{kind:'upright',walk:true},
  piano:{cells:EVEN_CELLS,kind:'jazz',timbre:'grand'}},
 even16:{ // Even 16ths ("Even 16ths"): 16th hi-hat with the measured density, backbeat, syncopated bass, electric piano
  drums:[['hat',0,.85,.42],['hat',.25,.4,.22],['hat',.5,.83,.32],['hat',.75,.61,.24],['hat',1,.61,.4],['hat',1.25,.67,.22],['hat',1.5,.72,.32],['hat',1.75,.61,.24],
   ['hat',2,.83,.42],['hat',2.25,.28,.22],['hat',2.5,.89,.32],['hat',2.75,.44,.24],['hat',3,.83,.4],['hat',3.25,.61,.22],['hat',3.5,.67,.34],['hat',3.75,.61,.24],
   ['snare',1,1,.62,'funk'],['snare',3,1,.64,'funk'],['snare',1.75,.3,.2,'ghost'],['snare',2.25,.25,.18,'ghost'],['snare',3.75,.3,.2,'ghost'],
   ['kick',0,.95,.75,'funk'],['kick',.75,.3,.45,'funk'],['kick',2.25,.35,.5,'funk'],['kick',2.5,.4,.55,'funk'],['kick',3.25,.45,.5,'funk']],
  fillOut:3,fill:[[3,'snare',.5,'funk'],[3.25,'snare',.55,'funk'],[3.5,'snare',.6,'funk'],[3.75,'snare',.65,'funk']],crash:.5,
  bass:{kind:'finger',notes:[[0,.7,.9,'R'],[.75,.25,.6,'R'],[1.5,.4,.75,'8',.6],[2,.7,.85,'R'],[2.75,.25,.6,'5'],[3.5,.4,.7,'A',.5]]},
  piano:{hits:[[0,.5,.7],[.75,.25,.6,.6],[1.5,.4,.65],[2.75,.25,.62,.6],[3.5,.4,.62]],kind:'jazz',timbre:'ep'}},
 latin:{ // Latin jazz ("Latin"): ride as measured, son clave 2-3 on cross-stick, tumbao kick and bass, montuno-like piano
  drums:[['ride',0,1,.5],['ride',.5,1,.72],['ride',1,1,.7],['ride',2,1,.4],['ride',2.5,1,.6],['ride',3.5,1,.5],['bell',1,.5,.4],['bell',3,.5,.4],
   ['rim',1,1,.55,0,0],['rim',2,1,.55,0,0],['rim',0,1,.55,0,1],['rim',1.5,1,.55,0,1],['rim',3,1,.55,0,1],
   ['kick',0,.6,.4],['kick',1.5,1,.7],['kick',3,1,.65]],
  fillOut:3,fill:[[3,'tom',.5,190],[3.25,'tom',.5,170],[3.5,'tom',.6,140],[3.75,'snare',.6]],crash:.5,
  bass:{kind:'upright',notes:[[1.5,1.4,.85,'5'],[3,.95,.9,'N']]},
  piano:{hits:[[.5,.3,.66],[1,.3,.6],[1.5,.3,.68],[2.5,.3,.66],[3,.3,.6],[3.5,.3,.7]],kind:'triad',timbre:'grand'}},
 afro:{ // Afro 12/8 ("Afro 12/8"): the measured 6/8 bell pattern on the ride bell, kick on the four main beats
  drums:[['bell',0,1,.58],['bell',.667,1,.82],['bell',1.333,1,.5],['bell',1.667,1,.73],['bell',2.333,1,.88],['bell',3,1,.87],['bell',3.667,1,.52],
   ['kick',0,1,.55],['kick',1,.9,.45],['kick',2,1,.5],['kick',3,.9,.45],['rim',1.333,.6,.4],['rim',3.333,.6,.4],['tom',2.667,.25,.4,170],['pedal',1,.8,.35],['pedal',3,.8,.35]],
  fillOut:2.6,fill:[[2.667,'tom',.45,190],[3,'tom',.5,170],[3.333,'tom',.55,140],[3.667,'snare',.6]],crash:.45,
  bass:{kind:'upright',notes:[[0,1.2,.92,'R'],[1.667,.3,.6,'5'],[2,1.2,.85,'R'],[3.333,.3,.6,'5'],[3.667,.3,.62,'A',.5]]},
  piano:{hits:[[0,.9,.72],[1.333,.3,.6,.7],[2,.6,.66],[3.333,.3,.6,.6]],kind:'jazz',timbre:'grand'}},
 secondline:{ // New Orleans second line ("Second Line"): measured kick (1, 3, 4 and the "and" of 2), snare-driven street beat, tuba-like bass
  drums:[['kick',0,1,.85],['kick',2,1,.78],['kick',3,.55,.8],['kick',1.5,.38,.3],
   ['snare',1,1,.6],['snare',2.5,1,.62],['snare',3,1,.68],['snare',.5,.4,.25,'ghost'],['snare',1.5,.5,.3,'ghost'],['snare',3.5,.6,.35,'ghost'],['ride',0,.75,.3],['ride',2,.85,.3]],
  fillOut:2.4,fill:[[2.5,'snare',.5],[3,'snare',.55],[3.5,'snare',.7],[3,'kick',.5]],crash:.55,
  bass:{kind:'upright',notes:[[0,.9,.92,'R'],[1.5,.45,.75,'5'],[2,.9,.88,'R'],[3,.45,.75,'5'],[3.5,.45,.7,'A']]},
  piano:{hits:[[1,.4,.7],[3,.4,.72],[2.5,.3,.55,.5]],kind:'seventh',timbre:'bright'}},
 boogaloo:{ // Boogaloo ("Blue Note"): measured ride (quarters and the "and" of 4) and kick (the "and" of 2 and beat 4), backbeat
  drums:[['ride',0,1,.73],['ride',1,1,.81],['ride',2,1,.62],['ride',3,1,.6],['ride',1.5,1,.26],['ride',3.5,.9,.66],
   ['snare',1,1,.55,'rock'],['snare',3,1,.58,'rock'],['snare',1.75,.25,.18,'ghost'],['snare',3.75,.2,.18,'ghost'],['snare',2.5,.12,.2,'ghost'],['kick',1.5,1,.85,'rock'],['kick',3,1,.8,'rock'],['kick',0,.75,.4,'rock'],['kick',1.75,.5,.5,'rock'],['kick',3.5,.6,.3,'rock'],['kick',2.5,.2,.35,'rock'],['ride',.5,.2,.3],['ride',2.5,.25,.3]],
  fillOut:3,fill:[[3,'snare',.5,'rock'],[3.5,'snare',.65,'rock'],[3.75,'tom',.55,140]],crash:.55,
  bass:{kind:'upright',notes:[[0,.45,.9,'R'],[.5,.25,.6,'R',.75],[1,.25,.5,'3',.2],[1.5,.4,.8,'5'],[2,.45,.85,'R'],[2.5,.25,.55,'R',.3],[3,.4,.75,'7'],[3.5,.4,.7,'A',.85]]},
  piano:{hits:[[0,.35,.7],[1.5,.3,.7],[2.5,.3,.62,.6],[3.5,.3,.72]],kind:'jazz',timbre:'grand'}},
 slowblues:{ // Slow blues in 12/8 ("Slo-Mo" blues): triplet pulse, kick on 1 and 3, backbeat, bass with pickups on the last triplet
  drums:[['ride',0,1,.42],['ride',.333,.85,.26],['ride',.667,1,.3],['ride',1,1,.42],['ride',1.333,.85,.26],['ride',1.667,1,.3],['ride',2,1,.42],['ride',2.333,.85,.26],['ride',2.667,1,.3],['ride',3,1,.42],['ride',3.333,.85,.26],['ride',3.667,1,.3],
   ['kick',0,1,.6,'rock'],['kick',2,1,.55,'rock'],['kick',2.667,.2,.35,'rock'],['kick',.667,.12,.3,'rock'],['snare',1,1,.62,'rock'],['snare',3,1,.65,'rock'],['snare',2.667,.2,.18,'ghost'],['snare',.667,.15,.16,'ghost'],['open',3.667,.12,.35],['pedal',1,1,.4],['pedal',3,1,.4]],
  fillOut:3,fill:[[3,'snare',.45,'rock'],[3.333,'snare',.5,'rock'],[3.667,'snare',.6,'rock']],crash:.5,
  bass:{kind:'finger',notes:[[0,1.6,.95,'R'],[1.333,.3,.6,'3',.25],[1.667,.3,.7,'5'],[2,1.6,.9,'R'],[3,.6,.75,'6',.2],[3.333,.3,.62,'5',.3],[3.667,.3,.7,'A']]},
  piano:{hits:[[0,.3,.55],[.333,.25,.3,.85],[.667,.25,.36,.9],[1,.3,.5],[1.333,.25,.3,.85],[1.667,.25,.36,.9],[2,.3,.55],[2.333,.25,.3,.85],[2.667,.25,.36,.9],[3,.3,.5],[3.333,.25,.3,.85],[3.667,.25,.36,.9]],kind:'seventh',timbre:'grand'}},
 partido:{ // Partido alto ("Partido Alto"): samba kick and bass, 8th hi-hat, cross-stick, piano on the partido syncopations
  drums:[['kick',.5,1,.45],['kick',1,1,.8],['kick',2.5,1,.45],['kick',3,1,.85],['kick',0,.3,.4],['kick',3.5,.3,.4],
   ['hat',0,1,.28],['hat',.5,1,.2],['hat',1,1,.28],['hat',1.5,1,.2],['hat',2,1,.28],['hat',2.5,1,.2],['hat',3,1,.28],['hat',3.5,1,.2],
   ['rim',1.5,.6,.5],['rim',2.5,.5,.45],['rim',.5,.4,.4]],
  fillOut:3,fill:[[3,'snare',.5,'funk'],[3.25,'snare',.45,'funk'],[3.5,'snare',.6,'funk'],[3.75,'snare',.65,'funk']],crash:.45,
  bass:{kind:'finger',notes:[[.5,.4,.72,'R'],[1,.9,.95,'R'],[2.5,.4,.72,'R'],[3,.9,.9,'5']]},
  piano:{hits:[[.5,.3,.7],[1,.4,.75],[1.5,.3,.62,.5],[2.5,.4,.7],[0,.3,.55,.2]],kind:'jazz',timbre:'grand'}},
 funk:{ // funk, after a "Funky" blues reference: kick on 1, the "and" of 1 and 3; 16th hi-hat that drops out under the backbeat; busy 16th bass riff
  drums:[['kick',0,1,.85,'funk'],['kick',.5,.9,.7,'funk'],['kick',2,1,.8,'funk'],['kick',2.75,.3,.5,'funk'],['kick',3.25,.25,.45,'funk'],
   ['snare',1,1,.85,'funk'],['snare',3,1,.88,'funk'],['snare',.75,.25,.18,'ghost'],['snare',1.75,.45,.2,'ghost'],['snare',2.25,.35,.18,'ghost'],['snare',3.75,.4,.2,'ghost'],
   ['hat',0,1,.42],['hat',.25,.9,.22],['hat',.5,1,.42],['hat',.75,.9,.22],['hat',1.25,.9,.22],['hat',1.5,1,.42],['hat',1.75,.9,.22],
   ['hat',2,1,.42],['hat',2.25,.9,.22],['hat',2.5,1,.42],['hat',2.75,.9,.22],['hat',3.25,.9,.28],['open',3.5,.85,.5]],
  fillOut:3,fill:[[3,'snare',.55,'funk'],[3.25,'snare',.6,'funk'],[3.5,'snare',.65,'funk'],[3.75,'snare',.72,'funk']],crash:.55,
  bass:{kind:'slap',notes:[[0,.4,.95,'R'],[.5,.25,.8,'R'],[1.25,.2,.7,'8'],[1.5,.2,.75,'R'],[1.75,.2,.7,'7'],[2,.4,.9,'R'],[2.5,.25,.8,'5'],[3,.4,.85,'R',.8],[3.5,.25,.7,'A',.4]]},
  piano:{hits:[[0,.4,.78],[2.5,.25,.7],[3.5,.25,.68]],kind:'jazz',timbre:'ep'},
  piano2:{hits:[[.25,.12,.42,.5],[.75,.12,.4,.5],[1.5,.15,.62,.8],[1.75,.12,.4,.5],[2.25,.12,.42,.5],[3,.15,.55,.7]],kind:'jazz',timbre:'ep'}},
 rock:{ // rock, after a "Texas Rock" blues reference: ride 8ths (strong/weak), kick 1 and 3 with a push on the "and" of 4, syncopated bass, guitar-like piano riff
  drums:[['ride',0,1,.6],['ride',.5,1,.34],['ride',1,1,.6],['ride',1.5,1,.34],['ride',2,1,.6],['ride',2.5,1,.34],['ride',3,1,.6],['ride',3.5,1,.34],
   ['kick',0,1,.92,'rock'],['kick',2,1,.86,'rock'],['kick',3.5,.5,.62,'rock'],['kick',1.5,.25,.55,'rock'],['kick',2.5,.2,.5,'rock'],
   ['snare',1,1,.9,'rock'],['snare',3,1,.92,'rock'],['snare',2.75,.12,.25,'ghost'],['snare',1.75,.12,.22,'ghost'],['kick',1.75,.2,.5,'rock'],['kick',3.75,.15,.45,'rock'],['bell',3.5,.12,.4]],
  fillOut:3,fill:[[3,'snare',.75,'rock'],[3.25,'snare',.6,'rock'],[3.5,'tom',.65,200],[3.75,'tom',.7,140]],crash:.7,
  bass:{kind:'pick',notes:[[0,.45,.95,'R'],[.5,.2,.6,'R',.4],[1,.2,.6,'R',.25],[1.5,.4,.8,'R'],[2,.45,.9,'R'],[2.5,.2,.6,'R',.4],[3,.45,.85,'5'],[3.5,.3,.7,'A',.4],[3.75,.2,.55,'8',.15]]},
  piano:{hits:[[0,1.8,.6],[1,.35,.75],[1.75,.2,.58],[2.5,.3,.66],[3,.3,.72],[3.5,.3,.62]],kind:'triad',timbre:'bright'}},
 pop:{ // pop : 8th hi-hat, kick on 1 and 3 with syncopations, backbeat, soul-style soft 8th piano pulses (as in a "Stax")
  drums:[['hat',0,1,.4],['hat',.5,.97,.26],['hat',1,1,.36],['hat',1.5,.97,.26],['hat',2,1,.4],['hat',2.5,.97,.26],['hat',3,1,.36],['hat',3.5,.7,.28],['open',3.5,.3,.42,0,1],
   ['kick',0,1,.8,'pop'],['kick',2,1,.75,'pop'],['kick',2.5,.45,.55,'pop'],['kick',1.5,.3,.45,'pop'],['kick',3.75,.2,.4,'pop'],
   ['snare',1,1,.72,'funk'],['snare',3,1,.74,'funk'],['snare',1.75,.2,.16,'ghost']],
  fillOut:3,fill:[[3,'snare',.5,'funk'],[3.5,'snare',.6,'funk'],[3.75,'tom',.55,140]],crash:.5,
  bass:{kind:'finger',notes:[[0,.9,.9,'R'],[1.5,.45,.7,'R'],[2,.7,.85,'R'],[2.75,.2,.55,'R',.5],[3,.45,.7,'5',.6],[3.5,.45,.7,'A',.6]]},
  piano:{hits:[[0,.45,.64],[.5,.4,.42],[1,.45,.52],[1.5,.4,.5],[2,.45,.6],[2.5,.4,.44],[3,.45,.52],[3.5,.4,.5]],kind:'triad',timbre:'soft'}},
 reggae:{ // one-drop reggae : kick and rim together on 3, 8th hi-hat with offbeat accents and triplet ornaments,
         // piano "skank" on the offbeats, organ "bubble" on the 16ths, heavy dub bass
  drums:[['kick',2,1,.9,'dub'],['rim',2,1,.75],['snare',2,.6,.3,'funk'],
   ['hat',0,1,.2],['hat',.5,1,.36],['hat',1,1,.22],['hat',1.5,1,.36],['hat',2,1,.2],['hat',2.5,1,.36],['hat',3,1,.22],['hat',3.5,1,.38],
   ['hat',3.667,.25,.2],['hat',1.667,.2,.18],['open',3.5,.25,.45,0,1],['rim',3.5,.2,.4]],
  fillOut:3,fill:[[3,'snare',.5,'funk'],[3.25,'snare',.5,'funk'],[3.5,'tom',.55,190],[3.75,'tom',.6,140]],crash:.45,
  bass:{kind:'dub',notes:[[0,.8,.92,'R'],[1,.4,.7,'5',.6],[1.5,.4,.75,'8',.5],[2,1.2,.95,'R'],[3.5,.4,.7,'A',.6]]},
  piano:{hits:[[.5,.18,.62],[1.5,.18,.66],[2.5,.18,.62],[3.5,.18,.66]],kind:'triad',timbre:'bright'},
  piano2:{hits:[[.25,.12,.32],[.75,.12,.36],[1.25,.12,.32],[1.75,.12,.36],[2.25,.12,.32],[2.75,.12,.36],[3.25,.12,.32],[3.75,.12,.36]],kind:'seventh',timbre:'organ'}}
};
const SWING_STYLES={swing:1,waltz:1,ballad:1,swing2:1};
const SWING_CURVE=[[60,.68],[80,.68],[120,.72],[140,.70],[160,.69],[180,.67],[200,.66],[240,.59],[300,.54]];   // measured on reference drum loops
function curveAt(pts,x){
 if(x<=pts[0][0])return pts[0][1];
 for(let k=1;k<pts.length;k++)if(x<=pts[k][0]){const [x0,y0]=pts[k-1],[x1,y1]=pts[k];return y0+(y1-y0)*(x-x0)/(x1-x0)}
 return pts[pts.length-1][1];
}
function swingRatio(style,bpm){
 if(style==='swing'||style==='waltz')return curveAt(SWING_CURVE,bpm);
 if(style==='ballad')return .68;
 if(style==='blues')return .67;                 // triplet shuffle
 if(style==='swing2')return curveAt(SWING_CURVE,bpm);
 if(style==='secondline')return .67;
 if(style==='reggae')return .53;
 return .5;
}
const BASS_KIND_FOR={pop:'finger',rock:'pick',funk:'slap',reggae:'dub',blues:'finger',samba:'finger',slowblues:'finger',partido:'finger',even16:'finger'};
function scheduleEnding(s,index,start,bpm,bus){
 // a "stop" ending: one hit on the downbeat after the last bar (the chord the tune comes back to), left to ring
 const mem=bus.mem||(bus.mem={}),style=s.style;
 const bar=s.bars[index];const c=(bar&&displayChords(bar,s).map(chordInfo).find(Boolean))||mem.lastChord;if(!c)return;
 curKit=KIT_FOR[style]||'kit_rusty';curTrim=STYLE_DRUM_TRIM[style]||1;curBassTrim=STYLE_BASS_TRIM[style]||1;curDyn=0;
 const soft=style==='ballad'||style==='bossa'||style==='samba'||style==='slowblues';
 const timbre=(STYLE_BANKS[style]||[])[0]==='ep'?'ep':style==='rock'?'bright':'grand';
 const notes=voicing(c,(style==='pop'||style==='rock')?'triad':'full',mem);
 notes.forEach((m,i)=>piano(m,start+i*.004,2.4,soft?.55:.72,bus,timbre));
 const bk=BASS_KIND_FOR[style]||'upright',lo=bk==='upright'?28:35;
 bass(lowest(c.bass,mem.bassLast??38,lo,lo+12),start,2.2,.9,bus,bk);
 kick(start,soft?.35:.75,bus,style==='ballad'||style==='bossa'?'jazz':'rock');
 crash(start,soft?.3:.6,bus);
}
// the drummer doesn't play a fill the same way every time: as written, only its end, filled in, or building up
function fillVariant(fill){
 const r=Math.random();
 if(r<.4)return fill;
 if(r<.65){const last=Math.max(...fill.map(f=>f[0]));const cut=fill.filter(f=>f[0]>=last-.75);return cut.length?cut:fill}
 if(r<.85){const out=fill.slice();for(const f of fill){const p=f[0]+.25;if(p<4&&!fill.some(g=>Math.abs(g[0]-p)<.1)&&(f[1]==='snare'||f[1]==='tom'))out.push([p,f[1],f[2]*.7,f[3]])}return out}
 const ps=fill.map(f=>f[0]),lo=Math.min(...ps),hi=Math.max(...ps);
 return fill.map(f=>[f[0],f[1],f[2]*(.8+.35*((f[0]-lo)/Math.max(hi-lo,.01))),f[3]]);
}
// how much a pianist holds the chord with the pedal, per style (1 = until the chord changes)
const PEDAL={ballad:1,waltz:.6,slowblues:.55};
// other comping figures a pianist moves between, per table style (each a list of [beat, length, velocity, chance])
const PIANO_ALTS={
 swing2:[[[0,.4,.66],[1.5,.3,.58]],[[1,.4,.58],[3,.4,.6]]],
 even8:[[[0,.45,.62],[1.5,.4,.56],[3,.4,.56]],[[.5,.4,.58],[2,.8,.62],[3.5,.4,.52]]],
 even16:[[[0,.3,.66],[.75,.2,.52],[2,.3,.62],[2.75,.2,.52],[3.5,.3,.56]],[[.5,.25,.6],[1.5,.25,.6],[2.25,.2,.52],[3,.4,.62]]],
 latin:[[[0,.3,.62],[.5,.3,.58],[1.5,.3,.66],[2,.3,.6],[3,.3,.6],[3.5,.3,.66]],[[.5,.3,.64],[1.5,.3,.66],[2.5,.3,.64],[3.5,.3,.68]]],
 afro:[[[0,.5,.66],[1.333,.3,.56],[2,.5,.62],[3.333,.3,.56]],[[.667,.3,.58],[1.667,.3,.56],[2.667,.3,.58],[3.667,.3,.6]]],
 secondline:[[[0,.4,.64],[1.5,.3,.56],[2,.4,.62],[3.5,.3,.56]],[[.5,.3,.6],[1,.4,.66],[2.5,.3,.58],[3,.4,.66]]],
 boogaloo:[[[0,.3,.64],[.5,.3,.56],[1.5,.3,.66],[2.5,.3,.62],[3,.3,.56]],[[.5,.3,.62],[1.5,.3,.66],[2,.3,.58],[3.5,.3,.68]]],
 slowblues:[[[0,.9,.6],[1,.9,.5],[2,.9,.58],[3,.9,.5]],[[0,.3,.56],[.667,.3,.46],[1.667,.3,.46],[2,.3,.56],[2.667,.3,.46],[3.667,.3,.5]]],
 partido:[[[.5,.2,.62],[1,.2,.56],[1.75,.2,.62],[2.5,.2,.6],[3.25,.2,.62]],[[0,.3,.6],[.75,.2,.55],[1.5,.3,.62],[2.75,.2,.56],[3.5,.3,.62]]],
 funk:[[[0,.2,.76],[.75,.15,.56],[1.5,.2,.66],[2.5,.15,.6],[3.25,.2,.64]],[[.5,.2,.7],[1.5,.2,.66],[2.25,.15,.56],[3.5,.25,.7]]],
 rock:[[[0,.35,.64],[.5,.3,.5],[1,.35,.6],[1.5,.3,.5],[2,.35,.64],[2.5,.3,.5],[3,.35,.6],[3.5,.3,.52]],[[0,1.8,.62],[2,1.4,.6],[3.5,.4,.62]]],
 pop:[[[0,.9,.6],[1,.9,.5],[2,.9,.58],[3,.9,.5]],[[0,.45,.62],[1.5,.45,.56],[2.5,.4,.52],[3.5,.4,.52]]],
 reggae:[[[.5,.12,.6],[.75,.1,.42],[1.5,.12,.64],[1.75,.1,.42],[2.5,.12,.6],[2.75,.1,.42],[3.5,.12,.64],[3.75,.1,.42]],[[.5,.18,.62],[1.5,.18,.66],[2.25,.12,.48],[2.5,.18,.62],[3.5,.18,.66]]]
};
// ---------- Latin percussion (Versilian Community Sample Library, CC0) ----------
const PERC_STYLES=new Set(['latin','boogaloo','bossa','samba','partido','afro']);
function percOn(s){const p=(s.instruments||{}).perc;return p==='on'||(p!=='off'&&PERC_STYLES.has(s.style))}
const PERC_PAN={conga:-.18,quinto:.12,bongo:.3,bongomute:.3,cowbell:.24,clave:-.1,guiro:-.3,shaker:.34,agogohi:-.26,agogolo:-.26};
const PERC_GAIN={conga:.45,quinto:.42,bongo:.4,bongomute:.35,cowbell:.3,clave:.35,guiro:.3,shaker:.22,agogohi:.3,agogolo:.32};
function percHit(key,vel,start,bus){
 const bk=banks.perc;if(samplesDisabled||!bk)return;
 const lay=vel<.45?'lo':vel<.7?'mid':'hi';
 const e=pickVar(bk,key+':'+lay)||pickVar(bk,key+':mid')||pickVar(bk,key+':lo')||pickVar(bk,key+':hi');if(!e)return;
 const src=audio.createBufferSource();src.buffer=bk.buf;src.playbackRate.value=1+(Math.random()*2-1)*.01;
 const g=audio.createGain();g.gain.value=Math.min(3,vel*(PERC_GAIN[key]||.3)*bk.gain/Math.max(e[2],.05))*Math.pow(10,(Math.random()*2-1)*.8/20);
 src.connect(g);
 if(audio.createStereoPanner){const pn=audio.createStereoPanner();pn.pan.value=PERC_PAN[key]||0;g.connect(pn);pn.connect(outNode(bus,'drums'))}else g.connect(outNode(bus,'drums'));
 src.start(start,e[0],e[1]);
}
// each figure: [position in the bar (0–1), piece, velocity]
const q=(b,k,v)=>[b/4,k,v],e12=(p,k,v)=>[p/12,k,v],run=(k,n,a,b)=>Array.from({length:n},(_,i)=>[i/n,k,i%2?b:a]);
const TUMBAO=[q(0,'conga',.45),q(1,'quinto',.62),q(1.5,'conga',.4),q(2,'conga',.45),q(3,'conga',.7),q(3.5,'conga',.75)];
const PERC_PAT={
 latin:TUMBAO,
 boogaloo:[...TUMBAO,q(0,'cowbell',.5),q(1,'cowbell',.4),q(2,'cowbell',.5),q(3,'cowbell',.4)],
 bossa:run('shaker',8,.3,.42),
 samba:[...run('shaker',16,.22,.3),q(0,'agogohi',.45),q(.75,'agogohi',.35),q(1.5,'agogolo',.45),q(2,'agogohi',.45),q(2.5,'agogohi',.35),q(3.25,'agogolo',.45)],
 partido:[...run('shaker',16,.18,.26),q(0,'agogolo',.4),q(1.5,'agogohi',.35),q(2.5,'agogohi',.35),q(3,'agogolo',.4)],
 afro:[...[0,2,4,5,7,9,11].map(p=>e12(p,'cowbell',p===0?.55:.42)),...Array.from({length:12},(_,p)=>e12(p,'shaker',p%3?.18:.28)),e12(6,'conga',.5),e12(9,'quinto',.55),e12(10,'conga',.5)],
 generic:[q(0,'shaker',.3),q(1,'shaker',.24),q(2,'shaker',.3),q(3,'shaker',.24)]
};
function percBar(s,index,start,bpm){
 if(!percOn(s)||!banks.perc)return;
 const {beats,scale}=beatsOf(s),bar=beats*60/bpm*scale,pat=PERC_PAT[s.style]||PERC_PAT.generic,bus=percBar.bus;
 for(const [f,k,v] of pat)percHit(k,Math.max(.05,v*(1+(Math.random()*2-1)*.12)),start+f*bar+(Math.random()*2-1)*.003,bus);
}
function scheduleBar(s,index,start,bpm,bus,nextIndex){
 percBar.bus=bus;percBar(s,index,start,bpm);
 {const slow=Math.min(1,Math.max(0,(80-bpm)/40));curLag=slow*.008;curJitK=1+slow*.4}
 const {beats,scale}=beatsOf(s),unit=60/bpm*scale,mem=bus.mem||(bus.mem={});
 const bar=s.bars[index];
 curKit=KIT_FOR[s.style]||'kit_rusty';curTrim=STYLE_DRUM_TRIM[s.style]||1;curBassTrim=STYLE_BASS_TRIM[s.style]||1;
 curKeys='';curBassPick='';   // each style plays its own instruments
 // bar-level dynamics: slow random walk plus a gentle 4-bar swell, and a slowly drifting feel for piano and bass
 mem.dw=(mem.dw||0)*.82+gauss()*.055;
 curDyn=clampN((mem.dw+.04*Math.sin((index%4)/4*Math.PI*2))*humanAmt/.7,-.28,.22);
 const feel=humanAmt/.7;
 let list=displayChords(bar,s).map(c=>c==='/'?'/':chordInfo(c));   // '/' (a pause slash) = the chord before keeps sounding
 if(!bar.chords.length&&mem.lastChord)list=[mem.lastChord];
 const n=Math.max(1,list.length);
 // chord segments on a half-beat grid
 const segs=[];
 for(let i=0;i<n;i++){
  let b0=i===0?0:Math.round(i*beats/n*2)/2;
  if(segs.length&&b0<=segs[segs.length-1].b0)continue;
  if(list[i]==='/'){if(!segs.length)segs.push({c:mem.lastChord||null,b0:0});continue}
  segs.push({c:list[i]||null,b0});
 }
 segs.forEach((g,i)=>{g.b1=i+1<segs.length?segs[i+1].b0:beats;g.v={}});
 const lastReal=[...list].reverse().find(c=>c&&c!=='/');if(lastReal)mem.lastChord=lastReal;
 const segAt=b=>segs.find(g=>b>=g.b0-1e-6&&b<g.b1-1e-6)||segs[segs.length-1];
 // song form, as a drummer plays it: an accent at the start of a section, a fill in its last bar
 const hasSections=s.bars.some(b=>b.section);
 const nb=s.bars[nextIndex];
 const secStart=hasSections?(!!bar.section||index===0):index%8===0;
 const secEnd=hasSections?((!!nb&&!!nb.section)||nextIndex!==index+1):index%8===7;
 // dynamics that follow the form: the bridge a little lighter, the last A a little stronger, a small build into each fill
 {
  let lab='';for(let k=index;k>=0;k--)if(s.bars[k].section){lab=s.bars[k].section;break}
  let fd=0;
  if(/^(B|C|bridge)/i.test(lab))fd=-.07;else if(/intro/i.test(lab))fd=-.1;
  else if(lab&&!s.bars.slice(index+1).some(b=>b.section===lab))fd=.05;
  if(secEnd)fd+=.04;
  curDyn=clampN(curDyn+fd*humanAmt/.55,-.3,.26);
 }
 const nextBar=s.bars[nextIndex];
 let nextPc=null;
 if(nextBar){const nc=displayChords(nextBar,s).map(chordInfo)[0];if(nc)nextPc=nc.bass}
 let style=s.style;
 const sw=swingRatio(style,bpm);
 const compound=scale===.5&&beats%3===0;
 let mode;
 let ps=1;
 if(compound&&beats===12&&(style==='afro'||style==='slowblues')){mode=style;ps=3}
 else if(compound)mode='compound';
 else if(beats===4&&scale===1)mode=style==='waltz'?'swing':style;
 else if(beats===3&&scale===1)mode=SWING_STYLES[style]?'waltz':'straight3';
 else mode='generic';
 const T=b=>start+b*unit;
 const P=p=>{const w=Math.floor(p+1e-6),f=p-w;return Math.abs(f-.5)<.01?w+sw:w+f}; // swung position
 const timeOf=p=>T(P(p));
 const vo=(seg,kind)=>seg.v[kind]||(seg.v[kind]=voicing(seg.c,kind,mem));
 const idx=index;
 const ph=humanAmt/.55;                                                  // 1 at the default setting
 const pv=(v,r)=>Math.max(.02,v*(1+gauss()*r*(.8+1.2*humanAmt)));        // piano touch: looser than the rest of the band
 const piano_=(seg,kind,p,len,vel,timbre,roll)=>{
  if(!seg||!seg.c)return;
  timbre=keysFor(timbre);
  // fast tempos: a pianist comps less and shorter; the first chord of each change is always played
  if(bpm>190){const keep=Math.max(.5,1-(bpm-190)/180);if(p>seg.b0+.01&&Math.random()>keep)return;len*=Math.max(.7,1-(bpm-190)/300)}
  {const pd=PEDAL[s.style];if(pd&&timbre!=='organ'&&timbre!=='ep'){const room=seg.b1-p-len;if(room>0)len+=room*pd}}   // pedal down until the chord changes
  if(p>seg.b0+.01&&seg.hit&&Math.random()<.1*ph)return;                  // a comping hit is sometimes left out, never the first one of a chord
  seg.hit=true;
  const notes=vo(seg,kind).slice(),n0=notes.length;
  const ti=toneInfo(seg.c),guide=new Set([ti.third===null?-1:(seg.c.root+ti.third)%12,ti.seventh!==null?(seg.c.root+ti.seventh)%12:ti.six?(seg.c.root+9)%12:-1]);
  const droppable=notes.map((m,i)=>i).filter(i=>i>0&&i<n0-1&&!guide.has(notes[i]%12));
  if(n0>=4&&droppable.length&&Math.random()<.16*ph)notes.splice(droppable[Math.floor(Math.random()*droppable.length)],1);   // sometimes an inner note is missing, never the 3rd or 7th that define the chord
  const n=notes.length;
  const touch=Math.random(),acc=touch<.13*ph?.66:touch>1-.12*ph?1.2:1;   // ghosted or accented hits
  const t0=timeOf(p)+gauss()*.003+.002+curLag;                                   // tight timing, the feel comes from the touch, not from rushing or dragging
  const spread=(roll||0)+rnd(.001,.004),up=Math.random()<.65;           // the notes of a chord land within about 3-12 ms of each other
  const hit=pv(vel*acc,.13),d=Math.max(.05,len*unit);                    // how hard this chord is played, shared by its notes
  // at slow tempos a chord can last longer than its recording: a pianist re-strikes it softly instead of letting it die away
  const maxS=timbre==='ep'?3.0:timbre==='vibes'?3.4:timbre==='organ'?1.3:1.8,strikes=d>maxS?Math.min(4,Math.ceil(d/maxS)):1;
  // the re-strikes land on a beat or half-beat inside the chord, like a player would place them
  const at=[p];for(let k=1;k<strikes;k++){const q=Math.round((p+k*len/strikes)*2)/2;if(q>at[at.length-1]+.4&&q<p+len-.4)at.push(q)}
  for(let k=0;k<at.length;k++){
   const tk=k?timeOf(at[k])+gauss()*.003+.002:t0,dk=Math.max(.05,((k+1<at.length?at[k+1]:p+len)-at[k])*unit),vk=k?(timbre==='organ'?.9:.7):1;
   // a re-strike is not the same chord again: just the top voice, a rolled chord going up, or two inner notes
   let idx=notes.map((_,i)=>i),sp=spread,upk=up;
   if(k>0){const r=Math.random();if(r<.35)idx=n>2?[n-2,n-1]:[n-1];else if(r<.7){sp=.06+Math.random()*.03;upk=true}else if(n>=4)idx=[1,n-2];}
   idx.forEach((i,o)=>{
    const m=notes[i];
    const w=(i===n-1?1.12:i===0?1:.86)*(1+gauss()*.04);                   // top voice sings, inner voices sit back
    const j=upk?o:idx.length-1-o;
    piano(m,tk+j*sp+jit(1.5),(at.length>1?dk:d*rnd(.75,1.08)),Math.max(.02,hit*w*vk),bus,timbre);
   });
  }
 };
 const BASS_MAX={upright:2.4,finger:2.2,pick:1.8,slap:.9,dub:2.4};
 const bass_=(m,p,len,vel,kind)=>{if(m==null)return;kind=bassFor(kind);
  const secs=len*unit,mx=BASS_MAX[kind]||2.2,parts=secs>mx?Math.min(4,Math.ceil(secs/mx)):1;   // at slow tempos a long note is re-plucked rather than left to run out
  const at=[p];for(let k=1;k<parts;k++){const q=Math.round(p+k*len/parts);if(q>at[at.length-1]+.5&&q<p+len-.5)at.push(q)}   // re-plucks on a beat
  for(let k=0;k<at.length;k++){const end=k+1<at.length?at[k+1]:p+len;
   let mk=m;if(k>0){const r=Math.random(),lo=28,hi=55;   // a bassist moves on a long note: to the fifth, the octave, or stays
    if(r<.5)mk=m+7<=hi?m+7:m-5;else if(r<.8)mk=m+12<=hi?m+12:m-12;if(mk<lo||mk>hi)mk=m}
   bass(mk,timeOf(at[k])+jit(4)-.002+curLag*.5,Math.max(.05,(end-at[k])*unit*(at.length>1?1:rnd(.92,1.04))),hv(vel*(k?.8:1),.1),bus,kind)}
 };
 const segLen=g=>g.b1-g.b0;
 const sameChord=(a,b)=>!!a&&!!b&&a.root===b.root&&a.bass===b.bass&&a.intervals.join()===b.intervals.join();
 // Comping for one chord: picks a rhythm cell that fits the chord's length, and always articulates a NEW chord
 // (on its first beat, or just ahead of it) instead of leaving it silent.
 const compSeg=(g,cells,timbre,kind='jazz')=>{
  const L=segLen(g),changed=!sameChord(mem.prevChord,g.c);
  const fits=cells.map(c=>c.filter(([p])=>p<L-.05)).filter(c=>c.length);
  let cell=Math.random()<.18?[[0,Math.min(.9,L),.75]]:(fits.length?fits[Math.floor(Math.random()*fits.length)]:[[0,Math.min(.9,L),.78]]);
  if(changed&&!cell.some(([p])=>p<.01)){
   const early=g.b0>=1&&Math.random()<.4;                                     // sometimes anticipate the new chord by an eighth
   cell=[[early?-.5:0,Math.min(.9,L),.78],...cell.filter(([p])=>p>=.45)];
  }
  for(const [p,l,v] of cell){const pp=g.b0+p;if(pp<g.b1-.05)piano_(g,kind,pp,Math.min(l,g.b1-pp),v,timbre)}
  mem.prevChord=g.c;
 };
 const nextPcFor=g=>{const i=segs.indexOf(g);return i+1<segs.length?(segs[i+1].c?segs[i+1].c.bass:g.c&&g.c.bass):nextPc};
 const fill=(beat,drumKind)=>{
  const t=b=>timeOf(b);
  snare(t(beat),.6,bus,drumKind);snare(t(beat+.25),.5,bus,drumKind);
  tom(t(beat+.5),.55,bus,190);tom(t(beat+.75),.6,bus,140);
 };
 const walking=(seg,b,kindB)=>{
  // one walking note on beat b
  const first=b-seg.b0<1-1e-6,isLast=b+1>=seg.b1-1e-6;
  const m=walkNote(seg,b,first,isLast&&!first,nextPcFor(seg),mem);
  if(isLast&&!first&&ps===1&&Math.random()<.12&&nextPcFor(seg)!=null){            // a triplet pickup into the next chord now and then
   bass_(m,b,.6,.8,kindB||'upright');
   const t2=lowest(nextPcFor(seg),m,28,48),m2=t2+(t2>=m?-1:1);
   bass_(m2,b+.667,.3,.62,kindB||'upright');mem.bassLast=m2;
  }else bass_(m,b,.92,b===0?.95:.8,kindB||'upright');
 };
 // ===== table-driven styles =====
 const bassDeg=(g,deg,kindB)=>{
  const t=toneInfo(g.c),ref=mem.bassLast??38,lo=kindB&&kindB!=='upright'?35:28;let m;   // electric basses: only the notes the library recorded (B1 and up)
  if(deg==='R')m=rootNote(g.c,mem,lo,lo+15);
  else if(deg==='5')m=fifthNote(g.c,mem,lo,lo+17);
  else if(deg==='8'){m=rootNote(g.c,mem,lo,lo+15);if(m+12<=58)m+=12}
  else if(deg==='3')m=lowest((g.c.root+(t.third??4))%12,ref,31,52);
  else if(deg==='6')m=lowest((g.c.root+9)%12,ref,31,52);
  else if(deg==='7')m=lowest((g.c.root+(t.seventh??10))%12,ref,31,52);
  else if(deg==='N'){const np=nextPcFor(g);m=lowest(np??g.c.bass,ref,lo,lo+17)}                 // anticipates the next chord (tumbao)
  else{const np=nextPcFor(g);if(np==null)m=fifthNote(g.c,mem,lo,lo+17);else{const tg=lowest(np,ref,lo+1,lo+19);m=tg+(Math.random()<.5?1:-1)}}   // 'A': chromatic approach
  mem.bassLast=m;return m;
 };
 const drumHit=(ins,t,v,arg)=>{
  if(ins==='ride')ride(t,v,bus,false);else if(ins==='bell')ride(t,v,bus,true);else if(ins==='hat')hat(t,v,bus,'closed');
  else if(ins==='pedal')hat(t,v,bus,'pedal');else if(ins==='open')hat(t,v,bus,'open');else if(ins==='kick')kick(t,v,bus,arg||'jazz');
  else if(ins==='snare')snare(t,v,bus,arg||'jazz');else if(ins==='rim')rim(t,v,bus);else if(ins==='tom')tom(t,v,bus,arg||170);else if(ins==='stir')kitHit('stir',v,t,bus,.6);
 };
 const runTable=sp=>{
  const X=p=>p*ps,TT=p=>timeOf(X(p));
  for(const [ins,p,pr,v,arg,par] of sp.drums){
   if(par!==undefined&&idx%2!==par)continue;
   if(Math.random()>=pr)continue;
   if(secEnd&&sp.fillOut!==undefined&&p>=sp.fillOut&&(ins==='ride'||ins==='hat'||ins==='bell'))continue;    // the time-keeping cymbal steps out for the fill
   drumHit(ins,TT(p)+jit(2),hv(v,.1),arg);
  }
  if(secStart&&sp.crash)crash(T(0)+jit(3),sp.crash,bus);
  if(secEnd&&sp.fill)for(const [p,ins,v,arg] of fillVariant(sp.fill))drumHit(ins,TT(p)+jit(3),hv(v,.1),arg);
  if(sp.bass){
   if(sp.bass.walk){for(let b=0;b<4;b++){const g=segAt(X(b));if(g.c)walking(g,X(b),sp.bass.kind)}}
   else for(const [p,len,v,deg,pr] of sp.bass.notes){
    if(pr!==undefined&&Math.random()>=pr)continue;
    const g=segAt(X(p));if(!g.c)continue;
    bass_(bassDeg(g,deg,sp.bass.kind),X(p),len*ps,v,sp.bass.kind);
   }
  }
  for(const P_ of [sp.piano,sp.piano2].filter(Boolean)){
   if(P_.cells&&ps===1){for(const g of segs){if(g.c)compSeg(g,P_.cells,P_.timbre,P_.kind)}}
   else{
    let fig=P_.hits||[[0,.9,.75]];
    if(P_===sp.piano&&PIANO_ALTS[mode]){
     if(index%2===0||mem.pianoFig===undefined){const r=Math.random(),alts=PIANO_ALTS[mode];mem.pianoFig=r<.5?-1:Math.floor((r-.5)/.5*alts.length)}
     if(mem.pianoFig>=0)fig=PIANO_ALTS[mode][Math.min(mem.pianoFig,PIANO_ALTS[mode].length-1)].map((h,k)=>k===0||h[3]!==undefined?h:[h[0],h[1],h[2],.8]);   // like the main figure, the hits after the first are sometimes left out
    }
    const hits=fig.filter(h=>h[3]===undefined||Math.random()<h[3]);
    for(const [p,l,v] of hits){const g=segAt(X(p));if(g.c)piano_(g,P_.kind,X(p),l*ps,v,P_.timbre)}
    segs.forEach((g,i)=>{if(i>0&&g.c&&!hits.some(h=>Math.abs(X(h[0])-g.b0)<.01))piano_(g,P_.kind,g.b0,.5*ps,.7,P_.timbre)});   // every chord change is played
   }
  }
 };
 // ===== per-style grooves =====
 if(PATTERN_STYLES[mode]){runTable(PATTERN_STYLES[mode]);return beats*unit}
 if(mode==='swing'){
  // ride pattern measured on recorded swing loops: the four quarter notes always (accents on 2 and 4), the swung "and" of 2
  // and of 4 in about 80% of bars, and an extra "and" of 1 or 3 in about 20%
  const skip=bpm>=200?.65:.8;
  let rides=[[0,.64],[1,.82],[2,.62],[3,.83]];
  if(Math.random()<skip)rides.push([1.5,.5]);
  if(Math.random()<skip)rides.push([3.5,.52]);
  if(Math.random()<.2)rides.push([.5,.5]);
  if(Math.random()<.2)rides.push([2.5,.5]);
  if(secEnd)rides=rides.filter(([p])=>p<3);                      // in a fill the ride steps out on beat 4
  for(const [p,v] of rides)ride(timeOf(p)+jit(4),hv(v*.95,.1),bus,false);
  if(secStart){crash(T(0)+jit(3),.5,bus);kick(T(0),.5,bus,'jazz')}  // new section: kick and cymbal on beat 1
  if(secEnd){                                                       // fill: kick and snare build up over beats 2-4
   const fills=[
    [[1.5,'s',.3],[2,'k',.38],[2.5,'s',.4],[3,'k',.45],[3,'s',.48],[3.5,'s',.6]],
    [[2,'s',.35],[2.5,'k',.4],[3,'t1',.5],[3.5,'t2',.58]],
    [[1.5,'k',.38],[2.5,'s',.45],[2.5,'k',.4],[3.5,'s',.62],[3.5,'k',.5]]];
   for(const [p,w,v] of fills[Math.floor(Math.random()*fills.length)]){
    const t=timeOf(p)+jit(3);
    if(w==='s')snare(t,hv(v,.1),bus,'jazz');else if(w==='k')kick(t,hv(v,.1),bus,'jazz');else tom(t,hv(v,.1),bus,w==='t1'?190:140);
   }
  }
  for(const b of [1,3])hat(T(b)+jit(3),.5,bus,'pedal');
  const feather=[.6,.75,.65,.8];                                   // measured: the feathered bass drum is there on 60-80% of beats
  for(let b=0;b<4;b++)if(Math.random()<feather[b])kick(T(b)+jit(3),hv(.2,.2),bus,'jazz');
  if(Math.random()<.4)snare(timeOf(rnd(0,1)<.5?1.5:3.5)+jit(5),hv(.3,.3),bus,'ghost');
  if(Math.random()<.3)kick(timeOf([.5,1.5,2.5,3.5][Math.floor(Math.random()*4)]),hv(.36,.15),bus,'jazz');   // an off-beat "bomb" in about a third of the bars
  for(let b=0;b<4;b++){const g=segAt(b);if(g.c)walking(g,b);}
  // piano comping: syncopated rhythm cells, new chord at each change
  const cells=[[[0,.9,.8],[1.5,.5,.7]],[[1.5,.5,.7],[3,.8,.75]],[[0,.5,.7],[2.5,.5,.7],[3.5,.4,.6]],[[1,.5,.65],[3.5,.5,.7]],[[0,.8,.8],[2.5,.6,.7]],[[0.5,.5,.65],[2,.9,.75]]];
  for(const g of segs){if(g.c)compSeg(g,cells,'grand','full')}
 }else if(mode==='bossa'){
  const clave=idx%2===0?[0,1.5,3]:[1,2];
  const HB=[.16,.11,.2,.13,.12,.15,.2,.12];   // accent shape measured on recorded bossa loops
  const onRide=hasSections&&/^(B|C|bridge)/i.test((()=>{for(let k=index;k>=0;k--)if(s.bars[k].section)return s.bars[k].section;return ''})());
  for(let i=0;i<8;i++){const p=i/2;if(onRide)ride(timeOf(p)+jit(3),hv(HB[i]*1.4,.12),bus,false);else hat(timeOf(p)+jit(3),hv(HB[i],.12),bus,'closed')}   // hi-hat in A, ride in the bridge
  for(const b of [1,3])hat(T(b),.45,bus,'pedal');
  if(Math.random()<.15)rim(T(2.5)+jit(3),hv(.4,.12),bus);if(Math.random()<.1)rim(T(.5)+jit(3),hv(.35,.12),bus);
  for(const p of clave)rim(T(p)+jit(3),hv(.65,.1),bus);
  for(const [p,v] of [[0,.5],[1.5,.35],[2,.42],[3.5,.35]])if(p===0||p===2||Math.random()<.9)kick(T(p)+jit(3),hv(v,.1),bus,'boss');
  if(Math.random()<.15)kick(T(2.5)+jit(3),hv(.3,.1),bus,'boss');
  if(secStart)crash(T(0)+jit(3),.3,bus);                                         // form: a light cymbal at a new section
  if(secEnd){snare(timeOf(3)+jit(3),.35,bus,'jazz');snare(timeOf(3.5)+jit(3),.45,bus,'jazz')}   // and a short pickup into it
  const br=Math.random();
  const bassPat=br<.55?[[0,1.8,.9,0],[2,1.8,.85,0]]:                           // bossa bass: root on 1 and 3
               br<.8?[[0,1.35,.9,0],[1.5,.45,.7,1],[2,1.35,.85,0],[3.5,.45,.65,1]]:   // the dotted root-fifth figure
               [[0,1.8,.9,0],[2,1.8,.85,1]];                                    // root and fifth in half notes
  if(Math.random()<.12)bassPat.push([3.5,.45,.65,1]);                           // occasional pickup on the "and" of 4
  if(Math.random()<.06)bassPat.push([1.5,.4,.65,1]);
  for(const [p,len,v,fifth] of bassPat){
   const g=segAt(p);if(!g.c)continue;
   bass_(fifth?fifthNote(g.c,mem):rootNote(g.c,mem,28,43),p,len,v,'upright');
  }
  const pats=[[[0,.9,.75],[1.5,.5,.65],[3,.9,.7]],[[1,.9,.7],[2,.9,.7],[3.5,.45,.6]],[[0,.5,.5],[1.5,.9,.72],[3.5,.5,.62]]];   // the third pattern: chords on the "and" of 2 and of 4, as in reference bossa
  const pat=pats[Math.random()<.35?2:idx%2];
  for(const [p,l,v] of pat){const g=segAt(p);piano_(g,'jazz',p,l,v,'grand')}
  // chord changes mid-bar get their own hit
  segs.forEach((g,i)=>{if(i>0&&g.c&&!pat.some(x=>Math.abs(x[0]-g.b0)<.01))piano_(g,'jazz',g.b0,.9,.7,'grand')});
 }else if(mode==='ballad'){
  // ballad brushes as in reference ballad loops: a continuous stir on the snare, light taps on 2 and 4, a soft ride
  for(const p of (bpm<48?[0,1,2,3]:[0,2]))kitHit('stir',hv(.08,.12),T(p)+jit(3),bus,.3);   // the brush circle: a quiet bed, not a wash   // the stir recording lasts 2.6 s: below 48 bpm it is renewed every beat
  if(bpm<70){   // slow ballads: the drummer fills the space with ghost taps and the hi-hat foot
   for(const p of [.5,1.5,2.5,3.5])if(Math.random()<.35)snare(timeOf(p)+jit(5),hv(.08,.25),bus,'brush');
   for(const p of [1,3])kitHit('pedal',hv(.22,.15),T(p)+jit(4),bus,.5);
  }
  for(const p of [0,1,2,3])ride(timeOf(p)+jit(5),hv(p%2?.26:.2,.15),bus,false);
  for(const p of [1.5,3.5])ride(timeOf(p)+jit(5),hv(.13,.2),bus,false);
  kick(T(0)+jit(4),.28,bus,'jazz');if(Math.random()<.5)kick(T(2.5)+jit(4),.18,bus,'jazz');if(Math.random()<.15)kick(timeOf(1.5)+jit(4),.16,bus,'jazz');
  for(const b of [1,3])snare(T(b)+jit(4),hv(.4,.15),bus,'brush');
  if(Math.random()<.25)snare(timeOf(3.5)+jit(4),hv(.28,.15),bus,'brush');
  for(const b of [1,3])if(Math.random()<.7)hat(T(b)+jit(3),.3,bus,'pedal');
  if(secStart)crash(T(0)+jit(3),.25,bus);
  if(secEnd){snare(timeOf(3)+jit(3),.35,bus,'brush');snare(timeOf(3.5)+jit(3),.45,bus,'brush')}
  for(const g of segs){
   if(!g.c)continue;
   const L=segLen(g),r=Math.random();
   if(L>=4&&r<.2)bass_(rootNote(g.c,mem),g.b0,L*.97,.85,'upright');                         // a whole note
   else if(L>=4&&r<.45){bass_(rootNote(g.c,mem),g.b0,1.9,.85,'upright');bass_(fifthNote(g.c,mem),g.b0+2,.95,.68,'upright');   // two-feel with a walk-up
    if(nextPc!=null){const m=lowest(nextPc,mem.bassLast??36,28,45);bass_(m+(Math.random()<.5?1:-1),g.b0+3,.9,.58,'upright')}}
   else if(L>=4&&r<.6){bass_(rootNote(g.c,mem),g.b0,1.4,.85,'upright');bass_(fifthNote(g.c,mem),g.b0+1.5,.45,.6,'upright');bass_(rootNote(g.c,mem),g.b0+2,1.9,.78,'upright')}   // dotted figure
   else{
    bass_(rootNote(g.c,mem),g.b0,Math.min(L,2)*.97,.85,'upright');
    if(L>=3)bass_(fifthNote(g.c,mem),g.b0+2,Math.min(L-2,2)*.9,.7,'upright');
    else if(L>=2&&g.b1>=4&&nextPc!=null&&Math.random()<.6){const m=lowest(nextPc,mem.bassLast??36,28,45);bass_(m+(Math.random()<.5?1:-1),g.b1-1,.9,.55,'upright')}
   }
   const pr=Math.random();
   piano_(g,'full',g.b0,L*.98,.7,'soft',.001);
   if(L>=3){
    if(pr<.45)piano_(g,'full',g.b0+2,L-2,.5,'soft',.001);                                     // re-strike on 3
    else if(pr<.7){piano_(g,'full',g.b0+1.5,.5,.42,'soft',.001);piano_(g,'full',g.b0+3,.9,.45,'soft',.001)}   // soft answers on the "and" of 2 and on 4
    else if(pr<.85)piano_(g,'full',g.b0+3.5,.45,.45,'soft',.001);                             // a pickup into the next chord
   }
  }
 }else if(mode==='pop'){
  for(let i=0;i<8;i++){const p=i/2;hat(T(p)+jit(3),hv(i%2?.22:i%4===0?.42:.3,.1),bus,'closed')}
  if(idx%4===3)hat(T(3.5),.5,bus,'open');
  kick(T(0),.8,bus,'pop');kick(T(2),.72,bus,'pop');
  if(idx%2)kick(T(2.5),.55,bus,'pop');else kick(T(1.5),.4,bus,'pop');
  snare(T(1),hv(.7,.08),bus,'funk');snare(T(3),hv(.72,.08),bus,'funk');
  if(secEnd)fill(3,'funk');
  if(secStart)crash(T(0),.5,bus);
  for(const [p,len,v,k] of [[0,.75,.9,0],[1.5,.45,.7,0],[2,.7,.85,0],[2.75,.22,.5,0],[3.5,.45,.7,2]]){
   const g=segAt(p);if(!g.c)continue;
   const m=k===2?(g.b1<=3.6&&nextPc!=null?lowest(nextPc,mem.bassLast??36,28,45):fifthNote(g.c,mem)):rootNote(g.c,mem);
   bass_(m,p,len,v,'finger');
  }
  const seq=[[0,1,2,3,2,1,2,3],[0,2,1,3,1,2,1,3],[0,1,2,1,3,2,1,2]][Math.floor(Math.random()*3)];
  for(let i=0;i<8;i++){
   const g=segAt(i/2);if(!g.c)continue;
   if(i>0&&Math.random()<.07*ph)continue;                                // an arpeggio note is sometimes dropped
   const v=vo(g,'triad');
   const tones=v.slice();while(tones.length<4)tones.push(tones[tones.length-v.length]+12);   // two-note chords (5, 11) are extended by octaves
   const m=tones[seq[i]];
   piano(m,timeOf(i/2)+gauss()*.003+.002,unit*rnd(.65,1),pv((i%2?.5:.72)*(i===0?1.1:1),.14),bus,'soft');
  }
 }else if(mode==='rock'){
  for(let i=0;i<8;i++)hat(T(i/2)+jit(2),hv(i%2?.3:.46,.08),bus,'closed');
  if(secStart)crash(T(0),.7,bus);
  kick(T(0),.95,bus,'rock');kick(T(2),.88,bus,'rock');
  if(idx%2===0)kick(T(2.5),.7,bus,'rock');else{kick(T(1.5),.65,bus,'rock');kick(T(3.5),.5,bus,'rock')}
  snare(T(1),hv(.9,.05),bus,'rock');snare(T(3),hv(.92,.05),bus,'rock');
  if(secEnd){snare(T(3),.85,bus,'rock');snare(T(3.25),.6,bus,'rock');snare(T(3.5),.7,bus,'rock');tom(T(3.5),.6,bus,200);tom(T(3.75),.65,bus,140)}
  for(let i=0;i<8;i++){
   const g=segAt(i/2);if(!g.c)continue;
   const v=[.95,.62,.72,.62,.9,.62,.72,.66][i];
   bass_(rootNote(g.c,mem,28,43),i/2,.46,v,'pick');
  }
  for(let i=0;i<8;i++){
   const g=segAt(i/2);if(!g.c)continue;
   piano_(g,'triad',i/2,.42,[.88,.55,.7,.55,.82,.55,.7,.6][i],'bright');
  }
 }else if(mode==='funk'){
  const A=idx%2===0;
  for(let i=0;i<16;i++){
   const p=i/4,acc=i%4===0?.5:i%2===0?.34:.2;
   if(i===14){hat(T(p),.45,bus,'open');continue}
   hat(T(p)+jit(2),hv(acc,.12),bus,'closed');
  }
  for(const st of (A?[0,6,10]:[0,3,10,13]))kick(T(st/4)+jit(2),hv(.88,.05),bus,'funk');
  snare(T(1),.88,bus,'funk');snare(T(3),.9,bus,'funk');
  for(const st of [7,9,15])if(Math.random()<.7)snare(T(st/4),hv(.22,.3),bus,'ghost');
  if(secEnd){for(let i=0;i<4;i++)snare(T(3+i/4),.55+.07*i,bus,'funk')}
  if(secStart)crash(T(0),.55,bus);
  const riff=[[0,2.5,1,0],[3,.8,.5,0],[5,.8,.55,0],[6,1.2,.8,12],[8,2,.95,0],[10,1,.75,7],[12,1,.7,10],[14,.8,.6,0]];
  for(const [st,len,v,iv] of riff){
   const g=segAt(st/4);if(!g.c)continue;
   let m=rootNote(g.c,mem,28,40);
   if(iv===12)m+=12;else if(iv===7)m=fifthNote(g.c,mem,28,45);else if(iv===10)m+=toneInfo(g.c).seventh??10;
   if(st===14&&g.b1>=4&&nextPc!=null)m=lowest(nextPc,m,28,45);
   bass_(m,st/4,len/4,v,'slap');
  }
  for(const [st,v] of [[2,.72],[3,.45],[6,.8],[10,.72],[11,.45],[14,.78]]){
   const g=segAt(st/4);if(!g.c)continue;
   const t=toneInfo(g.c),k=(t.seventh!==null||t.six)?'jazz':'triad';
   piano_(g,k,st/4,.2,v,'ep');
  }
 }else if(mode==='blues'){
  // Chicago-style shuffle, after a Blues reference: kick on all four beats, backbeat on 2 and 4, triplet hi-hat, boogie bass
  const rideBar=hasSections&&/^(B|C|bridge)/i.test((()=>{for(let k=index;k>=0;k--)if(s.bars[k].section)return s.bars[k].section;return ''})());
  const rockKick=Math.random()<.2;                                    // some bars drop the kick on 2 and 4
  for(let b=0;b<4;b++){
   if(!(rockKick&&b%2))kick(T(b)+jit(2),hv(b%2?.62:.72,.1),bus,'rock');
   if(rideBar){ride(timeOf(b)+jit(2),hv(.5,.1),bus,false);ride(timeOf(b+.5)+jit(2),hv(.28,.12),bus,false)}
   else{hat(timeOf(b)+jit(2),hv(.4,.1),bus,'closed');if(!(b===3&&Math.random()<.2))hat(timeOf(b+.5)+jit(2),hv(.22,.12),bus,'closed');else hat(timeOf(b+.5),.42,bus,'open')}
  }
  snare(T(1)+jit(2),hv(.78,.06),bus,'rock');snare(T(3)+jit(2),hv(.8,.06),bus,'rock');
  for(const p of [.5,2.5])if(Math.random()<.22)snare(timeOf(p)+jit(2),hv(.2,.2),bus,'ghost');
  if(Math.random()<.15)kick(timeOf(3.5)+jit(2),hv(.45,.1),bus,'rock');if(Math.random()<.15)snare(timeOf(1.5)+jit(2),hv(.18,.2),bus,'ghost');if(Math.random()<.1)crash(T(0)+jit(3),.3,bus);
  if(secStart)crash(T(0),.6,bus);
  if(secEnd){snare(timeOf(2.5),.55,bus,'rock');snare(timeOf(3.5),.7,bus,'rock');tom(timeOf(3.5),.55,bus,170)}
  const upBar=idx%2===0;
  for(let b=0;b<4;b++){                                   // boogie: R-3-5-6, then b7-6-5-3, each note on the beat and on the shuffled "and"
   const g=segAt(b);if(!g.c)continue;
   const t=toneInfo(g.c),third=t.third??4,degs=upBar?[0,third,7,9]:[10,9,7,third];
   const m=lowest((g.c.root+degs[b])%12,mem.bassLast??40,35,52);mem.bassLast=m;
   if(mem.bluesWalk===undefined||b===0)mem.bluesWalk=b===0?Math.random()<.25:mem.bluesWalk;   // some bars walk in quarter notes instead of the boogie
   if(mem.bluesWalk)bass_(m,b,.9,.86,'finger');else{bass_(m,b,.55,.88,'finger');bass_(m,b+.5,.3,.7,'finger')}
  }
  const bp=[[[.5,.25,.5],[1,.45,.72],[2.5,.25,.5],[3,.45,.74]],[[0,.4,.7],[1.5,.25,.55],[2,.4,.66],[3.5,.25,.55]],[[1,.4,.72],[3,.4,.74]]][Math.random()<.6?0:Math.random()<.6?1:2];
  for(const [p,l,v] of bp){const g=segAt(p);if(g.c)piano_(g,'seventh',p,l,v,'grand')}
  segs.forEach((g,i)=>{if(i>0&&g.c&&!bp.some(x=>Math.abs(x[0]-g.b0)<.01))piano_(g,'seventh',g.b0,.4,.7,'grand')});
 }else if(mode==='samba'){
  // samba with brushes, after a Samba Brush reference: surdo-like kick and bass ("da-DUM" into beats 2 and 4), brushed 8ths, cross-stick
  for(const [p,v] of [[.5,.45],[1,.8],[2.5,.45],[3,.85]])kick(T(p)+jit(2),hv(v,.08),bus,'jazz');
  for(let i=0;i<8;i++)snare(T(i/2)+jit(2),hv(i%2?.22:.3,.15),bus,'brush');
  for(const [p,pr] of [[.5,.5],[1.5,.4],[2,.4],[2.5,.4],[3,.5]])if(Math.random()<pr)rim(T(p)+jit(2),hv(.5,.12),bus);
  if(secStart)crash(T(0),.4,bus);
  if(secEnd)for(let i=0;i<4;i++)snare(T(3+i/4)+jit(2),hv(.3+.08*i,.08),bus,'brush');
  for(const [p,len,v,k] of [[.5,.4,.72,0],[1,.9,.95,0],[2.5,.4,.72,0],[3,.9,.9,1]]){
   const g=segAt(p);if(!g.c)continue;
   bass_(k?fifthNote(g.c,mem,35,52):rootNote(g.c,mem,35,50),p,len,v,'finger');
  }
  const sp=[[1,.8,.75]];if(Math.random()<.4)sp.push([2.5,.4,.6]);if(Math.random()<.25)sp.push([.5,.4,.55]);
  for(const [p,l,v] of sp){const g=segAt(p);piano_(g,'jazz',p,l,v,'grand')}
  segs.forEach((g,i)=>{if(i>0&&g.c&&!sp.some(x=>Math.abs(x[0]-g.b0)<.01))piano_(g,'jazz',g.b0,.6,.7,'grand')});
 }else if(mode==='reggae'){
  for(let i=0;i<8;i++){const p=i/2;hat(timeOf(p)+jit(3),hv(i%2?.36:.2,.12),bus,'closed')}
  if(idx%4===3)hat(timeOf(3.5),.5,bus,'open');
  kick(T(2)+jit(2),.9,bus,'dub');rim(T(2)+jit(2),.75,bus);snare(T(2),.35,bus,'funk');
  if(secStart)crash(T(0)+jit(3),.45,bus);
  if(secEnd){snare(T(3),.5,bus,'funk');snare(T(3.25),.5,bus,'funk');tom(T(3.5),.55,bus,190);tom(T(3.75),.6,bus,140)}
  const pat=idx%2===0?[[0,.8,.85],[2,1.4,.95],[3.5,.45,.7]]:[[0,.7,.8],[1.5,.4,.65],[2,1.3,.95],[3.25,.4,.7]];
  for(const [p,len,v] of pat){
   const g=segAt(p);if(!g.c)continue;
   let m=rootNote(g.c,mem,28,41);
   if(p===3.5||p===3.25)m=(g.b1>=4&&nextPc!=null&&Math.random()<.5)?lowest(nextPc,mem.bassLast??36,28,43):fifthNote(g.c,mem,28,43);
   bass_(m,p,len,v,'dub');
  }
  for(const p of [.5,1.5,2.5,3.5]){const g=segAt(p);piano_(g,'seventh',p,.22,.62,'organ')}
 }else if(mode==='waltz'){
  const jazzy=style==='waltz'||style==='swing'||style==='bossa'||style==='ballad';
  // ride pattern measured on reference 3/4 swing loops: three strong quarter notes, the swung "and" of 2 almost always, an extra "and" of 1 or 3 in ~30%
  const wr=[[0,.76],[1,.82],[2,.78]];
  if(Math.random()<.95)wr.push([1.5,.58]);
  if(Math.random()<.33)wr.push([.5,.52]);
  if(Math.random()<.3)wr.push([2.5,.6]);
  for(const [p,v] of (secEnd?wr.filter(([p])=>p<2):wr))ride(timeOf(p)+jit(4),hv(v*.92,.1),bus,false);
  if(secStart){crash(T(0)+jit(3),.45,bus);kick(T(0),.45,bus,'jazz')}
  if(secEnd)for(const [p,w,v] of [[1.5,'s',.35],[2,'k',.42],[2.5,'s',.55]]){const t=timeOf(p)+jit(3);if(w==='s')snare(t,hv(v,.1),bus,'jazz');else kick(t,hv(v,.1),bus,'jazz')}
  for(const b of [1,2])hat(T(b),.4,bus,'pedal');
  for(const [b,pr] of [[0,.7],[1,.7],[2,.62]])if(Math.random()<pr)kick(T(b)+jit(3),hv(.2,.2),bus,'jazz');   // feathered, as measured in 3/4
  if(Math.random()<.3)snare(timeOf(1.5)+jit(5),.28,bus,'ghost');
  for(let b=0;b<3;b++){const g=segAt(b);if(g.c)walking(g,b)}
  const cells=[[[1,.7,.8],[2,.6,.7]],[[0,.8,.75],[1.5,.6,.65]],[[1,.7,.78],[2.5,.4,.6]],[[0,.5,.7],[2,.9,.72]]];
  for(const g of segs){if(g.c)compSeg(g,cells,'grand','full')}
 }else if(mode==='straight3'){
  const timb={pop:'soft',rock:'bright',funk:'ep',reggae:'organ'}[style]||'grand',bk={pop:'finger',rock:'pick',funk:'slap',reggae:'dub'}[style]||'finger';
  for(let i=0;i<6;i++)hat(T(i/2),hv(i%2?.22:.38,.1),bus,'closed');
  kick(T(0),.8,bus,'rock');snare(T(1),.65,bus,'funk');snare(T(2),.6,bus,'funk');
  for(const g of segs){
   if(!g.c)continue;
   bass_(rootNote(g.c,mem),g.b0,1.4,.9,bk);
   if(segLen(g)>=2)bass_(fifthNote(g.c,mem),g.b0+1.5,1,.7,bk);
   for(let b=Math.ceil(g.b0);b<g.b1;b++)piano_(g,'triad',b,.7,b===0?.78:.6,timb);
  }
 }else if(mode==='compound'){
  const groups=beats/3;
  for(let i=0;i<beats;i++)hat(T(i)+jit(2),hv(i%3===0?.4:.22,.1),bus,'closed');
  for(let g=0;g<groups;g++){
   const b=g*3;
   if(g%2===0)kick(T(b),.8,bus,'pop');else snare(T(b),.7,bus,'funk');
  }
  for(let g=0;g<groups;g++){
   const b=g*3,sg=segAt(b);if(!sg.c)continue;
   bass_(rootNote(sg.c,mem),b,2.6,.85,'finger');
  }
  for(let i=0;i<beats;i++){
   const sg=segAt(i);if(!sg.c)continue;
   const v=vo(sg,'triad'),tones=v.slice();while(tones.length<3)tones.push(tones[tones.length-v.length]+12);
   piano(tones[i%3],T(i)+jit(6),unit*1.6,hv(i%3===0?.65:.45,.1),bus,'soft');
  }
 }else{ // generic fallback for other meters
  for(let i=0;i<beats;i++)hat(T(i)+jit(2),hv(i===0?.4:.25,.1),bus,'closed');
  kick(T(0),.8,bus,'rock');
  for(let i=1;i<beats;i++){if(i%2===1)snare(T(i),.6,bus,'funk');else if(i>=2)kick(T(i),.55,bus,'rock')}
  for(const g of segs){
   if(!g.c)continue;
   for(let b=g.b0;b<g.b1;b+=2)bass_(rootNote(g.c,mem),b,Math.min(2,g.b1-b)*.9,.85,'finger');
   piano_(g,'triad',g.b0,Math.max(.5,segLen(g)*.9),.7,'soft');
  }
 }
 return beats*unit;
}
/*ENGINE-END*/
function clearPlaying(){document.querySelectorAll('#repChart .rep-bar.playing').forEach(el=>el.classList.remove('playing'))}
function stop(){
 if(!playback)return;
 clearInterval(playback.timer);
 for(const t of playback.highlights)clearTimeout(t);
 try{playback.bus.disconnect();playback.bus.limiter&&playback.bus.limiter.disconnect()}catch(e){}
 playback=null;clearPlaying();$('repPlay').textContent='▶ Play';$('repPlayingStatus').textContent='Ready to play';
}
// the chart follows the music: when the playing measure nears the bottom (or hides under the timer bar),
// the page glides so its line sits in the upper third; it waits while you are scrolling yourself
let userScrollAt=0;
for(const ev of ['wheel','touchmove'])addEventListener(ev,()=>{userScrollAt=Date.now()},{passive:true});
function followBar(el){
 if(Date.now()-userScrollAt<3000)return;
 const r=el.getBoundingClientRect(),vh=innerHeight;
 let topSafe=12;for(const b of document.querySelectorAll('.alt-timerbar,.alt-fbbar.show'))topSafe=Math.max(topSafe,b.getBoundingClientRect().bottom+12);   // under the timer and the Fake Book bar
 if(r.top>=topSafe&&r.bottom<=vh*.72)return;
 const target=Math.max(0,scrollY+r.top-topSafe-Math.min(vh*.16,110));   // the playing line just under the timer bar, with some room
 scrollTo({top:target,behavior:'smooth'});
}
function highlightBar(i,when,chorus){
 if(!playback)return;
 const state=playback;
 const delay=Math.max(0,(when-audio.currentTime)*1000);
 const timer=setTimeout(()=>{
  if(playback!==state)return;
  clearPlaying();const el=$('repChart').querySelector('[data-bar="'+i+'"]');
  if(el){el.classList.add('playing');followBar(el)}
  $('repPlayingStatus').textContent='Measure '+(i+1)+' of '+current().bars.length+' · Chorus '+((chorus??state.chorus)+1);   // the chorus this measure belongs to, not the one being scheduled ahead
 },delay);
 state.highlights.push(timer);
}
// The order in which the bars of a whole chart are played: repeats, 1st/2nd endings, D.C. / D.S., al Fine, al Coda.
function playOrder(bars){
 const n=bars.length,out=[];if(!n)return out;
 const note=i=>String((bars[i].jump?JUMPS[bars[i].jump]+' ':'')+(bars[i].note||''));
 // which ending block each bar belongs to (0 = none)
 const blk=new Array(n).fill(0);let cur=0;
 for(let k=0;k<n;k++){const b=bars[k];if(b.ending)cur=Number(b.ending)||0;else if(b.section||b.repeatStart)cur=0;blk[k]=cur;if(b.repeatEnd)cur=0}
 const gmax=new Array(n).fill(0);for(let k=0;k<n;){if(!blk[k]){k++;continue}let e=k;while(e<n&&blk[e])e++;const m=Math.max(...blk.slice(k,e));for(let q=k;q<e;q++)gmax[q]=m;k=e}
 const segno=bars.findIndex(b=>b.segno),codas=bars.map((b,i)=>b.coda?i:-1).filter(i=>i>=0);
 const fineAt=bars.findIndex((b,i)=>b.jump==='fine'||(/\bfine\b/i.test(note(i))&&!/al\s*fine/i.test(note(i))));
 let i=0,pass=1,repFrom=0,jumped=false,mode=null,guard=0;const done=new Map();
 while(i<n&&guard++<n*16){
  const b=bars[i];
  if(b.repeatStart&&!jumped&&repFrom!==i){repFrom=i;pass=1}
  if(blk[i]){const want=jumped?gmax[i]:pass;if(blk[i]!==want){i++;continue}}
  out.push(i);
  if(jumped&&mode==='fine'&&i===fineAt)break;
  if(jumped&&mode==='coda'&&codas.length>1&&i===codas[0]){i=codas[codas.length-1];mode=null;continue}
  if((b.repeatEnd||/repeat end/i.test(note(i)))&&!jumped){   // older imports only kept a 'Repeat end' note
   const times=Math.max(2,b.times||Number((/(\d+)\s*x\b/i.exec(note(i))||[])[1])||2);   // "3x" plays the repeated part three times
   const c=done.get(i)||0;if(c<times-1){done.set(i,c+1);pass++;i=repFrom;continue}
  }
  const t=note(i);
  if(!jumped&&/d\.?\s*c\./i.test(t)){jumped=true;mode=/fine/i.test(t)?'fine':/coda/i.test(t)?'coda':null;i=0;continue}
  if(!jumped&&/d\.?\s*s\./i.test(t)){jumped=true;mode=/fine/i.test(t)?'fine':/coda/i.test(t)?'coda':null;i=segno>=0?segno:0;continue}
  i++;
 }
 return out.length?out:bars.map((_,k)=>k);
}
function play(){
 if(playback){
  const state=playback;
  if(state.paused){audio.resume().then(()=>{if(playback===state){state.paused=false;$('repPlay').textContent='Ⅱ Pause';$('repPlayingStatus').textContent='Playing…'}}).catch(()=>stop());}
  else{state.paused=true;audio.suspend().then(()=>{if(playback===state){$('repPlay').textContent='▶ Resume';$('repPlayingStatus').textContent='Paused'}}).catch(()=>stop());}
  return;
 }
 const s=current();if(!s)return;
 try{getAudio()}catch(e){notice('This browser does not support audio playback.',true);return}
 if(!samplesDisabled&&!banksReady(s.style)){
  if(loadingSounds)return;
  loadingSounds=true;$('repPlayingStatus').textContent='Loading sounds…';
  const names=songBanks(s);let done=names.filter(n=>banks[n]).length;
  $('repPlayingStatus').textContent='Loading sounds… '+done+'/'+names.length;
  Promise.all(names.map(n=>loadBank(n).then(b=>{done++;if(loadingSounds)$('repPlayingStatus').textContent='Loading sounds… '+Math.min(done,names.length)+'/'+names.length;return b}))).catch(()=>{samplesDisabled=true;notice('Could not load the instrument sounds, so the built-in synthesizer is being used. (Sounds load when the app is opened from GitHub Pages or a web server, not from a local file.)',true)})
   .then(()=>{loadingSounds=false;if(!playback)play()});
  return;
 }
 const bus=audio.createGain();bus.gain.value=Number($('repVolume').value)/100*.46*(STYLE_MASTER[s.style]||1);
 const limiter=audio.createWaveShaper(),curve=new Float32Array(2048);
 for(let i=0;i<2048;i++){const x=i/1023.5-1;curve[i]=Math.tanh(1.3*x)/Math.tanh(1.3)}
 limiter.curve=curve;limiter.oversample='2x';
 const glue=audio.createDynamicsCompressor();glue.threshold.value=-20;glue.knee.value=12;glue.ratio.value=2.2;glue.attack.value=.012;glue.release.value=.22;   // gentle glue on the whole band
 const makeup=audio.createGain();makeup.gain.value=1.12;bus.connect(glue);glue.connect(makeup);makeup.connect(limiter);limiter.connect(audio.destination);bus.limiter=limiter;bus.mem={};
 const reverb=makeReverb(),wet=audio.createGain();wet.gain.value=1;reverb.connect(wet);wet.connect(bus);
 buildMixer(bus,reverb,{piano:instrumentLevel('Piano'),bass:instrumentLevel('Bass'),drums:instrumentLevel('Drums')},s.style);
 const loop=$('repLoopEnabled').checked;
 let first=loop?Number($('repLoopStart').value):0,last=loop?Number($('repLoopEnd').value):s.bars.length-1;
 if(!Number.isFinite(first)||!Number.isFinite(last)||first>last){first=0;last=s.bars.length-1}
 const {beats,scale}=beatsOf(s),initialTempo=s.bpm;
 const repeats=Number($('repRepeats').value);
 const countIn=$('repCountIn').checked;
 const initialAt=audio.currentTime+.11;
 const countDuration=countIn?beats*60/initialTempo*scale:0;
 // a whole chart follows its form (repeats, endings, D.C./D.S., coda); a loop drawn on the chart plays straight through
 const order=loop?Array.from({length:last-first+1},(_,k)=>first+k):playOrder(s.bars);
 const meters=[];{let m=s.meter;for(const b of s.bars){if(b.meter)m=b.meter;meters.push(m)}}
 const state={bus,timer:0,highlights:[],paused:false,next:initialAt+countDuration,bar:order[0],pos:0,order,meters,first:order[0],last,chorus:0,repeats,baseBpm:initialTempo,finished:false};
 playback=state;
 $('repPlay').textContent='Ⅱ Pause';
 $('repPlayingStatus').textContent=countIn?'Count in…':'Starting…';
 if(countIn){
  for(let b=0;b<beats;b++){const t=initialAt+b*60/initialTempo*scale;click(t,b===0?.9:.6,bus,b===0)}
 }
 const scheduler=()=>{
  if(playback!==state||state.paused)return;
  const now=audio.currentTime;
  while(!state.finished&&state.next<now+.45){
   const bpm=state.baseBpm;
   const idx=state.order[state.pos],nowAt=state.next,atEnd=state.pos>=state.order.length-1;
   const bm=state.meters[idx]||s.meter,sb=bm===s.meter?s:{...s,meter:bm};   // a measure in another time signature
   scheduleBar(sb,idx,nowAt,bpm,bus,atEnd?state.order[0]:state.order[state.pos+1]);
   highlightBar(idx,nowAt,state.chorus);
   {const bb=beatsOf(sb);state.next+=bb.beats*60/bpm*bb.scale}
   if(atEnd){
    state.chorus++;state.pos=0;state.bar=state.order[0];
    if(repeats&&state.chorus>=repeats){state.finished=true;scheduleEnding(s,state.first,state.next,bpm,bus);state.next+=2.6}   // a final hit, left to ring before stopping
   }else{state.pos++;state.bar=state.order[state.pos]}
  }
  if(state.finished&&state.next<now){stop();$('repPlayingStatus').textContent='Finished · Press Play to restart';}
 };
 state.timer=setInterval(scheduler,70);scheduler();
}
function ensureStorage(){if(!localStorage.getItem(STORE))save()}
function instrumentLevel(name){return $('rep'+name).checked?Number($('rep'+name+'Volume').value)/100:0}
function bind(){
 // the song's own choice of instruments; while playing, the band restarts with the new sound
 for(const [id,k] of [['repKeys','keys'],['repBassPick','bass'],['repDrumPick','drums'],['repPercPick','perc']]){const el=$(id);if(!el)continue;
  el.addEventListener('change',()=>{const s=current();if(!s)return;s.instruments={...(s.instruments||{}),[k]:el.value};if(!el.value)delete s.instruments[k];save();
   const was=!!playback&&!playback.paused;if(playback)stop();warmSounds();if(was)setTimeout(play,60)})}
 document.addEventListener('keydown',e=>{
  const panel=$('repertoirePanel');if(!panel||panel.hidden)return;
  const t=e.target,tag=(t&&t.tagName||'').toLowerCase();
  if(tag==='input'||tag==='select'||tag==='textarea'||tag==='button'||(t&&t.isContentEditable)||document.querySelector('dialog[open]'))return;
  if(e.code==='Space'&&!e.repeat){e.preventDefault();play()}
  else if(e.key==='Escape'){if(playback)stop()}
 });
 let mix={};try{mix=JSON.parse(localStorage.getItem('piano-practice-mixer-v1')||'{}')||{}}catch(e){}
 for(const name of ['Piano','Bass','Drums']){
  const slider=$('rep'+name+'Volume'),enabled=$('rep'+name),output=$('rep'+name+'Level');
  slider.value=limit(mix[name]?.volume??100,0,100,100);enabled.checked=mix[name]?.enabled!==false;
  const update=()=>{
   output.textContent=slider.value+'%';
   if(playback){const gain=playback.bus.channels[name.toLowerCase()].gain;gain.cancelScheduledValues(audio.currentTime);gain.setTargetAtTime(instrumentLevel(name),audio.currentTime,.015)}
   mix[name]={volume:Number(slider.value),enabled:enabled.checked};
   try{localStorage.setItem('piano-practice-mixer-v1',JSON.stringify(mix))}catch(e){}
  };
  slider.addEventListener('input',update);enabled.addEventListener('change',update);output.textContent=slider.value+'%';
 }

 for(const key of [...new Set([...ROOTS,'C#','D#','G#','A#','Gb', ...ROOTS.map(k=>k+'m'),'C#m','D#m','G#m','A#m','Gbm'])]){
  const op=document.createElement('option');op.value=key;op.textContent=key;$('repFormKey').append(op);
 }
 $('repSearch').addEventListener('input',renderList);
 $('repNew').addEventListener('click',()=>editSong('new'));
 $('repEdit').addEventListener('click',()=>editSong('edit'));
 $('repDuplicate').addEventListener('click',()=>editSong('copy'));
 $('repDelete').addEventListener('click',async()=>{
  const s=current();if(!s||!await ppConfirm('Delete “'+s.title+'” from your library?','Delete'))return;
  stop();songs=songs.filter(x=>x.id!==s.id);selected=songs[0]?.id||null;save();renderSong();notice('Song deleted.');
  try{const sig=(s=>[String(s.title||'').trim().toLowerCase(),String(s.artist||'').trim().toLowerCase(),(s.bars||[]).length,(s.bars||[]).slice(0,4).map(b=>(b.chords||[]).join(' ')).join(',')].join('|'))(s),del=JSON.parse(localStorage.getItem('pp-sync-deleted')||'[]');if(!del.includes(sig)){del.push(sig);localStorage.setItem('pp-sync-deleted',JSON.stringify(del.slice(-500)))}}catch(e){}   // remembered by its content, so sync removes it on every device
 });
 $('repSongCancel').addEventListener('click',()=>hideModal($('repSongDialog')));
 $('repSongForm').addEventListener('submit',e=>{
  e.preventDefault();
  try{
   const s=readEditor();
   if(editorBaked)s.transpose=0;   // the chart was edited in the key it showed: that is now the song's key
   if(editMode==='edit')songs=songs.map(old=>old.id===s.id?s:old);
   else {if(songs.length>=MAX_SONGS)throw new Error('Library limit reached (4000 songs).');songs.push(s)}
   stop();selected=s.id;save();hideModal($('repSongDialog'));renderSong();notice('Song saved.');
  }catch(error){$('repSongError').textContent=error.message;}
 });
 $('repAddChord').addEventListener('click',()=>{if($('repChordRows').children.length<8){const chords=selectedChords();chords.push('Cmaj');renderChordRows(chords)}});
 $('repBarCancel').addEventListener('click',()=>hideModal($('repBarDialog')));
 $('repBarForm').addEventListener('submit',e=>{
  e.preventDefault();const s=current();if(!s)return;
  let chords=selectedChords();
  if(chords.length>8){$('repBarError').textContent='Maximum 8 chords per measure.';return}
  stop();
  {const t=s.transpose||0,fl=/b/.test(s.key),old=s.bars[editingBar].chords;
   let back=chords.map(c=>t?moveChord(c,-t,fl):c);   // back to the song's own key
   // keep the '/' slashes where they were when the number of chords is unchanged
   if(old.includes('/')&&old.filter(c=>c!=='/').length===back.length){let k=0;back=old.map(c=>c==='/'?'/':back[k++])}
   chords=back}
  const nb={...s.bars[editingBar],chords,section:$('repBarSection').value.trim()};
  nb.repeatStart=$('repBarRepStart').checked;nb.ending=$('repBarEnding').value;
  if($('repBarRepEnd').checked)nb.repeatEnd=true;else{delete nb.repeatEnd;nb.note=String(nb.note||'').replace(/(^|\s·\s)?Repeat end/i,'').trim()}
  const tm=Number($('repBarTimes').value);if(nb.repeatEnd&&tm>2)nb.times=tm;else delete nb.times;
  for(const [k,id] of [['segno','repBarSegno'],['coda','repBarCoda']]){if($(id).checked)nb[k]=true;else delete nb[k]}
  if($('repBarJump').value)nb.jump=$('repBarJump').value;else delete nb.jump;
  if($('repBarMeter').value)nb.meter=$('repBarMeter').value;else delete nb.meter;
  s.bars[editingBar]=cleanBar(nb);
  save();hideModal($('repBarDialog'));renderSong();notice('Measure updated.');
 });
 $('repAddMeasure').addEventListener('click',()=>{
  const s=current();if(!s||s.bars.length>=1024)return;
  stop();s.bars.splice(editingBar+1,0,cleanBar({chords:[]}));save();hideModal($('repBarDialog'));renderSong();notice('Measure added.');
 });
 $('repRemoveMeasure').addEventListener('click',()=>{
  const s=current();if(!s||s.bars.length<=1)return;
  stop();s.bars.splice(editingBar,1);save();hideModal($('repBarDialog'));renderSong();notice('Measure removed.');
 });
 $('repStyle').addEventListener('change',e=>{const s=current();if(s){stop();s.style=e.target.value;s.styleLabel='';save();renderSong();warmSounds()}});
 $('repTempo').addEventListener('input',e=>{const s=current();if(s){s.bpm=Number(e.target.value);$('repTempoLabel').textContent=s.bpm;save();if(playback)stop()}});
 function modifyTempo(n){const s=current();if(!s)return;s.bpm=limit(s.bpm+n,40,240,120);stop();save();renderSong()}
 $('repTempoMinus').addEventListener('click',()=>modifyTempo(-5));$('repTempoPlus').addEventListener('click',()=>modifyTempo(5));
 function trans(n){const s=current();if(!s)return;stop();s.transpose=n===0?0:((s.transpose+n+12)%12);if(s.transpose>6)s.transpose-=12;save();renderSong()}
 $('repTransMinus').addEventListener('click',()=>trans(-1));$('repTransPlus').addEventListener('click',()=>trans(1));$('repTransReset').addEventListener('click',()=>trans(0));
 $('repLoopEnabled').addEventListener('change',()=>{loopAnchor=null;stop();$('repLoopBar').hidden=!$('repLoopEnabled').checked;const s=current();if(s)renderChart(s)});
 for(const id of ['repLoopStart','repLoopEnd'])$(id).addEventListener('change',()=>{
  loopAnchor=null;if(Number($('repLoopStart').value)>Number($('repLoopEnd').value))$('repLoopEnd').value=$('repLoopStart').value;
  stop();const s=current();if(s)renderChart(s);
 });
 $('repPlay').addEventListener('click',play);$('repStop').addEventListener('click',stop);
 $('repVolume').addEventListener('input',()=>{if(playback)playback.bus.gain.value=Number($('repVolume').value)/100*.70});
 $('repExport').addEventListener('click',()=>{
  downloadFile('piano-repertoire-backup.json',JSON.stringify({format:'piano-practice-repertoire',version:1,exportedAt:new Date().toISOString(),songs},null,2));notice('Backup downloaded.');
 });
 $('repExportSong').addEventListener('click',()=>{
  const s=current();if(!s)return;
  downloadFile(filename(s.title)+'.json',JSON.stringify({format:'piano-practice-repertoire',version:1,songs:[s]},null,2));notice('Song exported.');
 });
 $('repPrint').addEventListener('click',()=>{document.body.classList.add('print-repertoire');window.print();setTimeout(()=>document.body.classList.remove('print-repertoire'),1000)});
 window.addEventListener('afterprint',()=>document.body.classList.remove('print-repertoire'));
 const openImport=()=>{$('repImportText').value='';$('repImportError').textContent='';showModal($('repImportDialog'));setTimeout(()=>$('repImportText').focus(),50)};
 $('repImport').addEventListener('click',openImport);   // one entry point: paste a link  or choose an exported file
 if($('repImportPickFile'))$('repImportPickFile').addEventListener('click',()=>{hideModal($('repImportDialog'));$('repImportFile').click()});
 $('repImportFile').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{const txt=await file.text();presentImport(importContent(txt,file.name))}
  catch(error){notice('Import failed: '+error.message,true)}
  e.target.value='';
 });
 $('repPaste').addEventListener('click',()=>{$('repImportText').value='';$('repImportError').textContent='';showModal($('repImportDialog'))});
 $('repImportCancel').addEventListener('click',()=>hideModal($('repImportDialog')));
 $('repImportForm').addEventListener('submit',e=>{
  e.preventDefault();
  const raw=$('repImportText').value.trim();
  // a normal web address (https://…) with no song link in it: open it and import the songs found there
  if(/^https?:\/\/\S+$/i.test(raw)&&!/ireal(b|book):\/\//i.test(raw)){
   const submit=$('repImportForm').querySelector('button[type=submit]');submit.disabled=true;$('repImportError').textContent='Opening the link…';
   fetch(raw,{mode:'cors'}).then(r=>{if(!r.ok)throw new Error('the page answered with error '+r.status);return r.text()})
    .then(text=>{   // the link opened: problems from here on are about what it contains
      try{const result=importContent(text,'link.html');$('repImportError').textContent='';hideModal($('repImportDialog'));presentImport(result)}
      catch(err){$('repImportError').textContent=/No song/i.test(err.message)?'No songs were found at that link.':err.message}},
     error=>{$('repImportError').textContent='Couldn’t open that link from the browser ('+String(error.message||error).replace(/\.$/,'')+'). Many sites block this; download the file and use “Choose file…” instead.'})
    .finally(()=>{submit.disabled=false});
   return;
  }
  try{const result=importContent(raw,'playlist.txt');hideModal($('repImportDialog'));presentImport(result)}
  catch(error){$('repImportError').textContent=error.message}
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&playback)stop()});
 window.addEventListener('pagehide',stop);
 window.repertoireStop=stop;
 ensureStorage();renderSong();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();

// ---- the same acoustic piano for the Ear Training tool (no sounds fetched from other sites) ----
let earBus=null;
/* ---------- MIDI keyboard: plug it in and play the app's piano (no settings needed) ---------- */
(function(){
 // Chrome, Edge and Firefox have Web MIDI; Safari gets it from the "Web MIDI for Safari" extension (macOS), which can appear a moment after the page
 const held=new Map(),sustained=new Set();let pedal=false,bus=null;
 // the keyboard has its own audio engine: pausing the Fake Book (which suspends the band's) never delays it,
 // and playing a key never wakes the band up; it uses the same decoded piano recordings
 let midiCtx=null;
 const ctxOk=()=>{try{if(!midiCtx){const AC=window.AudioContext||window.webkitAudioContext;try{midiCtx=new AC({latencyHint:'interactive'})}catch(e){midiCtx=new AC()}}if(midiCtx.state==='suspended')midiCtx.resume();return midiCtx}catch(e){return null}};
 const withCtx=(c,fn)=>{const prev=audio;audio=c;try{return fn()}finally{audio=prev}};
 // browsers only start sound after a click or key press on the page
 const wake=()=>{ctxOk()};addEventListener('pointerdown',wake,{once:true});addEventListener('keydown',wake,{once:true});
 const toast=t=>{const el=document.createElement('div');el.className='pp-toast';el.textContent=t;document.body.append(el);setTimeout(()=>el.classList.add('out'),2200);setTimeout(()=>el.remove(),2600)};
 const out=c=>{if(!bus){bus=c.createGain();bus.gain.value=1.6;bus.connect(c.destination);const rv=makeReverb(),sd=c.createGain();sd.gain.value=.16;bus.connect(sd);sd.connect(rv);rv.connect(c.destination)}return bus};
 const release=(m,c)=>{const g=held.get(m);if(!g)return;held.delete(m);if(g.__on!==undefined)withCtx(c,()=>damperNoise(m,c.currentTime,g.__vel||.6,c.currentTime-g.__on,{channels:{piano:out(c)},mem:{}}));g.gain.cancelScheduledValues(c.currentTime);g.gain.setTargetAtTime(0,c.currentTime,.09);setTimeout(()=>{try{g.disconnect()}catch(e){}},1500)};
 function noteOn(m,v){
  const c=ctxOk();if(!c||samplesDisabled)return;
  if(!banks.piano){loadBank('piano').catch(()=>{});return}
  if(held.has(m))release(m,c);sustained.delete(m);
  withCtx(c,()=>{const g=c.createGain();g.connect(out(c));g.__on=c.currentTime;g.__vel=Math.max(.08,Math.pow(v/127,1.3));held.set(m,g);
   curDyn=0;liveKey=true;try{piano(m,c.currentTime,8,g.__vel,{channels:{piano:g},mem:{}},'grand')}finally{liveKey=false}});   // start right away
 }
 function noteOff(m){const c=ctxOk();if(!c)return;if(pedal){sustained.add(m);return}release(m,c)}
 function onMessage(e){
  const [st,a,b]=e.data,cmd=st&0xf0;
  if(cmd===0x90&&b>0)noteOn(a,b);
  else if(cmd===0x80||(cmd===0x90&&b===0))noteOff(a);
  else if(cmd===0xb0&&a===64){pedal=b>=64;if(!pedal){const c=ctxOk();for(const m of sustained)if(c)release(m,c);sustained.clear()}}
  else if(cmd===0xb0&&(a===120||a===123)){const c=ctxOk();for(const m of [...held.keys()])if(c)release(m,c);sustained.clear()}
 }
 const seen=new Set();
 // while a MIDI keyboard is connected, the band's piano goes to 0 (you are the pianist); it can be raised again in the mixer,
 // and when the keyboard goes away it comes back to where it was (unless you changed it meanwhile)
 let autoMuted=false,prevPiano=null;
 const muteBandPiano=()=>{const sl=$('repPianoVolume');if(!sl||autoMuted)return false;prevPiano=sl.value;autoMuted=true;if(sl.value!=='0'){sl.value='0';sl.dispatchEvent(new Event('input',{bubbles:true}))}return true};
 const restoreBandPiano=()=>{const sl=$('repPianoVolume');if(!sl||!autoMuted)return;autoMuted=false;if(sl.value==='0'&&prevPiano!==null&&prevPiano!=='0'){sl.value=prevPiano;sl.dispatchEvent(new Event('input',{bubbles:true}))}prevPiano=null};
 const bind=access=>{const live=[...access.inputs.values()].filter(i=>!i.state||i.state==='connected');let justMuted=false;if(live.length)justMuted=muteBandPiano();else restoreBandPiano();
  for(const input of access.inputs.values()){input.onmidimessage=onMessage;if(!seen.has(input.id)){seen.add(input.id);toast('MIDI keyboard connected: '+(input.name||'keyboard')+(justMuted?' · band piano muted (raise it in the mixer)':''));if(!samplesDisabled){if(!banks.piano)loadBank('piano').catch(()=>{});if(!banks.piano_ext)loadBank('piano_ext').catch(()=>{});if(!banks.piano_rel)loadBank('piano_rel').catch(()=>{})}}}};
 let asked=false;
 const tryMidi=()=>{if(asked||!navigator.requestMIDIAccess)return;asked=true;navigator.requestMIDIAccess({sysex:false}).then(access=>{bind(access);access.onstatechange=()=>bind(access)}).catch(()=>{asked=false})};
 tryMidi();setTimeout(tryMidi,1500);setTimeout(tryMidi,5000);addEventListener('pointerdown',tryMidi);addEventListener('keydown',tryMidi);
})();
// the PDF reader (pdf-import.js) adds its songs through the same path as Import
window.ppImportSongs=function(list){const res=addImported(list);save();renderSong();presentImport({...res,errors:[]});return res};
window.ppStyleOptions=function(){const el=$('repStyle');return el?[...el.options].map(o=>[o.value,o.textContent]):[['swing','Jazz Swing']]};
// sync: reload the library after songs arrived from another device
window.ppReloadSongs=()=>{songs=loadSongs();if(!songs.some(x=>x.id===selected))selected=songs[0]?.id||null;renderSong()};
window.ppDebugBanks=()=>banks;   // for checking sound timing
window.ppPiano={
 load(){if(samplesDisabled)return Promise.reject(new Error('samples disabled'));try{getAudio()}catch(e){return Promise.reject(e)}return loadBank('piano')},
 ready(){return !samplesDisabled&&!!banks.piano},
 play(m,ms=1250){
  if(samplesDisabled||!banks.piano)return false;
  let ctx;try{ctx=getAudio()}catch(e){return false}
  if(ctx.state==='suspended')ctx.resume();
  if(!earBus){
   earBus=ctx.createGain();earBus.gain.value=1.6;earBus.connect(ctx.destination);
   const ch=ctx.createGain();ch.connect(earBus);
   const rv=makeReverb(),send=ctx.createGain();send.gain.value=.16;ch.connect(send);send.connect(rv);rv.connect(earBus);
   earBus.channels={piano:ch};earBus.mem={};
  }
  curDyn=0;piano(m,ctx.currentTime+.01,Math.max(.5,ms/1000),.62,earBus,'grand');
  return true;
 }
};
})();

/* ---------- a confirmation dialog of the app's own: browser confirm() is blocked inside some pages ---------- */
window.ppConfirm=function(message,okLabel='OK'){
 return new Promise(resolve=>{
  const d=document.createElement('dialog');d.className='rep-dialog pp-confirm';
  d.innerHTML='<form method="dialog"><p class="pp-confirm-text"></p><div class="rep-dialog-actions"><button value="cancel" class="secondary" type="submit">Cancel</button><button value="ok" class="primary pp-confirm-ok" type="submit"></button></div></form>';
  d.querySelector('.pp-confirm-text').textContent=message;d.querySelector('.pp-confirm-ok').textContent=okLabel;
  if(/delete|remove/i.test(okLabel))d.querySelector('.pp-confirm-ok').classList.add('danger');
  document.body.append(d);
  d.addEventListener('close',()=>{resolve(d.returnValue==='ok');d.remove()},{once:true});
  try{d.showModal()}catch(e){resolve(window.confirm(message));d.remove()}
 });
};
