/* RIFTBOUND - AREA, CARD AND TOWER GAMEPLAY UPDATE */
let currentRun = null;
let selectedTower = null;
let selectedTowerEntity = null;
let gameRunning = false;
let animationFrame = null;
let lastFrameTime = 0;
let spawnTimer = 0;
let pointerWorld = null;
let placementValid = false;
let pendingCards = [];
function getSettings(){ return window.riftboundSettings || { towerRanges:false, difficulty:"normal" }; }

const canvas = document.getElementById("battlefield");
const ctx = canvas.getContext("2d");

const pathPoints = [
  {x:75,y:270},{x:230,y:270},{x:230,y:130},{x:440,y:130},
  {x:440,y:405},{x:690,y:405},{x:690,y:270},{x:850,y:270}
];
const treePositions = [
  [70,70],[145,90],[90,170],[330,55],[390,65],[520,70],[610,90],[780,75],[900,80],
  [100,390],[150,465],[320,470],[540,490],[800,450],[900,400],[560,230],[820,170],
  [350,330],[110,330],[760,340],[920,180]
];
const areas = [
  {name:"Verdant Woods",subtitle:"The Last Fortress",boss:"",enemyScale:1},
  {name:"Ashen Wastes",subtitle:"The Scorched Crossing",boss:"",enemyScale:1.3},
  {name:"Frostbound Kingdom",subtitle:"The Frozen Citadel",boss:"Ancient Treant",enemyScale:1.65}
];
const towerTypes = {
  archer:{name:"Archer Tower",cost:50,damage:10,range:120,fireRate:1,color:"#B99AE8",projectileSpeed:330,upgradeCost:65},
  arcane:{name:"Wizard Tower",cost:100,damage:34,range:112,fireRate:.8,color:"#75B8E8",projectileSpeed:280,upgradeCost:90},
  cannon:{name:"Cannon Tower",cost:125,damage:48,range:145,fireRate:.4,color:"#D9A56C",projectileSpeed:230,upgradeCost:110}
};
const enemyTypes = {
  riftling:{name:"Riftling",health:40,speed:45,reward:8,damage:8,color:"#B68AE8",size:12},
  brute:{name:"Iron Brute",health:150,speed:22,reward:18,damage:18,color:"#A17B78",size:17},
  riftwing:{name:"Riftwing",health:65,speed:75,reward:12,damage:10,color:"#78B9D1",size:11},
  treant:{name:"Ancient Treant",health:2000,speed:15,reward:150,damage:35,color:"#83A66C",size:27}
};
const cardPool = [
  {id:"arrows",name:"Sharpened Arrows",rarity:"COMMON",type:"TOWER",description:"Archer Towers deal +5 damage per hit.",icon:"➶"},
  {id:"arcane",name:"Arcane Knowledge",rarity:"RARE",type:"TOWER",description:"Wizard Towers deal +10 damage per hit.",icon:"✧"},
  {id:"siege",name:"Siege Engineering",rarity:"RARE",type:"TOWER",description:"Cannon Towers gain +25 range.",icon:"◆"},
  {id:"greed",name:"Greedy Kingdom",rarity:"COMMON",type:"ECONOMY",description:"Earn +3 gold for every enemy defeated.",icon:"♜"},
  {id:"walls",name:"Reinforced Walls",rarity:"RARE",type:"DEFENSE",description:"Increase maximum castle HP by 20 and restore 20 HP.",icon:"⬟"}
];

function getRunCommanderId(){return currentRun?.commanderId||window.riftboundCommanderId||"warden";}
const commanderAbilities={
  warden:{name:"IRON BASTION",cooldown:45,description:"Raise a fortress ward for 12 seconds: halve incoming castle damage and make towers fire 25% faster.",requiresEnemies:false},
  arcanist:{name:"RIFT SURGE",cooldown:40,description:"Unleash a rift pulse dealing 120 damage to every enemy and slowing them by 45% for 5 seconds.",requiresEnemies:true},
  huntmaster:{name:"MARKED PREY",cooldown:35,description:"Mark the most advanced elite for 10 seconds. All towers prioritise it and deal 60% more damage.",requiresEnemies:true},
  treasurer:{name:"ROYAL DECREE",cooldown:60,description:"Call in the royal treasury for an instant grant of 125 gold.",requiresEnemies:false},
  pyromancer:{name:"INFERNO",cooldown:45,description:"Call down a fiery eruption dealing 65 damage to every enemy and burning them for 5 seconds.",requiresEnemies:true},
  necromancer:{name:"RAISE THE FALLEN",cooldown:50,description:"Summon three spectral wraiths for 12 seconds. They hunt enemies, strike for 18 damage, then drift back into battle.",requiresEnemies:true}
};
function createNewRun(){
  const commanderId=window.riftboundCommanderId||"warden";
  const startingHealth=commanderId==="warden"?120:100;
  return {
    commanderId,gold:100,castleHealth:startingHealth,maxCastleHealth:startingHealth,area:1,campsite:1,stage:1,currentWave:0,totalWaves:30,
    towers:[{type:"archer",x:330,y:200,cooldown:0,level:1,upgrades:{damage:0,range:0,speed:0}}],
    enemies:[],projectiles:[],spawnBatches:[],waveActive:false,gameOver:false,waveStarted:false,waveIntervalTimer:0,
    towerDamageBonus:0,cards:[],nextWaveTimer:0,waitingForWave:false,runFinished:false,
    devInvincible:false,devGameSpeed:1,campsiteRestUsed:false,spectralAllies:[],
    abilityCooldown:0,bastionTimer:0,markedEnemy:null,markedTimer:0,abilityEffects:[]
  };
}
function startNewRun(){
  stopGameLoop();currentRun=createNewRun();selectedTower=null;selectedTowerEntity=null;
  persistRunCheckpoint("battle");
  document.querySelectorAll(".tower-button").forEach(b=>b.classList.remove("selected"));
  updateAreaLabels();
  updateGameDisplay();
}
function areaData(){return areas[currentRun.area-1]||areas[0];}

function persistRunCheckpoint(checkpoint="battle"){
  if(!currentRun||typeof window.riftboundCloudSave!=="function")return;
  const run={
    gold:currentRun.gold,castleHealth:currentRun.castleHealth,maxCastleHealth:currentRun.maxCastleHealth,
    area:currentRun.area,campsite:currentRun.campsite,stage:currentRun.stage,currentWave:currentRun.currentWave,
    totalWaves:currentRun.totalWaves,towers:currentRun.towers.map(t=>({type:t.type,x:t.x,y:t.y,level:t.level,
      upgrades:{damage:t.upgrades?.damage||0,range:t.upgrades?.range||0,speed:t.upgrades?.speed||0}})),
    towerDamageBonus:currentRun.towerDamageBonus,cards:[...currentRun.cards],
    commanderId:currentRun.commanderId||"warden",abilityCooldown:currentRun.abilityCooldown||0,
    campsiteRestUsed:!!currentRun.campsiteRestUsed,checkpoint
  };
  window.riftboundCloudSave(run);
}

