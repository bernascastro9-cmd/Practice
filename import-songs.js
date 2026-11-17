/* Practice — Import songs: reads song links and files (song links and exported playlists) in the browser.
   Import of a user's HTML file or URL is performed entirely in the browser.
   Song links come in two formats: the current one is decoded with a publicly documented 50-character
   character permutation; the older one uses an open chord text protocol.
   Nonlinear navigation (D.C., D.S., endings) is preserved as annotations but
   simplified to linear bars for this practice player. */
(function(root){
  'use strict';
  const CHORD = /^[A-G](?:#|b)?[a-z0-9^+\-#b()]*(?:\/[A-G](?:#|b)?)?/;
  const MAX_INPUT=5*1024*1024, MAX_BARS=1024, MAX_SONGS=4000;
  function mapStyle(s){
    s=String(s||'').toLowerCase();
    if(/partido/.test(s))return 'partido';
    if(/samba|baiao|baião/.test(s))return 'samba';
    if(/slo.?mo|mo.?slo|slow blues/.test(s))return 'slowblues';
    if(/blues|shuffle/.test(s))return 'blues';
    if(/second line/.test(s))return 'secondline';
    if(/two.?four|two.?feel|trad|new orleans/.test(s))return 'swing2';
    if(/afro/.test(s))return 'afro';
    if(/16th/.test(s))return 'even16';
    if(/even 8|8ths/.test(s))return 'even8';
    if(/blue note|boogaloo/.test(s))return 'boogaloo';
    if(/bossa/.test(s))return 'bossa';
    if(/latin/.test(s))return 'latin';
    if(/waltz|3\/4/.test(s))return 'waltz';
    if(/reggae/.test(s))return 'reggae';
    if(/funk|soul/.test(s))return 'funk';
    if(/rock/.test(s))return 'rock';
    if(/ballad|slow/.test(s))return 'ballad';
    if(/pop/.test(s))return 'pop';
    return 'swing';
  }
  function normalizeKey(key){
    key=String(key||'C').trim();
    if(!key)return 'C';
    return key.endsWith('-')?key.slice(0,-1)+'m':key;
  }
  function unobfuscate(data){
    // The transformation is self-inverse. Every complete 50-character block
    // except the final block is swapped; the last <=50 chars remain unchanged.
    let out='';
    while(data.length>50){
      const part=data.slice(0,50);data=data.slice(50);
      if(data.length<2){out+=part;continue;}
      const a=part.split('');
      for(let i=0;i<5;i++){a[i]=part[49-i];a[49-i]=part[i];}
      for(let i=10;i<24;i++){a[i]=part[49-i];a[49-i]=part[i];}
      out+=a.join('');
    }
    return out+data;
  }
  function convertChord(raw){
    if(!raw||raw==='n')return raw==='n'?'N.C.':'';
    const match=/^([A-G][#b]?)(.*)$/.exec(raw);
    if(!match)return raw;
    let quality=match[2];
    quality=quality.replace(/^\^/,'maj').replace(/^h7/,'m7b5').replace(/^h(?=\d|$)/,'m7b5').replace(/^o(?=\d|$)/,'dim')
      .replace(/^-\^/,'mMaj').replace(/^-(?=\d|$)/,'m').replace(/^\+/,'aug');
    return match[1]+quality;
  }
  function fromMusic(raw){
    if(typeof raw!=='string'||raw.length>300000)throw new Error('Invalid or oversized song chart.');
    let text=raw.replace(/XyQ/g,'   ').replace(/LZ\|/g,' |').replace(/LZ/g,' |')
      .replace(/Kcl/g,' | x ').replace(/\u00a0/g,' ');
    const bars=[];
    let chords=[],section='', nextSection='', meter='4/4', pendingRepeat=false, pendingEnding='', note='', pendingRepeatEnd=false, pendingSegno=false, pendingCoda=false, firstMeter='', pendingMeter='', inAlt=false;
    const addBar=()=>{
      // a measure that only carries a comment (for example "3x" after a repeat) belongs to the measure before it
      if(!chords.length&&note&&!section&&!pendingRepeat&&!pendingEnding&&bars.length){const pv=bars[bars.length-1];pv.note=(pv.note?pv.note+' · ':'')+note;if(pendingRepeatEnd)pv.repeatEnd=true;if(pendingSegno)pv.segno=true;if(pendingCoda)pv.coda=true;note='';pendingRepeatEnd=false;pendingSegno=false;pendingCoda=false;return;}
      if(!chords.length&&!section&&!pendingRepeat&&!pendingEnding&&!note){if(pendingRepeatEnd&&bars.length)bars[bars.length-1].repeatEnd=true;pendingRepeatEnd=false;return;}
      if(bars.length>=MAX_BARS)throw new Error('This chart contains too many measures.');
      const bar={chords:chords.slice(0,8),section,repeatStart:pendingRepeat,ending:pendingEnding, note};
      if(pendingRepeatEnd)bar.repeatEnd=true;if(pendingSegno)bar.segno=true;if(pendingCoda)bar.coda=true;if(pendingMeter){bar.meter=pendingMeter;pendingMeter='';}   // navigation marks used to play the form in order
      bars.push(bar);
      chords=[];section='';pendingRepeat=false;pendingEnding='';note='';pendingRepeatEnd=false;pendingSegno=false;pendingCoda=false;
    };
    let i=0;
    while(i<text.length){
      const c=text[i],tail=text.slice(i);
      if(c==='<' ){
        const end=text.indexOf('>',i+1);
        if(end!==-1){note=text.slice(i+1,end).replace(/^\*\d\d/,'').slice(0,70);i=end+1;continue;}
      }
      const sig=/^T(\d{2,4})/.exec(tail);
      if(sig){
        const d=sig[1]; meter=d.length===2?d[0]+'/'+d[1]:(d.length===3?d[0]+'/'+d.slice(1):d.slice(0,2)+'/'+d.slice(2));
        if(!firstMeter)firstMeter=meter;else if(meter!==firstMeter||bars.some(b=>b.meter))pendingMeter=meter;   // a time-signature change part-way through
        i+=sig[0].length;continue;
      }
      const sec=/^\*([A-DVi])/.exec(tail);
      if(sec){section=sec[1]==='i'?'Intro':sec[1]==='V'?'Verse':sec[1];i+=2;continue;}
      const ending=/^N([0-9])/.exec(tail);
      if(ending){pendingEnding=ending[1];i+=2;continue;}
      if(c==='{'){if(chords.length)addBar();pendingRepeat=true;i++;continue;}
      if(c==='}'||c===']'||c==='Z'){
        if(c==='}'){if(chords.length)note=(note?note+' · ':'')+'Repeat end';pendingRepeatEnd=true;}
        addBar();i++;continue;
      }
      if(c==='|'||c==='['){addBar();i++;continue;}
      if(c==='('){const end=text.indexOf(')',i+1);if(end!==-1){i=end+1;continue;}}
      if(c==='x' || c==='r'){
        if(!chords.length){
          if(c==='x'&&bars.length)chords=[...bars[bars.length-1].chords];
          else if(c==='r'&&bars.length>1){const a=bars[bars.length-2],b=bars[bars.length-1];chords=[...a.chords];addBar();chords=[...b.chords];}   // repeat the two bars before
        }
        i++;continue;
      }
      if(c==='n'&&(!chords.length||/^[\s|[\]{}Z]/.test(text[i+1]||' '))){chords.push('N.C.');i++;continue;}
      if(c==='S'){pendingSegno=true;i++;continue;}   // segno
      if(c==='Q'){pendingCoda=true;i++;continue;}   // coda sign
      if(c==='p'){if(chords.length||bars.length)chords.push('/');i++;continue;}   // pause slash: the chord before carries on
      if(/[slUYf\s,]/.test(c)){i++;continue;}
      const chord=CHORD.exec(tail);
      if(chord){
        // alternate chords are written in parentheses: they are shown in some charts but not played
        let tok=chord[0];
        if(inAlt){if(tok.includes(')'))inAlt=false;i+=tok.length;continue;}
        {const ps=/p+$/.exec(tok);if(ps&&tok.length>ps[0].length){const base=tok.slice(0,-ps[0].length),nb=convertChord(base);if(nb)chords.push(nb);for(let q=0;q<ps[0].length;q++)chords.push('/');i+=tok.length;continue;}}   // "C7pp": pause slashes written straight after the chord
        if(tok.includes('(')){const base=tok.slice(0,tok.indexOf('('));const nb=base&&convertChord(base);if(nb)chords.push(nb);if(!tok.includes(')'))inAlt=true;i+=tok.length;continue;}
        const normalized=convertChord(chord[0]);
        if(normalized)chords.push(normalized);
        i+=chord[0].length;continue;
      }
      i++;
    }
    addBar();
    // Some exports have no explicit final bar line.
    if(!bars.length)throw new Error('No recognizable chords found in the chart.');
    return {bars,meter:firstMeter||meter};
  }
  function decodeModernSong(segment){
    const fields=segment.split('=');
    const marker=fields.findIndex(x=>x.includes('1r34LbKcu7'));
    if(marker<0)throw new Error('Missing song data.');
    const info=fields.slice(0,marker).filter(x=>x.trim()!=='');
    const tail=fields.slice(marker+1).filter(x=>x.trim()!=='');
    if(info.length<2)throw new Error('Incomplete song metadata.');
    const music=fields[marker].slice(fields[marker].indexOf('1r34LbKcu7')+10);
    const parsed=fromMusic(unobfuscate(music));
    // Optional transposition field may follow the key in modern exports.
    const keyIndex=info.findIndex((v,i)=>i>=2&&/^[A-G](?:[#b])?-?$/.test(v.trim()));
    const style=keyIndex>=3?info[keyIndex-1]:info.length>=3?info[2]:'Swing';
    const key=keyIndex>=0?info[keyIndex]:'C';
    const bpmMatch=tail.find(x=>/^\d{2,3}$/.test(x)&&Number(x)>=40&&Number(x)<=240);
    return {title:info[0].trim()||'Untitled',artist:(info[1]||'').trim(),style:mapStyle(style),styleLabel:style.trim(),key:normalizeKey(key),meter:parsed.meter,bpm:bpmMatch?Number(bpmMatch):style.match(/ballad/i)?70:120,bars:parsed.bars,source:'Imported'};
  }
  function decodeLegacySong(segment){
    const parts=segment.split('=');
    if(parts.length<6)throw new Error('Incomplete song.');
    const [title,artist,style,key,sig,...remaining]=parts;
    const parsed=fromMusic(remaining.join('='));
    if(/^\d{2,4}$/.test(sig)){const s=sig.trim();parsed.meter=s.length===2?s[0]+'/'+s[1]:s.slice(0,2)+'/'+s.slice(2);}
    return {title:title.trim()||'Untitled',artist:artist.trim(),style:mapStyle(style),styleLabel:style.trim(),key:normalizeKey(key),meter:parsed.meter,bpm:style.match(/ballad/i)?70:120,bars:parsed.bars,source:'Imported'};
  }
  function extractLinks(input){
    const text=String(input||'');
    if(text.length>MAX_INPUT)throw new Error('File too large (maximum 5 MB). Try importing smaller playlists.');
    const result=[];
    // Safe, inert parse. No scripts/resources are executed.
    if(/<\w[\s>]/.test(text)){
      const doc=new DOMParser().parseFromString(text,'text/html');
      for(const a of doc.querySelectorAll('a[href]')){
        const href=a.getAttribute('href')||'';
        if(/^ireal(?:b|book):\/\//i.test(href))result.push(href);
      }
    }
    if(!result.length){
      const match=text.match(/ireal(?:b|book):\/\/[^\r\n"'<>]*/gi);
      if(match)result.push(...match.map(x=>x.replace(/(?:\s*<\/a.*|\s*<\/.*?)$/i,'').trim()));
    }
    return [...new Set(result)];
  }
  function parse(input){
    const links=extractLinks(input), songs=[], errors=[];
    if(!links.length)throw new Error('No song link found. Import an exported .html file or paste a song link.');
    let playlist='';
    for(const link of links){
      const scheme=/^(irealb|irealbook):\/\//i.exec(link);
      if(!scheme)continue;
      let decoded;
      try{decoded=decodeURIComponent(link.slice(scheme[0].length).replace(/&amp;/g,'&'));}
      catch(e){errors.push('Invalid URL encoding');continue;}
      const chunks=decoded.split('===');
      // For modern exports, the last ===-separated part is the playlist title.
      if(chunks.length>1 && chunks[chunks.length-1] && !chunks[chunks.length-1].includes('=') && !chunks[chunks.length-1].includes('1r34LbKcu7')){
        playlist=chunks.pop().trim()||playlist;
      }
      for(const chunk of chunks){
        if(!chunk.trim())continue;
        if(songs.length>=MAX_SONGS){errors.push('Import limit reached (4000 songs).');break;}
        try{songs.push(scheme[1].toLowerCase()==='irealb'?decodeModernSong(chunk):decodeLegacySong(chunk));}
        catch(e){errors.push(e.message);}
      }
    }
    if(!songs.length)throw new Error('Could not read any songs. '+(errors[0]||''));
    return {songs,playlist,errors};
  }
  root.SongImporter={parse,fromMusic,unobfuscate,normalizeKey,mapStyle};
})(window);
