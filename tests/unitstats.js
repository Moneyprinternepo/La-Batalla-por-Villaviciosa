const fs=require('fs'),path=require('path');
for (const f of ['data.js','maps.js','designs.js','engine.js','ai.js']) (0,eval)(fs.readFileSync(path.join(__dirname,'..','src',f),'utf8'));
const VV=globalThis.VV,E=VV.Engine;
const N=+process.argv[2]||3, sd0=+process.argv[3]||7;
const st={}; const S=id=>st[id]||(st[id]={rec:0,gold:0,dmg:0,kills:0,lost:0,taken:0});
let seed=sd0, wins={ast:0,mad:0,ver:0};
const maps=Object.keys(VV.MAPS);
for(const map of maps) for(const a of ['ast','mad','ver']) for(const b of ['ast','mad','ver']){ if(a===b) continue;
 for(let k=0;k<N;k++){ seed++;
  const s=E.newGame({map,seed:seed*7919,factions:[{id:a,ctrl:'ai',diff:'normal',leader:VV.HEROES[a][seed%7]},{id:b,ctrl:'ai',diff:'normal',leader:VV.HEROES[b][(seed*3)%7]}]});
  VV.AI.reset(); const defOf={}; s.units.forEach(u=>defOf[u.id]=u.def); let steps=0;
  while(s.winner==null&&steps<20000){ const act=VV.AI.nextAction(s); const r=E.perform(s,act); steps++;
   if(r.err){E.endTurn(s);continue;}
   for(const e of r.ev){
     if(e.type==='recruit'){const u=s.units.find(x=>x.id===e.id); defOf[u.id]=u.def; S(u.def).rec++; S(u.def).gold+=VV.UNITS[u.def].cost;}
     if(e.type==='summon'){const u=s.units.find(x=>x.id===e.id); defOf[u.id]=u.def;}
     if(e.type==='strike'&&e.hit){ const d=defOf[e.from]; if(d) S(d).dmg+=e.dmg; const t=defOf[e.to]; if(t) S(t).taken+=e.dmg; }
     if(e.type==='death'){ if(e.by&&defOf[e.by]) S(defOf[e.by]).kills++; if(defOf[e.id]) S(defOf[e.id]).lost++; }
   }}
  if(s.winner!=null) wins[s.factions[s.winner].id]++;
 }}
const rows=Object.entries(st).filter(([id])=>VV.UNITS[id].kind==='hero').map(([id,x])=>({id,cost:VV.UNITS[id].cost,rec:x.rec,dmgPerGold:+(x.dmg/Math.max(1,x.gold)).toFixed(2),killsPer100:+(100*x.kills/Math.max(1,x.gold)).toFixed(2),lossRate:+(x.lost/Math.max(1,x.rec)).toFixed(2), tankPerGold:+(x.taken/Math.max(1,x.gold)).toFixed(2)}));
rows.sort((a,b)=>b.dmgPerGold-a.dmgPerGold); console.table(rows); console.log(wins);
fs.writeFileSync('/tmp/unitstats.json',JSON.stringify(rows));