window.restoreRiftboundRun=function(saved){
  if(!saved||!saved.run)return false;
  const data=saved.run;
  stopGameLoop();
  const savedCommander=data.commanderId||window.riftboundCommanderId||"warden";
  window.riftboundCommanderId=savedCommander;
  currentRun={...createNewRun(),...data,commanderId:savedCommander,enemies:[],projectiles:[],spawnBatches:[],spectralAllies:[],waveActive:false,
    gameOver:false,waveStarted:false,waveIntervalTimer:0,waitingForWave:false,devInvincible:false,devGameSpeed:1};
  selectedTower=null;selectedTowerEntity=null;
  document.getElementById("main-menu").style.display="none";
  document.getElementById("preparation-screen").hidden=true;
  document.getElementById("game-screen").hidden=data.checkpoint==="campsite";
  document.getElementById("campsite-screen").hidden=data.checkpoint!=="campsite";
  updateAreaLabels();updateGameDisplay();
  if(data.checkpoint==="campsite"){
    showCampsiteScreen(((currentRun.area-1)*30)+((currentRun.campsite-1)*15));
  }else{
    initBattlefield();
  }
  return true;
};
function updateAreaLabels(){
  const a=areaData();
  document.querySelector(".battle-region span").textContent="AREA 0"+currentRun.area+" · "+a.name.toUpperCase();
  document.querySelector(".battle-region h1").textContent=a.subtitle.toUpperCase();
  document.querySelector(".region-heading .prep-eyebrow").textContent="AREA 0"+currentRun.area;
  document.querySelector(".region-heading h2").textContent=a.name.toUpperCase();
  const details=document.querySelectorAll(".region-details span");
  if(details[0])details[0].textContent="30 WAVES · 2 CAMPSITES";
  if(details[1])details[1].textContent=currentRun.area===3?"ANCIENT TREANT BOSS":"BOSS THREAT UNKNOWN";
  if(details[2])details[2].textContent=currentRun.area===1?"UNKNOWN THREATS":currentRun.area===2?"THREATS INTENSIFY":"FINAL REALM · EXTREME THREATS";
}
function initBattlefield(){
  if(!currentRun)startNewRun();
  stopGameLoop();selectedTowerEntity=null;updateAreaLabels();updateGameDisplay();drawBattlefield();
  setWaveStatus("READY WHEN YOU ARE");showBattleMessage(window.matchMedia("(pointer: coarse)").matches ? "TAP A TOWER TO SELECT IT, THEN TAP AN OPEN AREA TO BUILD" : "BUILD YOUR DEFENSE, THEN PRESS START WAVE WHEN READY");
  currentRun.waitingForWave=false;currentRun.nextWaveTimer=0;currentRun.waveIntervalTimer=0;startGameLoop();
}
function updateGameDisplay(){
  if(!currentRun)return;
  document.getElementById("gold-display").textContent=Math.floor(currentRun.gold);
  document.getElementById("health-display").textContent=currentRun.castleHealth+" / "+currentRun.maxCastleHealth;
  document.getElementById("wave-display").textContent=(((currentRun.campsite-1)*3+(currentRun.stage-1))*5+currentRun.currentWave)+" / 30";
  const progress=document.getElementById("progress-summary");if(progress)progress.textContent="AREA "+currentRun.area+" · CAMPSITE "+currentRun.campsite+"/2 · STAGE "+currentRun.stage+"/3";
  const start=document.getElementById("start-wave");if(start)start.disabled=currentRun.waveActive||currentRun.gameOver||currentRun.currentWave>=5;
  updateCommanderHud();
  updateTowerButtons();updateTowerPanel();
}
function updateTowerButtons(){
  document.querySelectorAll(".tower-button").forEach(b=>{
    const type=towerTypes[b.dataset.tower];b.disabled=!currentRun||currentRun.gold<type.cost||currentRun.gameOver;
  });
}
function showBattleMessage(s){document.getElementById("battle-message").textContent=s;}
function setWaveStatus(s){document.getElementById("wave-status").textContent=s;}
function getTowerStats(t){
  const base=towerTypes[t.type],u=t.upgrades||{damage:0,range:0,speed:0};
  let damage=base.damage+(u.damage||0)*5;
  let range=base.range+(u.range||0)*15;
  let cooldown=Math.max(.15,1/base.fireRate-(u.speed||0)*.1);
  let fireRate=1/cooldown;
  if(t.type==="arcane"&&getRunCommanderId()==="arcanist")damage*=1.25;
  if(t.type==="archer")damage+=currentRun.cards.filter(c=>c==="arrows").length*5;
  if(t.type==="arcane")damage+=currentRun.cards.filter(c=>c==="arcane").length*10;
  if(t.type==="cannon")range+=currentRun.cards.filter(c=>c==="siege").length*25;
  damage+=currentRun.towerDamageBonus;
  return {...base,damage,range,fireRate,cooldown};
}
function environmentPalette(){
  if(currentRun.area===2)return {ground:"#302B2A",textureA:"#403634",textureB:"#211F20",pathDark:"#29201F",path:"#665047",pathEdge:"#9A7965",treeDark:"#211C1B",tree:"#49403A",treeLight:"#6A5B50",trunk:"#554137"};
  if(currentRun.area===3)return {ground:"#26313C",textureA:"#344352",textureB:"#1D2935",pathDark:"#222832",path:"#586675",pathEdge:"#9AAEC0",treeDark:"#1A2730",tree:"#344B5A",treeLight:"#607D91",trunk:"#52616D"};
  return {ground:"#263B2B",textureA:"#304632",textureB:"#203326",pathDark:"#382C29",path:"#776047",pathEdge:"#9B8060",treeDark:"#17251B",tree:"#315438",treeLight:"#426443",trunk:"#64472F"};
}
function drawBattlefield(){
  const palette=environmentPalette();ctx.fillStyle=palette.ground;ctx.fillRect(0,0,960,540);drawGroundTexture();drawPath();drawTrees();drawPortal();drawCastle();drawTowers();drawEnemies();drawProjectiles();drawSpectralAllies();drawCommanderEffects();drawPlacementPreview();
}
function drawGroundTexture(){
  const p=environmentPalette();
  for(let x=0;x<960;x+=32)for(let y=0;y<540;y+=32){const v=(x*7+y*13)%5;if(v===0){ctx.fillStyle=p.textureA;ctx.fillRect(x,y,16,16);}else if(v===1){ctx.fillStyle=p.textureB;ctx.fillRect(x+12,y+8,12,12);}}
}
function drawPath(){
  const palette=environmentPalette();ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();pathPoints.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
  ctx.strokeStyle=palette.pathDark;ctx.lineWidth=68;ctx.stroke();ctx.strokeStyle=palette.path;ctx.lineWidth=54;ctx.stroke();
  ctx.strokeStyle=palette.pathEdge;ctx.lineWidth=2;ctx.setLineDash([12,15]);ctx.stroke();ctx.setLineDash([]);
}
function drawTrees(){
  const p=environmentPalette();
  treePositions.forEach(([x,y])=>{
    ctx.fillStyle=p.treeDark;ctx.fillRect(x-15,y-12,38,34);ctx.fillStyle=p.trunk;ctx.fillRect(x-5,y+5,10,15);
    ctx.fillStyle=p.tree;ctx.fillRect(x-18,y-25,36,35);ctx.fillStyle=p.treeLight;ctx.fillRect(x-12,y-30,25,25);ctx.fillStyle=p.tree;ctx.fillRect(x-5,y-25,12,12);
  });
}
function drawPortal(){
  const p=1+Math.sin(performance.now()/300)*.12;ctx.fillStyle="rgba(129,85,184,.15)";ctx.beginPath();ctx.arc(75,270,48*p,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#62447F";ctx.lineWidth=8;ctx.beginPath();ctx.ellipse(75,270,24,38,0,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle="#21102F";ctx.beginPath();ctx.ellipse(75,270,18,31,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#B99AE8";ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(75,270,15,27,0,0,Math.PI*2);ctx.stroke();
}
function drawCastle(){
  ctx.fillStyle="#17251B";ctx.fillRect(855,225,85,100);ctx.fillStyle="#655A70";ctx.fillRect(860,235,70,70);ctx.fillStyle="#98899E";ctx.fillRect(870,245,50,50);
  ctx.fillStyle="#4A3B55";ctx.fillRect(852,220,22,35);ctx.fillRect(916,220,22,35);ctx.fillRect(852,285,22,35);ctx.fillRect(916,285,22,35);
  ctx.fillStyle="#B99AE8";ctx.fillRect(852,216,22,6);ctx.fillRect(916,216,22,6);ctx.fillStyle="#241932";ctx.fillRect(885,275,22,30);
}
function drawTowers(){
  if(!currentRun)return;
  currentRun.towers.forEach(t=>{
    const s=getTowerStats(t),selected=t===selectedTowerEntity;
    if(getSettings().towerRanges||selected){ctx.beginPath();ctx.arc(t.x,t.y,s.range,0,Math.PI*2);ctx.fillStyle=selected?"rgba(185,154,232,.12)":"rgba(185,154,232,.06)";ctx.fill();ctx.strokeStyle=selected?"rgba(220,195,255,.75)":"rgba(185,154,232,.2)";ctx.lineWidth=selected?2:1;ctx.stroke();}
    ctx.fillStyle="#241932";ctx.fillRect(t.x-16,t.y-16,32,32);ctx.strokeStyle=s.color;ctx.lineWidth=2;ctx.strokeRect(t.x-16,t.y-16,32,32);
    ctx.fillStyle=s.color;ctx.fillRect(t.x-8,t.y-8,16,16);ctx.fillStyle="#E5DDF0";ctx.fillRect(t.x-3,t.y-3,6,6);
    if(t.level>1){ctx.fillStyle="#F0D58A";ctx.font="11px Georgia";ctx.fillText("+"+(t.level-1),t.x+12,t.y-12);}
  });
}
function drawEnemies(){
  if(!currentRun)return;
  currentRun.enemies.forEach(e=>{
    const t=enemyTypes[e.type],size=t.size;ctx.fillStyle="rgba(0,0,0,.3)";ctx.fillRect(e.x-size,e.y+size/2,size*2,5);
    ctx.fillStyle=t.color;ctx.fillRect(e.x-size/2,e.y-size/2,size,size);ctx.fillStyle="#241932";ctx.fillRect(e.x-4,e.y-3,3,3);ctx.fillRect(e.x+2,e.y-3,3,3);
    if(currentRun.markedEnemy===e&&currentRun.markedTimer>0){
      const pulse=1+Math.sin(performance.now()/90)*.12;
      ctx.strokeStyle="#F0D58A";ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,(size+10)*pulse,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle="#F0D58A";ctx.font="bold 10px Arial";ctx.textAlign="center";ctx.fillText("MARKED",e.x,e.y-size-22);
    }
    const w=e.type==="treant"?64:42,p=Math.max(0,e.health/e.maxHealth),barY=e.y-size-15;
    ctx.fillStyle="#241932";ctx.fillRect(e.x-w/2,barY,w,7);ctx.fillStyle=p>.5?"#75C77A":"#D66B75";ctx.fillRect(e.x-w/2,barY,w*p,7);
    ctx.font="10px Arial";ctx.textAlign="center";ctx.fillStyle="#FFFFFF";ctx.strokeStyle="#241932";ctx.lineWidth=2;
    const hp=Math.max(0,Math.ceil(e.health))+"/"+Math.ceil(e.maxHealth);ctx.strokeText(hp,e.x,barY-3);ctx.fillText(hp,e.x,barY-3);
    if(e.type==="treant"){ctx.font="12px Georgia";ctx.fillStyle="#F0D58A";ctx.fillText("ANCIENT TREANT",e.x,e.y-size-25);}
  });ctx.textAlign="left";
}
function drawProjectiles(){
  if(!currentRun)return;currentRun.projectiles.forEach(p=>{ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fill();});
}
function drawSpectralAllies(){
  if(!currentRun?.spectralAllies?.length)return;
  const now=performance.now();
  currentRun.spectralAllies.forEach((ally,index)=>{
    const fade=Math.min(1,ally.life/1.2);
    const bob=Math.sin(now/115+index*2.1)*3;
    ctx.save();ctx.translate(ally.x,ally.y+bob);ctx.globalAlpha=fade;
    ctx.shadowColor="#B99AE8";ctx.shadowBlur=18;
    ctx.fillStyle="rgba(166,119,226,.22)";ctx.beginPath();ctx.ellipse(0,2,17,23,0,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle="rgba(201,174,255,.88)";ctx.beginPath();ctx.arc(0,-7,8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="rgba(130,91,190,.92)";ctx.beginPath();ctx.moveTo(-10,-1);ctx.quadraticCurveTo(-18,13,-8,22);ctx.quadraticCurveTo(-3,17,0,23);ctx.quadraticCurveTo(5,17,10,22);ctx.quadraticCurveTo(17,9,10,-1);ctx.closePath();ctx.fill();
    ctx.fillStyle="#F4E9FF";ctx.fillRect(-4,-9,2,3);ctx.fillRect(3,-9,2,3);
    ctx.strokeStyle="rgba(230,211,255,.7)";ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,2,13+Math.sin(now/100+index)*2,0,Math.PI*2);ctx.stroke();
    if(ally.attacking>0){
      ctx.strokeStyle="rgba(221,196,255,.95)";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-24);ctx.stroke();
      ctx.fillStyle="#F3E7FF";ctx.beginPath();ctx.arc(0,-25,4,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  });
}
function drawCommanderEffects(){
  if(!currentRun)return;
  const now=performance.now();
  currentRun.abilityEffects=(currentRun.abilityEffects||[]).filter(effect=>{
    const progress=1-effect.life/effect.duration;
    const alpha=Math.max(0,1-progress);
    ctx.save();
    if(effect.type==="bastion"){
      const pulse=1+Math.sin(now/110)*.06;
      ctx.strokeStyle="rgba(116,190,255,"+(0.95*alpha)+")";ctx.lineWidth=5;
      ctx.shadowColor="#75B8E8";ctx.shadowBlur=20;
      ctx.beginPath();ctx.arc(895,270,58*pulse,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle="rgba(116,190,255,.14)";ctx.beginPath();ctx.arc(895,270,54*pulse,0,Math.PI*2);ctx.fill();
      for(let i=0;i<8;i++){const a=now/350+i*Math.PI/4;ctx.fillStyle="rgba(170,220,255,"+alpha+")";ctx.fillRect(895+Math.cos(a)*60-2,270+Math.sin(a)*60-2,4,4);}
    }else if(effect.type==="rift"){
      ctx.strokeStyle="rgba(190,135,255,"+(0.95*alpha)+")";ctx.lineWidth=9;
      ctx.shadowColor="#B99AE8";ctx.shadowBlur=24;ctx.beginPath();
      pathPoints.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
      ctx.shadowBlur=0;
      pathPoints.forEach((p,i)=>{const radius=9+Math.sin(now/70+i)*4;ctx.fillStyle="rgba(216,192,255,"+alpha+")";ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();});
      ctx.strokeStyle="rgba(238,220,255,"+alpha+")";ctx.lineWidth=2;
      for(let i=0;i<5;i++){const p=pathPoints[(Math.floor(now/130)+i)%pathPoints.length];ctx.beginPath();ctx.arc(p.x,p.y,16+i*5,0,Math.PI*2);ctx.stroke();}
    }else if(effect.type==="mark"&&effect.target){
      const radius=30+Math.sin(now/75)*7;
      ctx.strokeStyle="#F0D58A";ctx.lineWidth=4;ctx.shadowColor="#F0D58A";ctx.shadowBlur=18;
      ctx.beginPath();ctx.arc(effect.target.x,effect.target.y,radius,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(effect.target.x-19,effect.target.y);ctx.lineTo(effect.target.x+19,effect.target.y);ctx.moveTo(effect.target.x,effect.target.y-19);ctx.lineTo(effect.target.x,effect.target.y+19);ctx.stroke();
    }else if(effect.type==="gold"){
      ctx.textAlign="center";ctx.font="bold 28px Georgia";ctx.fillStyle="rgba(255,225,150,"+alpha+")";ctx.shadowColor="#F0D58A";ctx.shadowBlur=18;ctx.fillText("+125 GOLD",895,190-progress*55);
      for(let i=0;i<14;i++){const angle=now/180+i*Math.PI*2/14;const radius=25+progress*60;const x=895+Math.cos(angle)*radius,y=270+Math.sin(angle)*radius;ctx.fillStyle="#F0D58A";ctx.beginPath();ctx.arc(x,y,3+Math.sin(now/70+i)*1.5,0,Math.PI*2);ctx.fill();}
    }else if(effect.type==="inferno"){
      currentRun.enemies.forEach((enemy,i)=>{const radius=22+Math.sin(now/65+i)*7;ctx.fillStyle="rgba(255,104,35,"+(0.32*alpha)+")";ctx.beginPath();ctx.arc(enemy.x,enemy.y,radius,0,Math.PI*2);ctx.fill();ctx.strokeStyle="rgba(255,207,112,"+(0.95*alpha)+")";ctx.lineWidth=3;ctx.stroke();});
    }else if(effect.type==="spirits"){
      const pulse=1+Math.sin(now/90)*.12;
      ctx.strokeStyle="rgba(196,155,255,"+alpha+")";ctx.lineWidth=5;ctx.shadowColor="#B99AE8";ctx.shadowBlur=24;
      ctx.beginPath();ctx.ellipse(895,270,52*pulse,30*pulse,0,0,Math.PI*2);ctx.stroke();
      for(let i=0;i<3;i++){
        const angle=now/210+i*Math.PI*2/3;
        const x=895+Math.cos(angle)*(38+progress*25),y=270+Math.sin(angle)*(24+progress*15);
        ctx.fillStyle="rgba(207,180,255,"+alpha+")";ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle="rgba(245,230,255,"+alpha+")";ctx.lineWidth=2;ctx.stroke();
      }
    }else if(effect.type==="wraith-strike"){
      ctx.strokeStyle="rgba(225,205,255,"+alpha+")";ctx.lineWidth=4;ctx.shadowColor="#B99AE8";ctx.shadowBlur=14;
      ctx.beginPath();ctx.arc(effect.x,effect.y,10+progress*22,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(effect.x-12,effect.y);ctx.lineTo(effect.x+12,effect.y);ctx.moveTo(effect.x,effect.y-12);ctx.lineTo(effect.x,effect.y+12);ctx.stroke();
    }
    ctx.restore();
    return effect.life>0;
  });
}
function drawPlacementPreview(){
  if(!pointerWorld||!currentRun||!selectedTower)return;
  const s=towerTypes[selectedTower];const valid=canBuild(pointerWorld.x,pointerWorld.y,false);
  const range=s.range*(selectedTower==="cannon"?Math.pow(1.25,currentRun.cards.filter(c=>c==="siege").length):1);
  ctx.beginPath();ctx.arc(pointerWorld.x,pointerWorld.y,range,0,Math.PI*2);ctx.fillStyle=valid?"rgba(185,154,232,.09)":"rgba(214,107,117,.09)";ctx.fill();
  ctx.strokeStyle=valid?"rgba(185,154,232,.65)":"rgba(214,107,117,.8)";ctx.lineWidth=2;ctx.stroke();
  ctx.globalAlpha=.65;ctx.fillStyle=valid?s.color:"#D66B75";ctx.fillRect(pointerWorld.x-14,pointerWorld.y-14,28,28);ctx.globalAlpha=1;
}
function getTotalPathLength(){let n=0;for(let i=0;i<pathPoints.length-1;i++)n+=Math.hypot(pathPoints[i+1].x-pathPoints[i].x,pathPoints[i+1].y-pathPoints[i].y);return n;}
const totalPathLength=getTotalPathLength();
function getPathPosition(progress){
  let d=progress*totalPathLength;for(let i=0;i<pathPoints.length-1;i++){const a=pathPoints[i],b=pathPoints[i+1],len=Math.hypot(b.x-a.x,b.y-a.y);if(d<=len){const t=d/len;return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}d-=len;}return pathPoints[pathPoints.length-1];
}
function createWaveQueue(wave){
  if(currentRun.area===3&&currentRun.campsite===2&&currentRun.stage===3&&wave===5)return ["treant"];
  const count=5+wave*2+(currentRun.area-1)*3,queue=[];
  for(let i=0;i<count;i++){
    if(currentRun.area>=2&&wave>=3&&i%4===0)queue.push("brute");
    else if(wave>=2&&i%5===2)queue.push("riftwing");
    else if(wave>=3&&i%4===0)queue.push("brute");
    else queue.push("riftling");
  }return queue;
}
function startWave(automatic=false){
  if(!currentRun||currentRun.gameOver||currentRun.currentWave>=5)return;
  if(currentRun.waveActive&&!automatic)return;
  currentRun.currentWave++;
  currentRun.waveActive=true;
  currentRun.waitingForWave=false;
  currentRun.waveStarted=true;
  currentRun.spawnBatches.push({wave:currentRun.currentWave,queue:createWaveQueue(currentRun.currentWave),timer:0});
  currentRun.waveIntervalTimer=currentRun.currentWave<5?10:0;
  const total=((currentRun.campsite-1)*3+(currentRun.stage-1))*5+currentRun.currentWave;
  if(currentRun.area===3&&currentRun.campsite===2&&currentRun.stage===3&&currentRun.currentWave===5){
    setWaveStatus("AREA BOSS");
    showBattleMessage("THE ANCIENT TREANT HAS AWAKENED!");
  }else{
    setWaveStatus("WAVE "+total+" / 30 IN PROGRESS");
    showBattleMessage("WAVE "+total+" HAS BEGUN");
  }
  updateGameDisplay();
  persistRunCheckpoint("battle");
}
function spawnEnemy(type,waveNumber){
  const d=enemyTypes[type],difficulty=getSettings().difficulty||"normal";let mult=areaData().enemyScale*(1+waveNumber*.06);
  if(difficulty==="easy")mult*=.8;if(difficulty==="hard")mult*=1.25;
  const health=d.health*mult;currentRun.enemies.push({type,x:pathPoints[0].x,y:pathPoints[0].y,health,maxHealth:health,progress:0,reward:d.reward,damage:d.damage});
}
function updateEnemies(dt){
  currentRun.spawnBatches.forEach(batch=>{
    if(!batch.queue.length)return;
    batch.timer-=dt;
    if(batch.timer<=0){
      spawnEnemy(batch.queue.shift(),batch.wave);
      batch.timer=batch.wave===5&&currentRun.area===3&&currentRun.campsite===2&&currentRun.stage===3?1.2:.85;
    }
  });
  currentRun.spawnBatches=currentRun.spawnBatches.filter(batch=>batch.queue.length>0);
  currentRun.enemies.forEach(e=>{
    if(e.burnTimer>0){
      const burnStep=Math.min(dt,e.burnTimer);
      e.burnTimer-=burnStep;
      e.health-=(e.burnDamage||3)*burnStep;
      if(e.health<=0&&!e.rewarded)damageEnemy(e,0,false);
    }
    if(e.slowTimer>0)e.slowTimer=Math.max(0,e.slowTimer-dt);
    const slowFactor=e.slowTimer>0?.55:1;
    e.progress+=enemyTypes[e.type].speed*slowFactor*dt/totalPathLength;
    const p=getPathPosition(e.progress);e.x=p.x;e.y=p.y;
  });
  currentRun.enemies=currentRun.enemies.filter(e=>{
    if(e.progress>=1){if(!currentRun.devInvincible){const incomingDamage=e.damage*(currentRun.bastionTimer>0?.5:1);currentRun.castleHealth=Math.max(0,currentRun.castleHealth-incomingDamage);}updateGameDisplay();if(currentRun.castleHealth<=0)endGame();return false;}return e.health>0;
  });
}
function updateTowers(dt){
  currentRun.towers.forEach(t=>{
    const s=getTowerStats(t);t.cooldown-=dt;if(t.cooldown>0)return;
    let target=null,best=-1;
    const marked=currentRun.markedTimer>0?currentRun.markedEnemy:null;
    if(marked&&currentRun.enemies.includes(marked)&&Math.hypot(marked.x-t.x,marked.y-t.y)<=s.range)target=marked;
    if(!target)currentRun.enemies.forEach(e=>{if(Math.hypot(e.x-t.x,e.y-t.y)<=s.range&&e.progress>best){best=e.progress;target=e;}});
    if(!target)return;
    const eliteBonus=getRunCommanderId()==="huntmaster"&&target.maxHealth>=150?1.2:1;
    const markedBonus=target===marked?1.6:1;
    currentRun.projectiles.push({x:t.x,y:t.y,target,damage:s.damage*eliteBonus*markedBonus,color:s.color,speed:s.projectileSpeed,towerType:t.type});
    t.cooldown=s.cooldown*(currentRun.bastionTimer>0?.8:1);
  });
}
function damageEnemy(e,dmg,applyPassive=true){
  if(!e||e.rewarded)return;
  e.health-=dmg;
  if(applyPassive&&dmg>0&&getRunCommanderId()==="pyromancer"&&Math.random()<.25)e.burnTimer=Math.max(e.burnTimer||0,3);
  if(e.health<=0&&!e.rewarded){
    e.rewarded=true;
    const cardBonus=currentRun.cards.filter(c=>c==="greed").length*3;
    const commanderBonus=getRunCommanderId()==="treasurer"?2:0;
    currentRun.gold+=e.reward+cardBonus+commanderBonus;
    if(applyPassive&&getRunCommanderId()==="necromancer"&&Math.random()<.2){
      currentRun.spectralAllies.push({life:4,cooldown:0});
      showBattleMessage("SOUL HARVESTED · A SPECTRAL ALLY JOINS THE FIGHT");
    }
    updateGameDisplay();
  }
}
function updateSpectralAllies(dt){
  if(!currentRun.spectralAllies?.length)return;
  const center={x:895,y:270};
  currentRun.spectralAllies=currentRun.spectralAllies.filter((ally,index)=>{
    ally.life-=dt;
    ally.cooldown=Math.max(0,(ally.cooldown||0)-dt);
    ally.orbitAngle=(ally.orbitAngle||index*Math.PI*2/3)+dt*(ally.attacking?.35:1.25);
    const target=currentRun.enemies
      .filter(enemy=>!enemy.rewarded&&enemy.health>0)
      .sort((a,b)=>Math.hypot(a.x-ally.x,a.y-ally.y)-Math.hypot(b.x-ally.x,b.y-ally.y))[0];
    let destination;
    if(target){
      destination={x:target.x,y:target.y-13};
      ally.target=target;
    }else{
      ally.target=null;
      destination={x:center.x+Math.cos(ally.orbitAngle)*42,y:center.y+Math.sin(ally.orbitAngle)*30};
    }
    const dx=destination.x-ally.x,dy=destination.y-ally.y,distance=Math.hypot(dx,dy);
    const speed=target?245:125;
    if(distance>2){
      const step=Math.min(distance,speed*dt);
      ally.x+=dx/distance*step;ally.y+=dy/distance*step;
    }
    ally.attacking=Math.max(0,(ally.attacking||0)-dt);
    if(target&&Math.hypot(target.x-ally.x,target.y-ally.y)<25&&ally.cooldown<=0){
      damageEnemy(target,ally.damage||18,false);
      ally.cooldown=ally.interval||.85;
      ally.attacking=.22;
      currentRun.abilityEffects.push({type:"wraith-strike",life:.28,duration:.28,x:target.x,y:target.y});
    }
    return ally.life>0;
  });
}
function updateCommanderAbilityState(dt){
  if(!currentRun)return;
  currentRun.abilityCooldown=Math.max(0,(currentRun.abilityCooldown||0)-dt);
  currentRun.bastionTimer=Math.max(0,(currentRun.bastionTimer||0)-dt);
  currentRun.markedTimer=Math.max(0,(currentRun.markedTimer||0)-dt);
  if(currentRun.markedTimer<=0)currentRun.markedEnemy=null;
  currentRun.abilityEffects=(currentRun.abilityEffects||[]).filter(effect=>(effect.life-=dt)>0);
  updateCommanderAbilityButton();
}
function updateCommanderAbilityButton(){
  const button=document.getElementById("commander-ability-button");
  const name=document.getElementById("commander-ability-name");
  const status=document.getElementById("commander-ability-cooldown");
  if(!button||!currentRun)return;
  const ability=commanderAbilities[getRunCommanderId()]||commanderAbilities.warden;
  if(name)name.textContent=ability.name;
  const cooldown=Math.ceil(currentRun.abilityCooldown||0);
  if(status)status.textContent=cooldown>0?"COOLDOWN · "+cooldown+"s":"READY · Q";
  const needsEnemies=ability.requiresEnemies&&!currentRun.enemies.some(enemy=>enemy.health>0&&!enemy.rewarded);
  button.disabled=!!currentRun.gameOver||cooldown>0||needsEnemies;
  button.setAttribute("aria-label",ability.name+". "+(cooldown>0?"Cooldown "+cooldown+" seconds":needsEnemies?"Waiting for enemies":"Ready. Press Q to activate"));
}
function activateCommanderAbility(){
  if(!currentRun||currentRun.gameOver)return;
  const id=getRunCommanderId(),ability=commanderAbilities[id]||commanderAbilities.warden;
  if((currentRun.abilityCooldown||0)>0)return;
  const enemies=currentRun.enemies.filter(enemy=>enemy.health>0&&!enemy.rewarded);
  if(ability.requiresEnemies&&!enemies.length){showBattleMessage("WAIT FOR ENEMIES BEFORE USING "+ability.name);return;}
  let effect=null;
  if(id==="warden"){
    currentRun.bastionTimer=12;
    effect={type:"bastion",life:2.6,duration:2.6};
    showBattleMessage("IRON BASTION · THE FORTRESS IS WARDED");
  }else if(id==="arcanist"){
    enemies.forEach(enemy=>{enemy.slowTimer=Math.max(enemy.slowTimer||0,5);damageEnemy(enemy,120,false);});
    effect={type:"rift",life:2.1,duration:2.1};
    showBattleMessage("RIFT SURGE · ARCANE ENERGY TEARS THROUGH THE ENEMY");
  }else if(id==="huntmaster"){
    const elites=enemies.filter(enemy=>enemy.maxHealth>=150);
    const candidates=elites.length?elites:enemies;
    const target=candidates.sort((a,b)=>b.progress-a.progress)[0];
    currentRun.markedEnemy=target;currentRun.markedTimer=10;
    effect={type:"mark",target,life:1.8,duration:1.8};
    showBattleMessage("MARKED PREY · ALL TOWERS HUNT THE TARGET");
  }else if(id==="treasurer"){
    currentRun.gold+=125;
    effect={type:"gold",life:2.1,duration:2.1};
    showBattleMessage("ROYAL DECREE · 125 GOLD HAS BEEN GRANTED");
    updateGameDisplay();
  }else if(id==="pyromancer"){
    enemies.forEach(enemy=>{enemy.burnTimer=Math.max(enemy.burnTimer||0,5);enemy.burnDamage=6;damageEnemy(enemy,65,false);});
    effect={type:"inferno",life:3,duration:3};
    showBattleMessage("INFERNO · THE BATTLEFIELD ERUPTS IN FLAME");
  }else if(id==="necromancer"){
    for(let i=0;i<3;i++){
      const angle=i*Math.PI*2/3;
      currentRun.spectralAllies.push({life:12,cooldown:.35+i*.18,damage:18,interval:.85,
        x:895+Math.cos(angle)*24,y:270+Math.sin(angle)*18,orbitAngle:angle,attacking:0});
    }
    effect={type:"spirits",life:2.8,duration:2.8};
    showBattleMessage("RAISE THE FALLEN · THREE WRAITHS JOIN THE BATTLE");
  }
  if(effect)currentRun.abilityEffects.push(effect);
  currentRun.abilityCooldown=ability.cooldown;
  updateCommanderAbilityButton();
  updateGameDisplay();
  persistRunCheckpoint("battle");
}
function updateCommanderHud(){
  const hud=document.getElementById("commander-combat-hud");
  if(!hud||!currentRun)return;
  const details={
    warden:["THE WARDEN","FORTIFIED DEFENCES · +20 STARTING CASTLE HP"],
    arcanist:["THE ARCANIST","ARCANE MASTERY · +25% WIZARD TOWER DAMAGE"],
    huntmaster:["THE HUNTMASTER","PREDATOR'S INSTINCT · +20% DAMAGE TO ELITES"],
    treasurer:["THE TREASURER","GOLDEN FORTUNE · +2 GOLD PER DEFEAT"],
    pyromancer:["THE PYROMANCER","ETERNAL FLAME · 25% CHANCE TO BURN ON HIT"],
    necromancer:["THE NECROMANCER","SOUL HARVEST · 20% CHANCE TO SUMMON A SPECTRAL ALLY"]
  };
  const entry=details[getRunCommanderId()]||details.warden;
  hud.innerHTML="<strong>"+entry[0]+"</strong><span>"+entry[1]+"</span>";
  updateCommanderAbilityButton();
}
function updateProjectiles(dt){
  currentRun.projectiles=currentRun.projectiles.filter(p=>{
    const e=p.target;if(!currentRun.enemies.includes(e)||e.health<=0)return false;
    const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy);if(d<=p.speed*dt+8){damageEnemy(e,p.damage);
      if(p.towerType==="cannon")currentRun.enemies.forEach(other=>{if(other!==e&&Math.hypot(other.x-e.x,other.y-e.y)<48)damageEnemy(other,p.damage*.5);});
      return false;
    }p.x+=dx/d*p.speed*dt;p.y+=dy/d*p.speed*dt;return true;
  });currentRun.enemies=currentRun.enemies.filter(e=>e.health>0);
}
function checkWaveCompletion(){
  if(!currentRun.waveActive||currentRun.spawnBatches.length||currentRun.enemies.length)return;
  currentRun.projectiles=[];
  if(currentRun.currentWave>=5){
    currentRun.waveActive=false;
    currentRun.waveIntervalTimer=0;
    updateGameDisplay();
    showCardSelection();
    return;
  }
  const total=((currentRun.campsite-1)*3+(currentRun.stage-1))*5+currentRun.currentWave;
  setWaveStatus("WAVE "+total+" CLEARED · NEXT WAVE IN "+Math.ceil(currentRun.waveIntervalTimer)+"s");
  showBattleMessage("WAVE CLEARED. THE NEXT GROUP IS APPROACHING.");
}
function endGame(){
  if(currentRun.gameOver)return;currentRun.gameOver=true;currentRun.waveActive=false;stopGameLoop();setWaveStatus("DEFEAT");showBattleMessage("THE CASTLE HAS FALLEN");
  document.getElementById("result-eyebrow").textContent="THE FORTRESS HAS FALLEN";document.getElementById("result-title").textContent="DEFEAT";
  document.getElementById("result-description").textContent="You reached area "+currentRun.area+", wave "+currentRun.currentWave+". Your defense has ended.";
  document.getElementById("result-continue").textContent="RETURN TO MENU";document.getElementById("result-continue").dataset.action="menu";document.getElementById("result-overlay").hidden=false;
}
function showCardSelection(){
  pendingCards=[...cardPool].sort(()=>Math.random()-.5).slice(0,3);
  const container=document.getElementById("card-options");container.innerHTML="";
  pendingCards.forEach(card=>{
    const button=document.createElement("button");button.className="reward-card";button.innerHTML=
      '<span class="card-rarity">'+card.rarity+'</span><span class="card-icon">'+card.icon+'</span><strong>'+card.name+'</strong><span class="card-type">'+card.type+'</span><p>'+card.description+'</p><span class="card-pick">CHOOSE CARD</span>';
    button.addEventListener("click",()=>chooseCard(card.id));container.appendChild(button);
  });
  document.getElementById("card-area-label").textContent="AREA 0"+currentRun.area+" · CAMPSITE "+currentRun.campsite+" · STAGE "+currentRun.stage+" CLEARED";
  document.getElementById("card-overlay").hidden=false;stopGameLoop();
}
function chooseCard(id){
  if(!currentRun||!pendingCards.some(c=>c.id===id))return;
  const completedWaves=(currentRun.area-1)*30+(currentRun.campsite-1)*15+(currentRun.stage-1)*5+5;
  currentRun.cards.push(id);
  if(id==="walls"){currentRun.maxCastleHealth+=20;currentRun.castleHealth=Math.min(currentRun.maxCastleHealth,currentRun.castleHealth+20);}
  document.getElementById("card-overlay").hidden=true;
  if(currentRun.stage<3)currentRun.stage++;
  else if(currentRun.campsite<2){currentRun.campsite++;currentRun.stage=1;}
  else if(currentRun.area<3){currentRun.area++;currentRun.campsite=1;currentRun.stage=1;}
  else{currentRun.runFinished=true;showRunCompleteScreen();return;}
  currentRun.currentWave=0;currentRun.enemies=[];currentRun.projectiles=[];currentRun.spawnBatches=[];currentRun.waveActive=false;currentRun.waitingForWave=false;currentRun.waveStarted=false;currentRun.waveIntervalTimer=0;
  selectedTowerEntity=null;selectedTower=null;currentRun.campsiteRestUsed=false;
  document.querySelectorAll(".tower-button").forEach(b=>b.classList.remove("selected"));
  updateAreaLabels();updateGameDisplay();
  persistRunCheckpoint(completedWaves%15===0?"campsite":"battle");
  if(completedWaves%15===0){showCampsiteScreen(completedWaves);return;}
  const next=document.getElementById("progress-overlay");
  document.getElementById("progress-area").textContent="AREA 0"+currentRun.area+" · "+areaData().name.toUpperCase();
  document.getElementById("progress-campsite").textContent="CAMPSITE "+currentRun.campsite+" OF 2";
  document.getElementById("progress-stage").textContent="STAGE "+currentRun.stage+" OF 3";
  document.getElementById("progress-next").textContent=currentRun.stage===1?"Next: Stage 1 begins at this campsite":"Next: Stage "+currentRun.stage+" of Campsite "+currentRun.campsite;
  document.getElementById("progress-wave").textContent="Waves completed in this area: "+(((currentRun.campsite-1)*3+(currentRun.stage-1))*5)+" / 30";
  next.hidden=false;stopGameLoop();
}
function continueFromProgress(){document.getElementById("progress-overlay").hidden=true;setWaveStatus("READY WHEN YOU ARE");showBattleMessage("PREPARE YOUR DEFENSE, THEN PRESS START WAVE");startGameLoop();}
function gameLoop(timestamp){
  if(!gameRunning||!currentRun)return;
  const rawDt=Math.min(Math.max((timestamp-lastFrameTime)/1000,0),.033);
  const dt=rawDt*(currentRun.devGameSpeed||1);
  lastFrameTime=timestamp;
  updateCommanderAbilityState(dt);
  if(currentRun.waveActive){
    updateEnemies(dt);
    updateTowers(dt);
    updateProjectiles(dt);
    updateSpectralAllies(dt);
    if(currentRun.currentWave<5){
      currentRun.waveIntervalTimer-=dt;
      if(currentRun.waveIntervalTimer<=0){
        startWave(true);
      }else if(currentRun.spawnBatches.length||currentRun.enemies.length){
        const total=((currentRun.campsite-1)*3+(currentRun.stage-1))*5+currentRun.currentWave;
        setWaveStatus("WAVE "+total+" ACTIVE · NEXT WAVE IN "+Math.ceil(currentRun.waveIntervalTimer)+"s");
      }
    }
    checkWaveCompletion();
  }
  drawBattlefield();
  if(gameRunning)animationFrame=requestAnimationFrame(gameLoop);
}
function startGameLoop(){stopGameLoop();gameRunning=true;lastFrameTime=performance.now();animationFrame=requestAnimationFrame(gameLoop);}
function stopGameLoop(){gameRunning=false;if(animationFrame!==null){cancelAnimationFrame(animationFrame);animationFrame=null;}}
function isOnPath(x,y){
  for(let i=0;i<pathPoints.length-1;i++){const a=pathPoints[i],b=pathPoints[i+1],dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;let t=((x-a.x)*dx+(y-a.y)*dy)/l;t=Math.max(0,Math.min(1,t));if(Math.hypot(x-(a.x+t*dx),y-(a.y+t*dy))<38)return true;}return false;
}
function canBuild(x,y,checkGold=true){
  if(!Number.isFinite(x)||!Number.isFinite(y))return false;
  if(x<22||x>938||y<22||y>518||isOnPath(x,y)||Math.hypot(x-75,y-270)<62||(x>830&&y>200&&y<340))return false;
  if(treePositions.some(([tx,ty])=>Math.abs(x-tx)<34&&y>ty-46&&y<ty+26))return false;
  if(currentRun.towers.some(t=>Math.hypot(x-t.x,y-t.y)<37))return false;
  return !checkGold||currentRun.gold>=towerTypes[selectedTower].cost;
}
function canvasPoint(e){
  const rect=canvas.getBoundingClientRect();
  // Pointer coordinates must be measured from the canvas drawing area,
  // not its outer border. The CSS border otherwise creates a visible offset.
  const contentLeft=rect.left+canvas.clientLeft;
  const contentTop=rect.top+canvas.clientTop;
  const contentWidth=canvas.clientWidth;
  const contentHeight=canvas.clientHeight;
  if(!contentWidth||!contentHeight)return{x:0,y:0};
  return {
    x:(e.clientX-contentLeft)*(canvas.width/contentWidth),
    y:(e.clientY-contentTop)*(canvas.height/contentHeight)
  };
}
function handleBattlefieldClick(e){
  const p=canvasPoint(e);
  const hit=[...currentRun.towers].reverse().find(t=>Math.abs(p.x-t.x)<=20&&Math.abs(p.y-t.y)<=20);
  if(hit){selectedTowerEntity=hit;selectedTower=null;document.querySelectorAll(".tower-button").forEach(b=>b.classList.remove("selected"));updateTowerPanel();showBattleMessage(towerTypes[hit.type].name.toUpperCase()+" SELECTED");return;}
  if(!selectedTower){selectedTowerEntity=null;updateTowerPanel();return;}
  const type=towerTypes[selectedTower];if(currentRun.gold<type.cost){showBattleMessage("NOT ENOUGH GOLD");return;}
  if(!canBuild(p.x,p.y)){showBattleMessage("THAT LOCATION IS BLOCKED — TRY ANOTHER OPEN AREA");return;}
  currentRun.gold-=type.cost;currentRun.towers.push({type:selectedTower,x:p.x,y:p.y,cooldown:0,level:1,upgrades:{damage:0,range:0,speed:0}});
  updateGameDisplay();persistRunCheckpoint("battle");showBattleMessage(type.name.toUpperCase()+" BUILT");
}
function selectTower(type){
  if(!towerTypes[type])return;selectedTower=type;selectedTowerEntity=null;
  document.querySelectorAll(".tower-button").forEach(b=>b.classList.toggle("selected",b.dataset.tower===type));
  updateTowerPanel();showBattleMessage(type.toUpperCase()+" SELECTED — CLICK AN OPEN AREA TO BUILD");
}
function upgradeSelectedTower(stat){
  const t=selectedTowerEntity;if(!t||!currentRun)return;const s=getTowerStats(t),cost=towerTypes[t.type].upgradeCost+(t.level-1)*45;
  if(t.level>=4){showBattleMessage("THIS TOWER IS FULLY UPGRADED");return;}
  if(currentRun.gold<cost){showBattleMessage("NOT ENOUGH GOLD FOR THIS UPGRADE");return;}
  currentRun.gold-=cost;t.upgrades[stat]=(t.upgrades[stat]||0)+1;t.level++;t.cooldown=0;updateGameDisplay();persistRunCheckpoint("battle");showBattleMessage(towerTypes[t.type].name.toUpperCase()+" UPGRADED");
}
function updateTowerPanel(){
  const panel=document.getElementById("tower-info-panel");if(!panel)return;
  if(!selectedTowerEntity){panel.innerHTML='<div class="tower-panel-empty"><span class="panel-symbol">✧</span><strong> TOWER DETAILS</strong><p>Select a placed tower to view its statistics and upgrades. Select a tower below to build.</p></div>';return;}
  const t=selectedTowerEntity,s=getTowerStats(t),cost=towerTypes[t.type].upgradeCost+(t.level-1)*45,disabled=t.level>=4||currentRun.gold<cost;
  panel.innerHTML='<div class="tower-panel-heading"><span class="panel-symbol">'+(t.type==="archer"?"♜":t.type==="arcane"?"✧":"◆")+'</span><div><small>LEVEL '+t.level+'</small><strong>'+towerTypes[t.type].name+'</strong></div></div>'+
    '<div class="tower-stat"><span>Damage</span><strong>'+Math.round(s.damage)+'</strong></div>'+
    '<div class="tower-stat"><span>Cooldown</span><strong>'+s.cooldown.toFixed(2)+'s</strong></div>'+
    '<div class="tower-stat"><span>Range</span><strong>'+Math.round(s.range)+' px</strong></div>'+
    '<p class="panel-upgrade-title">UPGRADE · '+cost+' GOLD</p>'+
    '<button class="tower-upgrade-button" '+(disabled?'disabled':'')+' data-upgrade="damage">Increase damage <span>+5 damage</span></button>'+
    '<button class="tower-upgrade-button" '+(disabled?'disabled':'')+' data-upgrade="range">Increase range <span>+15 px</span></button>'+
    '<button class="tower-upgrade-button" '+(disabled?'disabled':'')+' data-upgrade="speed">Faster attacks <span>-0.10s cooldown</span></button>'+
    '<p class="panel-hint">'+(t.level>=4?"MAX LEVEL REACHED":"Each upgrade increases the tower level. Maximum level: 4.")+'</p>';
  panel.querySelectorAll("[data-upgrade]").forEach(b=>b.addEventListener("click",()=>upgradeSelectedTower(b.dataset.upgrade)));
}
canvas.addEventListener("pointermove",e=>{if(!gameScreenIsHidden())pointerWorld=canvasPoint(e);});
canvas.addEventListener("pointerleave",()=>pointerWorld=null);
canvas.addEventListener("pointerdown",e=>{if(!currentRun||currentRun.gameOver||gameScreenIsHidden())return;e.preventDefault();if(e.pointerType!=="mouse"&&canvas.setPointerCapture){try{canvas.setPointerCapture(e.pointerId);}catch(_error){}}handleBattlefieldClick(e);});
canvas.addEventListener("contextmenu",e=>{e.preventDefault();selectedTowerEntity=null;selectedTower=null;document.querySelectorAll(".tower-button").forEach(b=>b.classList.remove("selected"));updateTowerPanel();});
function gameScreenIsHidden(){const s=document.getElementById("game-screen");return !s||s.hidden;}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&& !gameScreenIsHidden()){selectedTowerEntity=null;selectedTower=null;document.querySelectorAll(".tower-button").forEach(b=>b.classList.remove("selected"));updateTowerPanel();}});
document.getElementById("start-wave").addEventListener("click",()=>startWave(false));
document.getElementById("commander-ability-button").addEventListener("click",activateCommanderAbility);
document.addEventListener("keydown",event=>{
  if(event.key.toLowerCase()!=="q"||event.repeat||gameScreenIsHidden())return;
  const target=event.target;
  if(target&&(target.isContentEditable||["INPUT","TEXTAREA","SELECT"].includes(target.tagName)))return;
  event.preventDefault();activateCommanderAbility();
});
document.getElementById("progress-continue").addEventListener("click",continueFromProgress);
document.getElementById("campsite-free-rest").addEventListener("click",restByCampfire);
document.getElementById("campsite-heal").addEventListener("click",healAtCampsite);
document.getElementById("campsite-upgrade").addEventListener("click",upgradeAtCampsite);
document.getElementById("campsite-continue").addEventListener("click",continueFromCampsite);

function updateCampsiteScreen(){
  if(!currentRun)return;
  document.getElementById("campsite-gold").textContent=currentRun.gold;
  document.getElementById("campsite-health").textContent=currentRun.castleHealth+" / "+currentRun.maxCastleHealth;
  document.getElementById("campsite-towers").textContent=currentRun.towers.length;
  document.getElementById("campsite-cards").textContent=currentRun.cards.length;
  document.getElementById("campsite-free-rest").disabled=currentRun.campsiteRestUsed||currentRun.castleHealth>=currentRun.maxCastleHealth;
  document.getElementById("campsite-heal").disabled=currentRun.gold<40||currentRun.castleHealth>=currentRun.maxCastleHealth;
  document.getElementById("campsite-upgrade").disabled=currentRun.gold<75;
}
function restByCampfire(){
  if(!currentRun||currentRun.campsiteRestUsed||currentRun.castleHealth>=currentRun.maxCastleHealth)return;
  currentRun.campsiteRestUsed=true;currentRun.castleHealth=Math.min(currentRun.maxCastleHealth,currentRun.castleHealth+15);updateCampsiteScreen();persistRunCheckpoint("campsite");
}
function healAtCampsite(){
  if(!currentRun||currentRun.gold<40||currentRun.castleHealth>=currentRun.maxCastleHealth)return;
  currentRun.gold-=40;currentRun.castleHealth=Math.min(currentRun.maxCastleHealth,currentRun.castleHealth+30);updateCampsiteScreen();persistRunCheckpoint("campsite");
}
function upgradeAtCampsite(){
  if(!currentRun||currentRun.gold<75)return;
  currentRun.gold-=75;currentRun.towerDamageBonus+=5;updateCampsiteScreen();persistRunCheckpoint("campsite");
}
function showCampsiteScreen(completedWaves){
  stopGameLoop();
  document.getElementById("main-menu").style.display="none";
  document.getElementById("preparation-screen").hidden=true;
  document.getElementById("game-screen").hidden=true;
  document.getElementById("campsite-screen").hidden=false;
  document.getElementById("result-overlay").hidden=true;
  document.getElementById("campsite-checkpoint").textContent=completedWaves+" WAVES SURVIVED · AREA "+String(currentRun.area).padStart(2,"0");
  document.getElementById("campsite-title").textContent="REST STOP "+String(Math.ceil(completedWaves/15)).padStart(2,"0")+" · "+areaData().name.toUpperCase();
  document.getElementById("campsite-description").textContent="The fighting has stopped. Your companions have made camp in a sheltered clearing. No enemies can enter. Rest, tend to the fortress, and prepare for the next stretch.";
  document.getElementById("campsite-next-title").textContent="NEXT: AREA "+String(currentRun.area).padStart(2,"0")+" · CAMPSITE "+currentRun.campsite+" · STAGE "+currentRun.stage;
  document.getElementById("campsite-next-copy").textContent="Your next 15-wave stretch is waiting. Continue whenever you're ready.";
  updateCampsiteScreen();
}
function continueFromCampsite(){
  document.getElementById("campsite-screen").hidden=true;
  document.getElementById("game-screen").hidden=false;
  updateGameDisplay();
  persistRunCheckpoint("battle");
  setWaveStatus("READY WHEN YOU ARE");
  showBattleMessage("YOU ARE RESTED. PREPARE YOUR DEFENSE, THEN START THE NEXT WAVE.");
  startGameLoop();
}
function showRunCompleteScreen(){
  stopGameLoop();
  document.getElementById("main-menu").style.display="none";
  document.getElementById("preparation-screen").hidden=true;
  document.getElementById("game-screen").hidden=true;
  document.getElementById("campsite-screen").hidden=true;
  document.getElementById("card-overlay").hidden=true;
  document.getElementById("progress-overlay").hidden=true;
  document.getElementById("result-eyebrow").textContent="THE RIFT HAS BEEN SEALED";
  document.getElementById("result-title").textContent="EXPEDITION COMPLETE";
  document.getElementById("result-description").textContent="You survived all 90 waves across the three areas. The fortress stands, and the realms are safe — for now.";
  document.getElementById("result-continue").textContent="RETURN TO MENU";
  document.getElementById("result-overlay").hidden=false;
}
function updatePreparationArea(){document.getElementById("preparation-screen").querySelector(".prep-eyebrow").textContent="YOUR NEXT EXPEDITION · AREA 01";document.querySelector(".region-details span").textContent="30 WAVES · 2 CAMPSITES";}
