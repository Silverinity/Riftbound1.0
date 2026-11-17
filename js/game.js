/* RIFTBOUND - AREA, CARD AND TOWER GAMEPLAY UPDATE */
let currentRun = null;
let selectedTower = "archer";
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
  {id:"arrows",name:"Sharpened Arrows",rarity:"COMMON",type:"TOWER",description:"Archer Tower damage increased by 20%.",icon:"➶"},
  {id:"arcane",name:"Arcane Knowledge",rarity:"RARE",type:"TOWER",description:"Wizard Tower damage increased by 25%.",icon:"✧"},
  {id:"siege",name:"Siege Engineering",rarity:"RARE",type:"TOWER",description:"Cannon Tower range increased by 25%.",icon:"◆"},
  {id:"greed",name:"Greedy Kingdom",rarity:"COMMON",type:"ECONOMY",description:"Earn 15% more gold from defeated enemies.",icon:"♜"},
  {id:"walls",name:"Reinforced Walls",rarity:"RARE",type:"DEFENSE",description:"Increase maximum castle HP by 20 and restore 20 HP.",icon:"⬟"}
];

function createNewRun(){
  return {
    gold:100,castleHealth:100,maxCastleHealth:100,area:1,currentWave:0,totalWaves:5,
    towers:[{type:"archer",x:330,y:75,cooldown:0,level:1,upgrades:{damage:0,range:0,speed:0}}],
    enemies:[],projectiles:[],spawnQueue:[],waveActive:false,gameOver:false,
    towerDamageBonus:0,cards:[],nextWaveTimer:15,waitingForWave:true,runFinished:false
  };
}
function startNewRun(){
  stopGameLoop();currentRun=createNewRun();selectedTower="archer";selectedTowerEntity=null;
  document.querySelectorAll(".tower-button").forEach(b=>b.classList.toggle("selected",b.dataset.tower==="archer"));
  updateGameDisplay();
}
function areaData(){return areas[currentRun.area-1]||areas[0];}
function updateAreaLabels(){
  const a=areaData();
  document.querySelector(".battle-region span").textContent="AREA 0"+currentRun.area+" · "+a.name.toUpperCase();
  document.querySelector(".battle-region h1").textContent=a.subtitle.toUpperCase();
  document.querySelector(".region-heading .prep-eyebrow").textContent="AREA 0"+currentRun.area;
  document.querySelector(".region-heading h2").textContent=a.name.toUpperCase();
  document.querySelector(".region-details span").textContent="5 WAVES";
}
function initBattlefield(){
  if(!currentRun)startNewRun();
  stopGameLoop();selectedTowerEntity=null;updateAreaLabels();updateGameDisplay();drawBattlefield();
  setWaveStatus("NEXT WAVE IN 15");showBattleMessage("BUILD YOUR DEFENSE — THE FIRST WAVE ARRIVES IN 15 SECONDS");
  currentRun.waitingForWave=true;currentRun.nextWaveTimer=15;startGameLoop();
}
function updateGameDisplay(){
  if(!currentRun)return;
  document.getElementById("gold-display").textContent=Math.floor(currentRun.gold);
  document.getElementById("health-display").textContent=currentRun.castleHealth+" / "+currentRun.maxCastleHealth;
  document.getElementById("wave-display").textContent=currentRun.currentWave+" / 5";
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
  let damage=base.damage*Math.pow(1.22,u.damage||0);
  let range=base.range*Math.pow(1.15,u.range||0);
  let fireRate=base.fireRate*Math.pow(1.18,u.speed||0);
  if(t.type==="archer")damage*=1+(currentRun.cards.filter(c=>c==="arrows").length*.2);
  if(t.type==="arcane")damage*=1+(currentRun.cards.filter(c=>c==="arcane").length*.25);
  if(t.type==="cannon")range*=Math.pow(1.25,currentRun.cards.filter(c=>c==="siege").length);
  damage+=currentRun.towerDamageBonus;
  return {...base,damage,range,fireRate,cooldown:1/fireRate};
}
function drawBattlefield(){
  ctx.fillStyle="#263B2B";ctx.fillRect(0,0,960,540);drawGroundTexture();drawPath();drawTrees();drawPortal();drawCastle();drawTowers();drawEnemies();drawProjectiles();drawPlacementPreview();
}
function drawGroundTexture(){
  for(let x=0;x<960;x+=32)for(let y=0;y<540;y+=32){const v=(x*7+y*13)%5;if(v===0){ctx.fillStyle="#304632";ctx.fillRect(x,y,16,16);}else if(v===1){ctx.fillStyle="#203326";ctx.fillRect(x+12,y+8,12,12);}}
}
function drawPath(){
  ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();pathPoints.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
  ctx.strokeStyle="#382C29";ctx.lineWidth=68;ctx.stroke();ctx.strokeStyle="#776047";ctx.lineWidth=54;ctx.stroke();
  ctx.strokeStyle="#9B8060";ctx.lineWidth=2;ctx.setLineDash([12,15]);ctx.stroke();ctx.setLineDash([]);
}
function drawTrees(){
  [[70,70],[145,90],[90,170],[330,55],[390,65],[520,70],[610,90],[780,75],[900,80],[100,390],[150,465],[320,470],[540,490],[800,450],[900,400],[560,230],[820,170],[350,330],[110,330],[760,340],[920,180]].forEach(([x,y])=>{
    ctx.fillStyle="#17251B";ctx.fillRect(x-15,y-12,38,34);ctx.fillStyle="#152C20";ctx.fillRect(x-18,y-25,36,35);
    ctx.fillStyle="#315438";ctx.fillRect(x-12,y-30,25,25);ctx.fillStyle="#426443";ctx.fillRect(x-5,y-25,12,12);ctx.fillStyle="#64472F";ctx.fillRect(x-5,y+5,10,15);
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
function drawPlacementPreview(){
  if(!pointerWorld||!currentRun||!selectedTower)return;
  const s=towerTypes[selectedTower];const valid=canBuild(pointerWorld.x,pointerWorld.y,false);
  ctx.beginPath();ctx.arc(pointerWorld.x,pointerWorld.y,s.range,0,Math.PI*2);ctx.fillStyle=valid?"rgba(185,154,232,.09)":"rgba(214,107,117,.09)";ctx.fill();
  ctx.strokeStyle=valid?"rgba(185,154,232,.65)":"rgba(214,107,117,.8)";ctx.lineWidth=2;ctx.stroke();
  ctx.globalAlpha=.65;ctx.fillStyle=valid?s.color:"#D66B75";ctx.fillRect(pointerWorld.x-14,pointerWorld.y-14,28,28);ctx.globalAlpha=1;
}
function getTotalPathLength(){let n=0;for(let i=0;i<pathPoints.length-1;i++)n+=Math.hypot(pathPoints[i+1].x-pathPoints[i].x,pathPoints[i+1].y-pathPoints[i].y);return n;}
const totalPathLength=getTotalPathLength();
function getPathPosition(progress){
  let d=progress*totalPathLength;for(let i=0;i<pathPoints.length-1;i++){const a=pathPoints[i],b=pathPoints[i+1],len=Math.hypot(b.x-a.x,b.y-a.y);if(d<=len){const t=d/len;return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}d-=len;}return pathPoints[pathPoints.length-1];
}
function createWaveQueue(wave){
  if(currentRun.area===3&&wave===5)return ["treant"];
  const count=5+wave*2+(currentRun.area-1)*3,queue=[];
  for(let i=0;i<count;i++){
    if(currentRun.area>=2&&wave>=3&&i%4===0)queue.push("brute");
    else if(wave>=2&&i%5===2)queue.push("riftwing");
    else if(wave>=3&&i%4===0)queue.push("brute");
    else queue.push("riftling");
  }return queue;
}
function startWave(){
  if(!currentRun||currentRun.waveActive||currentRun.gameOver||currentRun.currentWave>=5)return;
  currentRun.currentWave++;currentRun.waveActive=true;currentRun.waitingForWave=false;currentRun.spawnQueue=createWaveQueue(currentRun.currentWave);currentRun.enemies=[];currentRun.projectiles=[];spawnTimer=0;
  if(currentRun.area===3&&currentRun.currentWave===5){setWaveStatus("AREA BOSS");showBattleMessage("THE ANCIENT TREANT HAS AWAKENED!");}
  else{setWaveStatus("WAVE "+currentRun.currentWave+" IN PROGRESS");showBattleMessage("WAVE "+currentRun.currentWave+" HAS BEGUN");}
  updateGameDisplay();
}
function spawnEnemy(type){
  const d=enemyTypes[type],difficulty=getSettings().difficulty||"normal";let mult=areaData().enemyScale*(1+currentRun.currentWave*.06);
  if(difficulty==="easy")mult*=.8;if(difficulty==="hard")mult*=1.25;
  const health=d.health*mult;currentRun.enemies.push({type,x:pathPoints[0].x,y:pathPoints[0].y,health,maxHealth:health,progress:0,reward:d.reward,damage:d.damage});
}
function updateEnemies(dt){
  if(currentRun.waveActive&&currentRun.spawnQueue.length){spawnTimer-=dt;if(spawnTimer<=0){spawnEnemy(currentRun.spawnQueue.shift());spawnTimer=currentRun.currentWave===5&&currentRun.area===3?1.2:.85;}}
  currentRun.enemies.forEach(e=>{e.progress+=enemyTypes[e.type].speed*dt/totalPathLength;const p=getPathPosition(e.progress);e.x=p.x;e.y=p.y;});
  currentRun.enemies=currentRun.enemies.filter(e=>{
    if(e.progress>=1){currentRun.castleHealth=Math.max(0,currentRun.castleHealth-e.damage);updateGameDisplay();if(currentRun.castleHealth<=0)endGame();return false;}return e.health>0;
  });
}
function updateTowers(dt){
  currentRun.towers.forEach(t=>{
    const s=getTowerStats(t);t.cooldown-=dt;if(t.cooldown>0)return;
    let target=null,best=-1;currentRun.enemies.forEach(e=>{if(Math.hypot(e.x-t.x,e.y-t.y)<=s.range&&e.progress>best){best=e.progress;target=e;}});
    if(!target)return;currentRun.projectiles.push({x:t.x,y:t.y,target,damage:s.damage,color:s.color,speed:s.projectileSpeed,towerType:t.type});t.cooldown=s.cooldown;
  });
}
function damageEnemy(e,dmg){
  e.health-=dmg;if(e.health<=0&&!e.rewarded){e.rewarded=true;let bonus=1+currentRun.cards.filter(c=>c==="greed").length*.15;currentRun.gold+=Math.round(e.reward*bonus);updateGameDisplay();}
}
function updateProjectiles(dt){
  currentRun.projectiles=currentRun.projectiles.filter(p=>{
    const e=p.target;if(!currentRun.enemies.includes(e)||e.health<=0)return false;
    const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy);if(d<9){damageEnemy(e,p.damage);
      if(p.towerType==="cannon")currentRun.enemies.forEach(other=>{if(other!==e&&Math.hypot(other.x-e.x,other.y-e.y)<48)damageEnemy(other,p.damage*.5);});
      return false;
    }p.x+=dx/d*p.speed*dt;p.y+=dy/d*p.speed*dt;return true;
  });currentRun.enemies=currentRun.enemies.filter(e=>e.health>0);
}
function checkWaveCompletion(){
  if(!currentRun.waveActive||currentRun.spawnQueue.length||currentRun.enemies.length)return;
  currentRun.waveActive=false;currentRun.projectiles=[];updateGameDisplay();
  if(currentRun.currentWave===5){showCardSelection();return;}
  currentRun.waitingForWave=true;currentRun.nextWaveTimer=15;setWaveStatus("NEXT WAVE IN 15");showBattleMessage("WAVE CLEARED — NEXT WAVE STARTS AUTOMATICALLY IN 15 SECONDS");
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
  document.getElementById("card-area-label").textContent="AREA 0"+currentRun.area+" CLEARED";
  document.getElementById("card-overlay").hidden=false;stopGameLoop();
}
function chooseCard(id){
  if(!currentRun||!pendingCards.some(c=>c.id===id))return;
  currentRun.cards.push(id);
  if(id==="walls"){currentRun.maxCastleHealth+=20;currentRun.castleHealth=Math.min(currentRun.maxCastleHealth,currentRun.castleHealth+20);}
  document.getElementById("card-overlay").hidden=true;
  if(currentRun.area<3){
    currentRun.area++;currentRun.currentWave=0;currentRun.enemies=[];currentRun.projectiles=[];currentRun.spawnQueue=[];
    currentRun.waitingForWave=true;currentRun.nextWaveTimer=15;selectedTowerEntity=null;updateAreaLabels();updateGameDisplay();
    setWaveStatus("NEXT WAVE IN 15");showBattleMessage("WELCOME TO "+areaData().name.toUpperCase()+" — BUILD YOUR DEFENSE");
    startGameLoop();
  }else{
    currentRun.runFinished=true;showRestScreen();
  }
}
function gameLoop(timestamp){
  if(!gameRunning||!currentRun)return;const dt=Math.min(Math.max((timestamp-lastFrameTime)/1000,0),.033);lastFrameTime=timestamp;
  if(currentRun.waitingForWave&&!currentRun.waveActive&&!currentRun.gameOver){
    currentRun.nextWaveTimer-=dt;const left=Math.max(0,Math.ceil(currentRun.nextWaveTimer));setWaveStatus("NEXT WAVE IN "+left);
    if(currentRun.nextWaveTimer<=0)startWave();
  }
  if(currentRun.waveActive){updateEnemies(dt);updateTowers(dt);updateProjectiles(dt);checkWaveCompletion();}
  drawBattlefield();if(gameRunning)animationFrame=requestAnimationFrame(gameLoop);
}
function startGameLoop(){stopGameLoop();gameRunning=true;lastFrameTime=performance.now();animationFrame=requestAnimationFrame(gameLoop);}
function stopGameLoop(){gameRunning=false;if(animationFrame!==null){cancelAnimationFrame(animationFrame);animationFrame=null;}}
function isOnPath(x,y){
  for(let i=0;i<pathPoints.length-1;i++){const a=pathPoints[i],b=pathPoints[i+1],dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;let t=((x-a.x)*dx+(y-a.y)*dy)/l;t=Math.max(0,Math.min(1,t));if(Math.hypot(x-(a.x+t*dx),y-(a.y+t*dy))<38)return true;}return false;
}
function canBuild(x,y,checkGold=true){
  if(x<22||x>938||y<22||y>518||isOnPath(x,y)||Math.hypot(x-75,y-270)<62||(x>830&&y>200&&y<340))return false;
  if(currentRun.towers.some(t=>Math.hypot(x-t.x,y-t.y)<37))return false;
  return !checkGold||currentRun.gold>=towerTypes[selectedTower].cost;
}
function canvasPoint(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};}
function handleBattlefieldClick(e){
  const p=canvasPoint(e);
  const hit=[...currentRun.towers].reverse().find(t=>Math.abs(p.x-t.x)<=20&&Math.abs(p.y-t.y)<=20);
  if(hit){selectedTowerEntity=hit;selectedTower=null;document.querySelectorAll(".tower-button").forEach(b=>b.classList.remove("selected"));updateTowerPanel();showBattleMessage(towerTypes[hit.type].name.toUpperCase()+" SELECTED");return;}
  if(!selectedTower){selectedTowerEntity=null;updateTowerPanel();return;}
  const type=towerTypes[selectedTower];if(currentRun.gold<type.cost){showBattleMessage("NOT ENOUGH GOLD");return;}
  if(!canBuild(p.x,p.y)){showBattleMessage("THAT LOCATION IS BLOCKED — TRY ANOTHER OPEN AREA");return;}
  currentRun.gold-=type.cost;currentRun.towers.push({type:selectedTower,x:p.x,y:p.y,cooldown:0,level:1,upgrades:{damage:0,range:0,speed:0}});
  updateGameDisplay();showBattleMessage(type.name.toUpperCase()+" BUILT");
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
  currentRun.gold-=cost;t.upgrades[stat]=(t.upgrades[stat]||0)+1;t.level++;t.cooldown=0;updateGameDisplay();showBattleMessage(towerTypes[t.type].name.toUpperCase()+" UPGRADED");
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
    '<button class="tower-upgrade-button" '+(disabled?'disabled':'')+' data-upgrade="damage">Increase damage <span>+22%</span></button>'+
    '<button class="tower-upgrade-button" '+(disabled?'disabled':'')+' data-upgrade="range">Increase range <span>+15%</span></button>'+
    '<button class="tower-upgrade-button" '+(disabled?'disabled':'')+' data-upgrade="speed">Faster attacks <span>+18%</span></button>'+
    '<p class="panel-hint">'+(t.level>=4?"MAX LEVEL REACHED":"Each upgrade increases the tower level. Maximum level: 4.")+'</p>';
  panel.querySelectorAll("[data-upgrade]").forEach(b=>b.addEventListener("click",()=>upgradeSelectedTower(b.dataset.upgrade)));
}
canvas.addEventListener("pointermove",e=>{if(!gameScreenIsHidden())pointerWorld=canvasPoint(e);});
canvas.addEventListener("pointerleave",()=>pointerWorld=null);
canvas.addEventListener("pointerdown",e=>{if(!currentRun||currentRun.gameOver||gameScreenIsHidden())return;e.preventDefault();handleBattlefieldClick(e);});
canvas.addEventListener("contextmenu",e=>{e.preventDefault();selectedTowerEntity=null;selectedTower=null;document.querySelectorAll(".tower-button").forEach(b=>b.classList.remove("selected"));updateTowerPanel();});
function gameScreenIsHidden(){const s=document.getElementById("game-screen");return !s||s.hidden;}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&& !gameScreenIsHidden()){selectedTowerEntity=null;selectedTower=null;document.querySelectorAll(".tower-button").forEach(b=>b.classList.remove("selected"));updateTowerPanel();}});
function updateRestScreen(){
  if(!currentRun)return;document.getElementById("rest-gold").textContent=currentRun.gold;
  document.getElementById("rest-health").textContent=currentRun.castleHealth+" / "+currentRun.maxCastleHealth;
  document.getElementById("rest-towers").textContent=currentRun.towers.length;
  document.getElementById("rest-heal").disabled=currentRun.gold<40||currentRun.castleHealth>=currentRun.maxCastleHealth;
  document.getElementById("rest-upgrade").disabled=currentRun.gold<75;
}
function healAtRestSite(){if(currentRun.gold<40||currentRun.castleHealth>=currentRun.maxCastleHealth)return;currentRun.gold-=40;currentRun.castleHealth=Math.min(currentRun.maxCastleHealth,currentRun.castleHealth+30);updateRestScreen();}
function upgradeAtRestSite(){if(currentRun.gold<75)return;currentRun.gold-=75;currentRun.towerDamageBonus+=5;updateRestScreen();}
function showRestScreen(){
  stopGameLoop();document.getElementById("main-menu").style.display="none";document.getElementById("preparation-screen").hidden=true;
  document.getElementById("game-screen").hidden=true;document.getElementById("rest-screen").hidden=false;document.getElementById("result-overlay").hidden=true;
  document.getElementById("rest-area-label").textContent="AFTER THREE AREAS · THE OLD WAYSTONE";
  document.getElementById("rest-finish-copy").textContent="You survived all 15 waves across three regions. Your run is complete.";
  updateRestScreen();
}
function hideAllScreens(){
  document.getElementById("main-menu").style.display="none";document.getElementById("preparation-screen").hidden=true;
  document.getElementById("game-screen").hidden=true;document.getElementById("rest-screen").hidden=true;
}
function showMainMenu(){stopGameLoop();hideAllScreens();document.getElementById("main-menu").style.display="flex";document.getElementById("result-overlay").hidden=true;document.getElementById("card-overlay").hidden=true;document.getElementById("settings-overlay").hidden=true;}
function showPreparationScreen(){stopGameLoop();hideAllScreens();document.getElementById("preparation-screen").hidden=false;document.getElementById("result-overlay").hidden=true;}
function updatePreparationArea(){document.getElementById("preparation-screen").querySelector(".prep-eyebrow").textContent="YOUR NEXT EXPEDITION · AREA 01";document.querySelector(".region-details span").textContent="5 WAVES";}
