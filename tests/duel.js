const fs=require('fs'),path=require('path');
for (const f of ['data.js','maps.js','designs.js','engine.js','ai.js']) (0,eval)(fs.readFileSync(path.join(__dirname,'..','src',f),'utf8'));
const VV=globalThis.VV,E=VV.Engine;
const ids=Object.keys(VV.UNITS).filter(id=>VV.UNITS[id].kind==='hero');
const base=E.newGame({map:'xiringuelu',seed:1,factions:[{id:'ast',ctrl:'ai',leader:'ramon'},{id:'mad',ctrl:'ai',leader:'pedro'}]});
function duel(a,b,seed,lvl){
  const s=JSON.parse(JSON.stringify(base)); s.units=[]; s.rng=seed; s.order=[0,1]; s.cur=0; s.round=1+(seed%6);
  const A=E.makeUnit(s,a,0,10,7), B=E.makeUnit(s,b,1,11,7);
  [A,B].forEach(u=>{u.lvl=Math.min(lvl,VV.UNITS[u.def].levels.length-1); u.hp=E.maxHp(u); u.fresh=false;});
  for(let t=0;t<40;t++){
    const [x,y]= t%2===0?[A,B]:[B,A]; s.cur=t%2;
    x.attacked=false; let best=0,bv=-1; E.weapons(x).forEach((w,k)=>{const P=E.predict(s,x,y,k); const v=(y.hp-P.dExp)-(x.hp-P.aExp)*0.5; if(v>bv){bv=v;best=k;}});
    E.attack(s,x,y,best); if(A.dead||B.dead) break;
    if(t%2===1){ s.round++; [A,B].forEach(u=>{ const rg=E.passive(u,'regen'); if(rg) u.hp=Math.min(E.maxHp(u),u.hp+rg.regen); }); }
  }
  return A.dead?0:B.dead?1:(A.hp/E.maxHp(A)>B.hp/E.maxHp(B)?0.6:0.4);
}
const lvl=+(process.argv[2]||0); const R={}; ids.forEach(i=>R[i]=0);
for(const a of ids) for(const b of ids){ if(a===b) continue; let w=0; for(let k=0;k<16;k++) w+= (k%2? duel(a,b,k*977+3,lvl) : 1-duel(b,a,k*977+3,lvl)); R[a]+=w/16; }
const out=ids.map(id=>({id,cost:VV.UNITS[id].cost,strength:+(R[id]/(ids.length-1)).toFixed(3)})).sort((x,y)=>y.strength-x.strength);
out.forEach(o=>o.perCost=+(o.strength/o.cost*20).toFixed(3));
console.table(out); fs.writeFileSync('/tmp/duel'+lvl+'.json',JSON.stringify(out));
