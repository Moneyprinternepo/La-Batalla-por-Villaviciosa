const fs=require('fs'),path=require('path');
for (const f of ['data.js','maps.js','designs.js','engine.js','ai.js']) (0,eval)(fs.readFileSync(path.join(__dirname,'..','src',f),'utf8'));
const VV=globalThis.VV,E=VV.Engine;
var N=+process.argv[2]||6, diff=process.argv[3]||'normal';
const tab={};
let seed=+(process.argv[3]||100);
for (const map of ['villa','xiringuelu']) for (const a of ['ast','mad','ver']) for (const b of ['ast','mad','ver']) { if(a===b) continue;
 for(let k=0;k<N;k++){ seed++;
  const s=E.newGame({map,seed:seed*7919,factions:[{id:a,ctrl:'ai',diff,leader:VV.HEROES[a][seed%7]},{id:b,ctrl:'ai',diff,leader:VV.HEROES[b][(seed*3)%7]}]});
  VV.AI.reset(); let st=0;
  while(s.winner==null&&st<20000){const r=E.perform(s,VV.AI.nextAction(s)); if(r.err){console.log('ERR',r.err);E.endTurn(s);} st++;}
  const w=s.winner==null?'none':s.factions[s.winner].id;
  const key=map+' '+a+'-'+b; tab[key]=tab[key]||{}; tab[key][w]=(tab[key][w]||0)+1; tab[key].r=(tab[key].r||0)+s.round;
 }}
const tot={};
for(const k in tab){console.log(k,JSON.stringify(tab[k])); for(const f in tab[k]) if(f!=='r') tot[f]=(tot[f]||0)+tab[k][f];}
console.log(tot);
