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
function getSettings(){ return window.riftboundSettings || { towerRanges:false }; }

const canvas = document.getElementById("battlefield");
const ctx = canvas.getContext("2d");

// Illustrated backgrounds for all three areas. Routes and gameplay objects remain separate.
const areaBackgrounds = {
  1: "assets/maps/verdant-reach/background.png",
  2: "assets/maps/ashen-wastes/background.png",
  3: "assets/maps/frostbound-expanse/background.png"
};
const backgroundImages = {};
Object.entries(areaBackgrounds).forEach(([area, source]) => {
  const image = new Image();
  image.onload = () => { if (currentRun && currentRun.area === Number(area)) drawBattlefield(); };
  image.onerror = () => console.warn("Riftbound map background could not be loaded:", source);
  image.src = source;
  backgroundImages[area] = image;
});

// Pixel-art tower sprites. Missing files safely fall back to the original canvas drawings.
const towerSpritePaths = {
  archer: "assets/towers/archer.png",
  arcane: "assets/towers/arcane.png",
  cannon: "assets/towers/cannon.png"
};
const towerSprites = {};
Object.entries(towerSpritePaths).forEach(([type, source]) => {
  const sprite = new Image();
  sprite.onload = () => { if (currentRun) drawBattlefield(); };
  sprite.src = source;
  towerSprites[type] = sprite;
});

// Archer animation sheets use the frame layout declared in assets/towers/archer/animation.json.
// The JSON describes 96x112 frames, 8 frames per horizontal sheet.
const archerAnimation = {
  frameWidth: 96,
  frameHeight: 112,
  idle: { frames: 8, fps: 8, loop: true, image: new Image() },
  attack: { frames: 8, fps: 12, loop: false, releaseFrame: 4, image: new Image() },
  arrow: new Image(),
  scaleX: 76 / 96,
  scaleY: 88 / 112
};
archerAnimation.idle.image.src = "assets/towers/archer/archer_idle_sheet.png";
archerAnimation.attack.image.src = "assets/towers/archer/archer_attack_sheet.png";
archerAnimation.arrow.src = "assets/towers/archer/archer_arrow_projectile.png";
[archerAnimation.idle.image, archerAnimation.attack.image, archerAnimation.arrow].forEach(image => {
  image.onload = () => { if (currentRun) drawBattlefield(); };
});

// Arcane Tower animation sheets use the layout in assets/towers/arcane/animation.json.
const arcaneAnimation = {
  frameWidth: 96,
  frameHeight: 112,
  idle: { frames: 8, fps: 8, loop: true, image: new Image() },
  attack: { frames: 8, fps: 12, loop: false, releaseFrame: 4, image: new Image() },
  orb: { frames: 4, fps: 12, loop: true, frameWidth: 16, frameHeight: 16, image: new Image() },
  scaleX: 76 / 96,
  scaleY: 88 / 112,
  projectileOriginX: 47,
  projectileOriginY: 20
};
arcaneAnimation.idle.image.src = "assets/towers/arcane/arcane_idle_sheet.png";
arcaneAnimation.attack.image.src = "assets/towers/arcane/arcane_attack_sheet.png";
arcaneAnimation.orb.image.src = "assets/towers/arcane/arcane_orb_projectile_sheet.png";
[arcaneAnimation.idle.image, arcaneAnimation.attack.image, arcaneAnimation.orb.image].forEach(image => {
  image.onload = () => { if (currentRun) drawBattlefield(); };
});

// Cannon Tower animation sheets and projectile use assets/towers/cannon/.
const cannonAnimation = {
  frameWidth: 96,
  frameHeight: 112,
  idle: { frames: 8, fps: 8, loop: true, image: new Image() },
  attack: { frames: 8, fps: 12, loop: false, releaseFrame: 2, image: new Image() },
  ball: new Image(),
  scaleX: 76 / 96,
  scaleY: 88 / 112,
  projectileOriginX: 65,
  projectileOriginY: 28,
  projectileWidth: 20,
  projectileHeight: 20
};
cannonAnimation.idle.image.src = "assets/towers/cannon/cannon_idle_sheet.png";
cannonAnimation.attack.image.src = "assets/towers/cannon/cannon_attack_sheet.png";
cannonAnimation.ball.src = "assets/towers/cannon/cannon_ball_projectile.png";
[cannonAnimation.idle.image, cannonAnimation.attack.image, cannonAnimation.ball].forEach(image => {
  image.onload = () => { if (currentRun) drawBattlefield(); };
});

// Each realm has its own route. All routes share the same portal and castle endpoints,
// but their bends and tactical build spaces are deliberately different.
const pathsByArea = [
  [
    {x:75,y:270},{x:190,y:270},{x:190,y:115},{x:365,y:115},
    {x:365,y:330},{x:555,y:330},{x:555,y:185},{x:735,y:185},
    {x:735,y:390},{x:850,y:390},{x:850,y:270}
  ],
  [
    {x:75,y:270},{x:190,y:270},{x:190,y:115},{x:365,y:115},
    {x:365,y:330},{x:555,y:330},{x:555,y:185},{x:735,y:185},
    {x:735,y:390},{x:850,y:390},{x:850,y:270}
  ],
  [
    {x:75,y:270},{x:190,y:270},{x:190,y:115},{x:365,y:115},
    {x:365,y:330},{x:555,y:330},{x:555,y:185},{x:735,y:185},
    {x:735,y:390},{x:850,y:390},{x:850,y:270}
  ]
];
const treesByArea = [
  [[65,75],[145,75],[290,65],[420,65],[515,75],[650,70],[820,75],[920,80],[110,445],[285,480],[490,475],[650,475],[910,455],[115,185],[310,220],[470,245],[640,235],[805,225],[900,185]],
  [[145,65],[345,65],[535,65],[735,70],[910,75],[155,475],[340,480],[520,485],[710,485],[910,475],[175,220],[345,245],[530,300],[720,245],[900,185]],
  [[65,70],[145,75],[300,65],[475,65],[650,65],[805,70],[920,80],[115,475],[285,480],[485,480],[650,475],[900,475],[115,180],[315,220],[500,230],[655,205],[805,230],[910,185]]
];
function getAreaIndex(){return Math.max(0,Math.min(2,(currentRun?.area||1)-1));}
function getPathPoints(){
  const points=pathsByArea[getAreaIndex()];
  // Keep the portal and castle endpoints fixed while gently shortening each
  // route toward the centre of the battlefield.
  return points.map((point,index)=>{
    if(index===0||index===points.length-1)return point;
    const loweredY=Math.min(490,point.y+55);
    const compactY=270+(loweredY-270)*.78;
    return {
      x:Math.round(480+(point.x-480)*.90),
      y:Math.round(270+(compactY-270)*.90)
    };
  });
}
function getTreePositions(){return treesByArea[getAreaIndex()];}
const areas = [
  {name:"Verdant Woods",subtitle:"The Last Fortress",boss:"",enemyScale:1},
  {name:"Ashen Wastes",subtitle:"The Scorched Crossing",boss:"",enemyScale:1.3},
  {name:"Frostbound Kingdom",subtitle:"The Frozen Citadel",boss:"",enemyScale:1.65}
];
const destinationPools = [
  [
    {id:"bear-cave",name:"Bear Cave",kind:"ENCOUNTER",icon:"♜",description:"A rugged den filled with heavy beasts and thick hides.",reward:"More gold from brute enemies"},
    {id:"wolf-den",name:"Wolf Den",kind:"ENCOUNTER",icon:"牙",description:"A winding hunting ground where fast packs rush the fortress.",reward:"Swift enemy packs"},
    {id:"goblin-camp",name:"Goblin Camp",kind:"ENCOUNTER",icon:"⚑",description:"A raider camp packed with stubborn scavengers.",reward:"Mixed enemy formations"},
    {id:"hollow-bear",name:"Ursakar, the Hollow Bear",kind:"BOSS",bossId:"hollow-bear",icon:"♞",description:"A colossal guardian awakened by the Rift.",reward:"+Boss gold · bonus class XP"},
    {id:"rift-alpha",name:"Fenrir, the Rift Alpha",kind:"BOSS",bossId:"rift-alpha",icon:"✦",description:"The alpha wolf hunts anything that enters its territory.",reward:"+Boss gold · bonus class XP"}
  ],
  [
    {id:"cinder-quarry",name:"Cinder Quarry",kind:"ENCOUNTER",icon:"◆",description:"A scorched mining route patrolled by iron brutes.",reward:"Armoured enemy groups"},
    {id:"ash-wastes",name:"Ashen Ruins",kind:"ENCOUNTER",icon:"⌂",description:"Collapsed ruins where riftwings circle overhead.",reward:"Fast aerial enemies"},
    {id:"scavenger-crossing",name:"Scavenger Crossing",kind:"ENCOUNTER",icon:"⚑",description:"A dangerous trade road claimed by raiders.",reward:"Mixed enemy formations"},
    {id:"ash-colossus",name:"The Ashen Colossus",kind:"BOSS",bossId:"ash-colossus",icon:"♞",description:"A molten giant rises from the quarry floor.",reward:"+Boss gold · bonus class XP"},
    {id:"goblin-warlord",name:"Goblin Warlord",kind:"BOSS",bossId:"goblin-warlord",icon:"✦",description:"A ruthless war chief commands the largest raiding host.",reward:"+Boss gold · bonus class XP"}
  ],
  [
    {id:"frozen-hollow",name:"Frozen Hollow",kind:"ENCOUNTER",icon:"❄",description:"A frozen cavern haunted by relentless riftlings.",reward:"Dense enemy waves"},
    {id:"wraithwood",name:"Wraithwood",kind:"ENCOUNTER",icon:"♧",description:"A dead forest where spectral creatures gather.",reward:"Elite-heavy formations"},
    {id:"shattered-keep",name:"Shattered Keep",kind:"ENCOUNTER",icon:"♜",description:"The ruins of an ancient fortress now held by the Rift.",reward:"Armoured enemy groups"},
    {id:"frost-wyrm",name:"The Frost Wyrm",kind:"BOSS",bossId:"frost-wyrm",icon:"♞",description:"An ancient dragon coils beneath the glacier.",reward:"+Boss gold · bonus class XP"},
    {id:"riftbound-knight",name:"The Riftbound Knight",kind:"BOSS",bossId:"riftbound-knight",icon:"✦",description:"A fallen champion guards the path to the final realm.",reward:"+Boss gold · bonus class XP"}
  ]
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
  goblin:{name:"Goblin Raider",health:55,speed:55,reward:10,damage:9,color:"#91A85C",size:11},
  treant:{name:"Ancient Treant",health:2000,speed:15,reward:150,damage:35,color:"#83A66C",size:27,boss:true},
  "hollow-bear":{name:"Ursakar, the Hollow Bear",health:1150,speed:13,reward:180,damage:30,color:"#A77B56",size:29,boss:true},
  "rift-alpha":{name:"Fenrir, the Rift Alpha",health:920,speed:29,reward:175,damage:25,color:"#91A7C9",size:26,boss:true},
  "ash-colossus":{name:"The Ashen Colossus",health:1850,speed:12,reward:260,damage:38,color:"#C56D42",size:32,boss:true},
  "goblin-warlord":{name:"Goblin Warlord",health:1350,speed:19,reward:230,damage:34,color:"#8E9A4E",size:29,boss:true},
  "frost-wyrm":{name:"The Frost Wyrm",health:2450,speed:14,reward:360,damage:42,color:"#79B7D5",size:34,boss:true},
  "riftbound-knight":{name:"The Riftbound Knight",health:2100,speed:17,reward:340,damage:39,color:"#9C77C7",size:31,boss:true}
};
const cardPool = [
  {id:"arrows",name:"Sharpened Arrows",rarity:"COMMON",type:"TOWER",description:"Archer Towers deal +5 damage per hit.",icon:"➶"},
  {id:"arcane",name:"Arcane Knowledge",rarity:"RARE",type:"TOWER",description:"Wizard Towers deal +10 damage per hit.",icon:"✧"},
  {id:"siege",name:"Siege Engineering",rarity:"RARE",type:"TOWER",description:"Cannon Towers gain +25 range.",icon:"◆"},
  {id:"greed",name:"Greedy Kingdom",rarity:"COMMON",type:"ECONOMY",description:"Earn +3 gold for every enemy defeated.",icon:"♜"},
  {id:"walls",name:"Reinforced Walls",rarity:"RARE",type:"DEFENSE",description:"Increase maximum castle HP by 20 and restore 20 HP.",icon:"⬟"}
];

function getRunCommanderId(){return currentRun?.commanderId||window.riftboundCommanderId||"warden";}
window.isRiftboundRunActive=()=>!!currentRun&&!currentRun.finalized&&!currentRun.runFinished;
// Leaving an active expedition permanently abandons it and unlocks commander selection.
window.abandonRiftboundRun=function(){
  if(!currentRun||currentRun.finalized||currentRun.runFinished)return false;
  currentRun.runFinished=true;
  currentRun.waveActive=false;
  stopGameLoop();
  return true;
};
function getRunTraitEffects(){return typeof window.getRiftboundTraitEffects==="function"?window.getRiftboundTraitEffects(currentRun?.traitId):{};}
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
  const traitId=typeof window.getRiftboundTrait==="function"?window.getRiftboundTrait().id:"bulwarks-oath";
  const skillBonuses=typeof window.getRiftboundSkillBonuses==="function"?window.getRiftboundSkillBonuses(commanderId):{};
  const baseHealth=(commanderId==="warden"?120:100)+(skillBonuses.flatHealth||0);
  const startingHealth=Math.round(baseHealth*(1+(skillBonuses.fortressHp||0)));
  return {
    commanderId,traitId,skillBonuses,gold:100+(skillBonuses.startingGold||0),castleHealth:startingHealth,maxCastleHealth:startingHealth,area:1,campsite:1,stage:1,currentWave:0,totalWaves:30,
    towers:[{type:"archer",x:300,y:280,cooldown:0,level:1,investedGold:0,upgrades:{damage:0,range:0,speed:0}}],
    enemies:[],projectiles:[],spawnBatches:[],waveActive:false,gameOver:false,waveStarted:false,waveIntervalTimer:0,
    towerDamageBonus:0,cards:[],nextWaveTimer:0,waitingForWave:false,runFinished:false,
    encounter:{id:"bear-cave",name:"Bear Cave",kind:"ENCOUNTER",bossId:null},defeatedBosses:[],
    stats:{damageDealt:0,damageTaken:0,goldSpent:0,enemiesKilled:0,wavesCompleted:0,bossesDefeated:0},
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
window.startRiftboundNewRun=startNewRun;
function areaData(){return areas[currentRun.area-1]||areas[0];}

function persistRunCheckpoint(){return false;}
function updateAreaLabels(){
  const a=areaData();
  const battleRegion=document.querySelector(".battle-region span");
  const battleTitle=document.querySelector(".battle-region h1");
  if(battleRegion)battleRegion.textContent="AREA 0"+currentRun.area+" · "+a.name.toUpperCase();
  if(battleTitle)battleTitle.textContent=a.subtitle.toUpperCase();

  // The old preparation screen was removed when the Command Sanctum was added.
  // Keep these optional labels guarded so a new run can start without that markup.
  const regionEyebrow=document.querySelector(".region-heading .prep-eyebrow");
  const regionTitle=document.querySelector(".region-heading h2");
  if(regionEyebrow)regionEyebrow.textContent="AREA 0"+currentRun.area;
  if(regionTitle)regionTitle.textContent=a.name.toUpperCase();

  const details=document.querySelectorAll(".region-details span");
  if(details[0])details[0].textContent="30 WAVES · 2 CAMPSITES";
  if(details[1])details[1].textContent="2 OPTIONAL BOSS ROUTES";
  if(details[2])details[2].textContent=currentRun.area===1?"BEAR CAVE · WOLF DEN · GOBLIN CAMP":currentRun.area===2?"CINDER QUARRY · ASHEN RUINS · SCAVENGER CROSSING":"FROZEN HOLLOW · WRAITHWOOD · SHATTERED KEEP";
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
  drawBattlefield();
  document.getElementById("wave-display").textContent=(((currentRun.campsite-1)*3+(currentRun.stage-1))*5+currentRun.currentWave)+" / 30";
  const progress=document.getElementById("progress-summary");if(progress)progress.textContent="AREA "+currentRun.area+" · CAMPSITE "+currentRun.campsite+"/2 · STAGE "+currentRun.stage+"/3";
  const start=document.getElementById("start-wave");if(start)start.disabled=currentRun.waveActive||currentRun.gameOver||currentRun.currentWave>=5;
  updateCommanderHud();
  updateTowerButtons();updateTowerPanel();
}
const TOWER_LIMIT_PER_TYPE=5;
function getTowerCount(type){
  return currentRun?.towers?.filter(t=>t.type===type).length||0;
}
function updateTowerButtons(){
  document.querySelectorAll(".tower-button").forEach(b=>{
    const type=towerTypes[b.dataset.tower];
    const count=getTowerCount(b.dataset.tower);
    const maxed=count>=TOWER_LIMIT_PER_TYPE;
    const counter=b.querySelector("[data-tower-count]");
    const limitLabel=b.querySelector("[data-tower-limit]");
    if(counter)counter.textContent=count+"/"+TOWER_LIMIT_PER_TYPE;
    if(limitLabel)limitLabel.hidden=!maxed;
    b.classList.toggle("tower-button-maxed",maxed);
    b.disabled=!currentRun||currentRun.gold<type.cost||currentRun.gameOver||maxed;
  });
}
function showBattleMessage(s){document.getElementById("battle-message").textContent=s;}
function setWaveStatus(s){document.getElementById("wave-status").textContent=s;}
function getTowerStats(t){
  const base=towerTypes[t.type],u=t.upgrades||{damage:0,range:0,speed:0};
  const bonuses=currentRun.skillBonuses||{};
  let damage=base.damage*(1+(u.damage||0)*.3);
  let range=base.range+(u.range||0)*22;
  let cooldown=Math.max(.18,1/base.fireRate-(u.speed||0)*.16);
  let fireRate=1/cooldown;
  if(t.type==="arcane"&&getRunCommanderId()==="arcanist")damage*=1.25;
  if(t.type==="arcane")damage*=1+(bonuses.arcaneDamage||0);
  if(t.type==="archer")damage*=1+(bonuses.archerDamage||0);
  if(t.type==="cannon")damage*=1+(bonuses.cannonDamage||0);
  damage*=1+(bonuses.damage||0);
  range*=1+(bonuses.range||0);
  if(t.type==="arcane")range*=1+(bonuses.arcaneRange||0);
  const trait=typeof window.getRiftboundTraitEffects==="function"?getRunTraitEffects():{};
  if(t.type==="archer")damage*=1+(trait.archerDamage||0);
  if(t.type==="cannon")damage*=1+(trait.cannonDamage||0)+(bonuses.areaDamage||0);
  if(currentRun.castleHealth>currentRun.maxCastleHealth*.5)damage*=1+(bonuses.healthyDamage||0);
  if(currentRun.castleHealth<currentRun.maxCastleHealth*.35)fireRate*=1+(bonuses.lowHealthSpeed||0);
  fireRate*=1+(bonuses.towerSpeed||0);
  cooldown=1/fireRate;
  if(t.type==="archer")damage+=currentRun.cards.filter(c=>c==="arrows").length*5;
  if(t.type==="arcane")damage+=currentRun.cards.filter(c=>c==="arcane").length*10;
  if(t.type==="cannon")range+=currentRun.cards.filter(c=>c==="siege").length*25;
  damage+=currentRun.towerDamageBonus;
  return {...base,damage,range,fireRate,cooldown};
}
function environmentPalette(){
  if(currentRun.area===2)return {ground:"#302B2A",textureA:"#403634",textureB:"#211F20",pathDark:"#382C29",path:"#776047",pathEdge:"#9B8060",treeDark:"#211C1B",tree:"#49403A",treeLight:"#6A5B50",trunk:"#554137"};
  if(currentRun.area===3)return {ground:"#26313C",textureA:"#344352",textureB:"#1D2935",pathDark:"#382C29",path:"#776047",pathEdge:"#9B8060",treeDark:"#1A2730",tree:"#344B5A",treeLight:"#607D91",trunk:"#52616D"};
  return {ground:"#263B2B",textureA:"#304632",textureB:"#203326",pathDark:"#382C29",path:"#776047",pathEdge:"#9B8060",treeDark:"#17251B",tree:"#315438",treeLight:"#426443",trunk:"#64472F"};
}
function drawBattlefield(){
  const palette=environmentPalette();
  const background=backgroundImages[currentRun.area];
  const hasIllustratedBackground=!!(background&&background.complete&&background.naturalWidth>0);
  if(hasIllustratedBackground){
    // Canvas dimensions are 960x540 (16:9), matching the map artwork.
    ctx.drawImage(background,0,0,960,540);
  }else{
    ctx.fillStyle=palette.ground;
    ctx.fillRect(0,0,960,540);
    drawGroundTexture();
    drawTerrainDetails();
    drawMapLandmarks();
    drawTrees();
  }
  // Keep the route and all interactive game elements above the background artwork.
  drawPath();
  drawPortal();
  drawCastle();
  drawTowers();
  drawEnemies();
  drawProjectiles();
  drawSpectralAllies();
  drawCommanderEffects();
  drawPlacementPreview();
}
function drawGroundTexture(){
  const p=environmentPalette();
  for(let x=0;x<960;x+=24)for(let y=0;y<540;y+=24){
    const seed=(x*17+y*29+getAreaIndex()*11)%11;
    if(seed<3){ctx.fillStyle=seed===0?p.textureA:p.textureB;ctx.globalAlpha=seed===0?.42:.24;ctx.fillRect(x+seed*3,y+(seed%2)*5,5+seed*3,4+seed*2);ctx.globalAlpha=1;}
    if(currentRun.area===2&&seed===4){ctx.strokeStyle="rgba(226,112,58,.22)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+8,y+5);ctx.lineTo(x+14,y+2);ctx.stroke();}
    if(currentRun.area===3&&seed===5){ctx.fillStyle="rgba(174,213,239,.22)";ctx.beginPath();ctx.moveTo(x+5,y);ctx.lineTo(x+10,y+8);ctx.lineTo(x+4,y+14);ctx.closePath();ctx.fill();}
  }
}
function drawTerrainDetails(){
  const area=currentRun.area;
  const vignette=ctx.createRadialGradient(480,265,150,480,265,650);
  vignette.addColorStop(0,"rgba(0,0,0,0)");
  vignette.addColorStop(1,area===3?"rgba(5,13,24,.48)":area===2?"rgba(20,8,5,.42)":"rgba(5,15,8,.4)");
  ctx.fillStyle=vignette;ctx.fillRect(0,0,960,540);
  for(let x=18;x<950;x+=37)for(let y=18;y<530;y+=31){
    const seed=(x*19+y*31+area*47)%101;
    if(area===1){
      if(seed<23){ctx.save();ctx.translate(x+(seed%9),y+(seed%7));ctx.strokeStyle=seed%2?"rgba(113,151,91,.46)":"rgba(164,177,103,.38)";ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(0,4);ctx.quadraticCurveTo(-5,-3,-4,-7);ctx.moveTo(0,4);ctx.quadraticCurveTo(4,-4,7,-6);ctx.stroke();ctx.restore();}
      else if(seed>84){ctx.fillStyle="rgba(185,133,210,.55)";ctx.beginPath();ctx.arc(x,y,2.2,0,Math.PI*2);ctx.fill();ctx.fillStyle="rgba(235,210,175,.62)";ctx.fillRect(x-1,y-4,2,3);}
      else if(seed>62&&seed<69){ctx.fillStyle="rgba(25,35,23,.36)";ctx.beginPath();ctx.ellipse(x,y,8,3,seed,0,Math.PI*2);ctx.fill();}
    }else if(area===2){
      if(seed<18){ctx.strokeStyle="rgba(17,15,15,.55)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-5,y-4);ctx.lineTo(x,y);ctx.lineTo(x+7,y-2);ctx.lineTo(x+11,y+5);ctx.stroke();ctx.strokeStyle="rgba(218,91,43,.24)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+7,y-2);ctx.stroke();}
      else if(seed>78){ctx.fillStyle="rgba(10,9,10,.42)";ctx.beginPath();ctx.moveTo(x-5,y+3);ctx.lineTo(x-2,y-4);ctx.lineTo(x+4,y-6);ctx.lineTo(x+7,y+3);ctx.closePath();ctx.fill();ctx.fillStyle="rgba(170,91,60,.28)";ctx.fillRect(x-1,y-3,2,4);}
      else if(seed>51&&seed<57){ctx.fillStyle="rgba(255,126,59,.3)";ctx.beginPath();ctx.arc(x,y,1.7,0,Math.PI*2);ctx.fill();}
    }else{
      if(seed<21){ctx.strokeStyle="rgba(164,204,229,.36)";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x-7,y+5);ctx.lineTo(x-2,y);ctx.lineTo(x+1,y+2);ctx.lineTo(x+7,y-6);ctx.stroke();}
      else if(seed>78){ctx.fillStyle="rgba(198,225,242,.3)";ctx.beginPath();ctx.ellipse(x,y,8,3,seed,0,Math.PI*2);ctx.fill();ctx.fillStyle="rgba(225,241,250,.42)";ctx.fillRect(x-3,y-1,6,1);}
      else if(seed>53&&seed<59){ctx.fillStyle="rgba(132,190,221,.38)";ctx.beginPath();ctx.moveTo(x,y-5);ctx.lineTo(x-3,y+3);ctx.lineTo(x+3,y+3);ctx.closePath();ctx.fill();}
    }
  }
  ctx.save();ctx.strokeStyle=area===3?"rgba(167,207,232,.22)":area===2?"rgba(195,112,78,.2)":"rgba(151,174,119,.2)";ctx.lineWidth=3;ctx.strokeRect(7,7,946,526);ctx.strokeStyle="rgba(0,0,0,.22)";ctx.lineWidth=1;ctx.strokeRect(12,12,936,516);ctx.restore();
}
function drawPath(){
  const palette=environmentPalette(),points=getPathPoints();
  ctx.save();
  ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();
  points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
  // Keep the existing narrow road silhouette; add texture within and beside it.
  ctx.strokeStyle="rgba(0,0,0,.30)";ctx.lineWidth=28;ctx.stroke();
  ctx.strokeStyle=palette.pathDark;ctx.lineWidth=24;ctx.stroke();
  ctx.strokeStyle=palette.pathEdge;ctx.lineWidth=20;ctx.stroke();
  ctx.strokeStyle=palette.path;ctx.lineWidth=16;ctx.stroke();

  // Shallow wheel ruts and worn seams give the road a more natural surface.
  ctx.strokeStyle="rgba(37,28,24,.34)";ctx.lineWidth=1.2;
  ctx.setLineDash([7,13]);ctx.lineDashOffset=0;ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle="rgba(222,196,145,.30)";ctx.lineWidth=1;
  ctx.setLineDash([3,24]);ctx.stroke();ctx.setLineDash([]);

  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1],dx=b.x-a.x,dy=b.y-a.y;
    const len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len,steps=Math.floor(len/15);
    for(let j=1;j<steps;j++){
      const t=j/steps,x=a.x+dx*t,y=a.y+dy*t;
      const seed=(i*97+j*31+currentRun.area*53)%17;
      // Small irregular cobbles, worn earth flecks and edge gravel.
      if(seed===1||seed===7||seed===12){
        const side=seed===7?-1:1,offset=side*(7+(seed%3)*2);
        const px=x+nx*offset,py=y+ny*offset;
        ctx.fillStyle=seed===7?"rgba(35,27,23,.48)":"rgba(190,158,111,.36)";
        ctx.beginPath();ctx.ellipse(px,py,2.2,1.25,(i+j)*.37,0,Math.PI*2);ctx.fill();
      }else if(seed===3||seed===10){
        const offset=((seed%2)?-1:1)*((seed%4)+1);
        ctx.fillStyle="rgba(39,30,25,.30)";
        ctx.fillRect(Math.round(x+nx*offset),Math.round(y+ny*offset),2,1);
      }else if(seed===15){
        ctx.fillStyle="rgba(224,204,163,.32)";
        ctx.fillRect(Math.round(x)-1,Math.round(y),2,1);
      }
    }
  }
  // Scattered shoulder stones sit just outside the road edge, never widening it.
  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1],dx=b.x-a.x,dy=b.y-a.y;
    const len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len,steps=Math.floor(len/38);
    for(let j=1;j<steps;j++){
      const seed=(i*41+j*19+currentRun.area*13)%9;
      if(seed!==2&&seed!==6)continue;
      const t=j/steps,side=seed===2?-1:1;
      const x=a.x+dx*t+nx*side*13,y=a.y+dy*t+ny*side*13;
      ctx.fillStyle=seed===2?"rgba(30,27,25,.55)":"rgba(155,130,98,.42)";
      ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x-1,y-2);ctx.lineTo(x+3,y-1);ctx.lineTo(x+2,y+2);ctx.lineTo(x-2,y+2);ctx.closePath();ctx.fill();
    }
  }
  ctx.restore();
}
function drawTrees(){
  const p=environmentPalette();
  getTreePositions().forEach(([x,y],index)=>{
    ctx.save();
    if(currentRun.area===3){
      ctx.fillStyle="rgba(5,12,20,.35)";ctx.beginPath();ctx.ellipse(x,y+8,23,10,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=p.treeDark;ctx.beginPath();ctx.moveTo(x,y-42);ctx.lineTo(x-22,y+12);ctx.lineTo(x+22,y+12);ctx.closePath();ctx.fill();
      ctx.fillStyle=p.tree;ctx.beginPath();ctx.moveTo(x,y-36);ctx.lineTo(x-17,y+5);ctx.lineTo(x+17,y+5);ctx.closePath();ctx.fill();
      ctx.fillStyle=p.treeLight;ctx.beginPath();ctx.moveTo(x,y-30);ctx.lineTo(x-10,y-2);ctx.lineTo(x+10,y-2);ctx.closePath();ctx.fill();
      ctx.fillStyle="#B7DDF4";ctx.fillRect(x-2,y-20,3,9);
    }else if(currentRun.area===2){
      ctx.fillStyle="rgba(5,3,3,.35)";ctx.beginPath();ctx.ellipse(x,y+8,23,9,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=p.trunk;ctx.fillRect(x-4,y-3,8,18);
      ctx.fillStyle=p.treeDark;ctx.beginPath();ctx.moveTo(x,y-34);ctx.lineTo(x-24,y+5);ctx.lineTo(x+22,y+5);ctx.closePath();ctx.fill();
      ctx.fillStyle=p.tree;ctx.beginPath();ctx.moveTo(x-3,y-29);ctx.lineTo(x-18,y-1);ctx.lineTo(x+17,y-1);ctx.closePath();ctx.fill();
      ctx.fillStyle=p.treeLight;ctx.fillRect(x-3,y-22,6,5);
    }else{
      ctx.fillStyle="rgba(4,12,7,.35)";ctx.beginPath();ctx.ellipse(x,y+8,24,10,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=p.trunk;ctx.fillRect(x-5,y-2,10,20);
      ctx.fillStyle=p.treeDark;ctx.beginPath();ctx.arc(x,y-17,24,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=p.tree;ctx.beginPath();ctx.arc(x-8,y-23,16,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+9,y-19,17,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=p.treeLight;ctx.beginPath();ctx.arc(x-7,y-29,8,0,Math.PI*2);ctx.fill();
      if(index%3===0){ctx.fillStyle="rgba(180,120,220,.65)";ctx.fillRect(x+9,y-12,3,3);}
    }
    ctx.restore();
  });
}
function drawMapLandmarks(){
  const area=currentRun.area,now=performance.now();
  if(area===1){
    // Ancient mossy standing stones and luminous forest pools.
    [[300,455],[485,65],[805,465]].forEach(([x,y],i)=>{
      ctx.fillStyle="rgba(7,16,10,.35)";ctx.beginPath();ctx.ellipse(x,y+12,25,8,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#394B3A";ctx.fillRect(x-8,y-25,16,36);ctx.fillStyle="#65785A";ctx.fillRect(x-5,y-22,5,25);
      ctx.strokeStyle="rgba(173,132,218,.55)";ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y-8,12+Math.sin(now/420+i)*2,0,Math.PI*2);ctx.stroke();
    });
    [[115,115],[480,470],[790,95]].forEach(([x,y])=>{ctx.fillStyle="rgba(133,89,177,.18)";ctx.beginPath();ctx.arc(x,y,18,0,Math.PI*2);ctx.fill();ctx.fillStyle="#A78BC4";ctx.fillRect(x-3,y-3,6,6);});
  }else if(area===2){
    // Obsidian outcrops and glowing fissures.
    [[170,185],[365,455],[550,70],[760,105],[910,360]].forEach(([x,y],i)=>{
      ctx.fillStyle="#171718";ctx.beginPath();ctx.moveTo(x-20,y+12);ctx.lineTo(x-11,y-15-(i%2)*8);ctx.lineTo(x+3,y-23);ctx.lineTo(x+21,y+12);ctx.closePath();ctx.fill();
      ctx.fillStyle="#5B4036";ctx.fillRect(x-5,y-7,4,14);
      ctx.strokeStyle="rgba(255,116,55,.55)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-12,y+7);ctx.lineTo(x-2,y);ctx.lineTo(x+5,y+6);ctx.lineTo(x+13,y-4);ctx.stroke();
    });
    [[310,80],[690,455]].forEach(([x,y])=>{ctx.fillStyle="rgba(238,91,39,.16)";ctx.beginPath();ctx.ellipse(x,y,30,13,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#D96D3D";ctx.fillRect(x-12,y-2,24,4);});
  }else{
    // Ice spires, frozen pools and frost-lit ruins.
    [[155,85],[330,475],[635,65],[800,455],[915,190]].forEach(([x,y],i)=>{
      ctx.fillStyle="rgba(4,13,23,.32)";ctx.beginPath();ctx.ellipse(x,y+14,22,8,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#63849A";ctx.beginPath();ctx.moveTo(x,y-34-(i%2)*10);ctx.lineTo(x-12,y+12);ctx.lineTo(x+12,y+12);ctx.closePath();ctx.fill();
      ctx.fillStyle="#B7DDF4";ctx.beginPath();ctx.moveTo(x-2,y-27);ctx.lineTo(x-5,y+5);ctx.lineTo(x+3,y+7);ctx.closePath();ctx.fill();
    });
    [[280,75],[745,470]].forEach(([x,y])=>{ctx.fillStyle="rgba(153,208,245,.16)";ctx.beginPath();ctx.arc(x,y,25,0,Math.PI*2);ctx.fill();ctx.strokeStyle="rgba(191,229,255,.55)";ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,17,0,Math.PI*2);ctx.stroke();});
  }
}
function drawPortal(){
  const p=1+Math.sin(performance.now()/300)*.12;ctx.fillStyle="rgba(129,85,184,.15)";ctx.beginPath();ctx.arc(75,270,48*p,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#62447F";ctx.lineWidth=8;ctx.beginPath();ctx.ellipse(75,270,24,38,0,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle="#21102F";ctx.beginPath();ctx.ellipse(75,270,18,31,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#B99AE8";ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(75,270,15,27,0,0,Math.PI*2);ctx.stroke();
}
function drawCastle(){
  // Ground shadow and stone foundation.
  ctx.save();
  ctx.fillStyle="rgba(5,5,9,.42)";
  ctx.beginPath();ctx.ellipse(896,316,54,13,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#20202B";ctx.fillRect(850,296,91,29);
  ctx.fillStyle="#51485F";ctx.fillRect(855,230,82,76);
  ctx.fillStyle="#766982";ctx.fillRect(862,237,68,62);
  ctx.fillStyle="#91829A";ctx.fillRect(870,245,52,49);

  // Tower blocks and battlements.
  ctx.fillStyle="#3B3049";
  ctx.fillRect(852,220,23,84);ctx.fillRect(916,220,22,84);
  ctx.fillRect(850,216,7,13);ctx.fillRect(861,216,7,13);ctx.fillRect(872,216,5,13);
  ctx.fillRect(914,216,7,13);ctx.fillRect(925,216,7,13);ctx.fillRect(935,216,4,13);
  ctx.fillStyle="#B99AE8";
  ctx.fillRect(852,214,23,4);ctx.fillRect(916,214,22,4);
  ctx.fillStyle="#88799B";
  ctx.fillRect(856,230,15,3);ctx.fillRect(919,230,15,3);
  ctx.fillRect(860,238,8,54);ctx.fillRect(920,238,7,54);

  // Individual masonry courses and chipped stone highlights.
  ctx.strokeStyle="rgba(25,18,34,.58)";ctx.lineWidth=1;
  for(let y=252;y<301;y+=12){
    ctx.beginPath();ctx.moveTo(862,y);ctx.lineTo(930,y);ctx.stroke();
    const seam=(y%3)*5+879;
    ctx.beginPath();ctx.moveTo(seam,y-12);ctx.lineTo(seam,y);ctx.stroke();
  }
  ctx.fillStyle="rgba(214,195,225,.34)";
  ctx.fillRect(861,246,7,2);ctx.fillRect(922,250,5,2);ctx.fillRect(875,258,4,2);
  ctx.fillRect(906,282,5,2);ctx.fillRect(858,280,4,2);

  // Narrow arrow slits and the central arched gate.
  ctx.fillStyle="#21182B";
  ctx.fillRect(860,237,5,13);ctx.fillRect(924,237,5,13);
  ctx.fillRect(883,270,27,35);
  ctx.fillStyle="#A88CBF";
  ctx.fillRect(886,272,21,3);ctx.fillRect(883,275,3,28);ctx.fillRect(907,275,3,28);
  ctx.fillStyle="#17121E";
  ctx.fillRect(888,281,17,24);
  ctx.fillStyle="#D2B5E8";ctx.fillRect(900,286,2,2);

  // Small purple ward stones set into the parapet.
  ctx.fillStyle="rgba(185,154,232,.72)";
  ctx.fillRect(862,220,3,5);ctx.fillRect(926,220,3,5);
  ctx.fillStyle="rgba(185,154,232,.22)";
  ctx.fillRect(858,224,11,2);ctx.fillRect(922,224,11,2);
  ctx.restore();

  const hpRatio=Math.max(0,Math.min(1,currentRun.castleHealth/currentRun.maxCastleHealth));
  const barX=846,barY=198,barW=104,barH=12;
  ctx.fillStyle="rgba(8,6,12,.94)";ctx.fillRect(barX-3,barY-3,barW+6,barH+6);
  ctx.strokeStyle="#D8C0FF";ctx.lineWidth=1.5;ctx.strokeRect(barX-3,barY-3,barW+6,barH+6);
  ctx.fillStyle="#38212B";ctx.fillRect(barX,barY,barW,barH);
  ctx.fillStyle=hpRatio>.6?"#69C77A":hpRatio>.3?"#E4B85C":"#E06470";
  ctx.fillRect(barX,barY,barW*hpRatio,barH);
  ctx.font="bold 10px Arial";ctx.textAlign="center";ctx.lineWidth=3;
  ctx.strokeStyle="#100B16";ctx.strokeText("FORTRESS  "+Math.ceil(currentRun.castleHealth)+" / "+currentRun.maxCastleHealth,898,190);
  ctx.fillStyle="#FFF";ctx.fillText("FORTRESS  "+Math.ceil(currentRun.castleHealth)+" / "+currentRun.maxCastleHealth,898,190);
  ctx.textAlign="left";
}
function drawTowers(){
  if(!currentRun)return;
  currentRun.towers.forEach(t=>{
    const s=getTowerStats(t),selected=t===selectedTowerEntity;
    if(getSettings().towerRanges||selected){ctx.beginPath();ctx.arc(t.x,t.y,s.range,0,Math.PI*2);ctx.fillStyle=selected?"rgba(185,154,232,.12)":"rgba(185,154,232,.06)";ctx.fill();ctx.strokeStyle=selected?"rgba(220,195,255,.75)":"rgba(185,154,232,.2)";ctx.lineWidth=selected?2:1;ctx.stroke();}
    const archerAttack=t.type==="archer"&&t.archerAnimation?.mode==="attack";
    const arcaneAttack=t.type==="arcane"&&t.arcaneAnimation?.mode==="attack";
    const cannonAttack=t.type==="cannon"&&t.cannonAnimation?.mode==="attack";
    const isAnimatedTower=t.type==="archer"||t.type==="arcane"||t.type==="cannon";
    const animationConfig=t.type==="archer"?archerAnimation:t.type==="arcane"?arcaneAnimation:cannonAnimation;
    const activeAttack=t.type==="archer"?archerAttack:t.type==="arcane"?arcaneAttack:cannonAttack;
    const towerAnimation=t.type==="archer"?t.archerAnimation:t.type==="arcane"?t.arcaneAnimation:t.cannonAnimation;
    const animationSheet=activeAttack?animationConfig.attack.image:animationConfig.idle.image;
    const animationSheetReady=animationSheet.complete&&animationSheet.naturalWidth>0;
    const sprite=isAnimatedTower?(animationSheetReady?animationSheet:towerSprites[t.type]):towerSprites[t.type];
    if(isAnimatedTower&&animationSheetReady){
      const frame=activeAttack
        ?Math.min(animationConfig.attack.frames-1,Math.floor(towerAnimation.elapsed*animationConfig.attack.fps))
        :Math.floor(performance.now()/1000*animationConfig.idle.fps)%animationConfig.idle.frames;
      ctx.save();
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(animationSheet,frame*animationConfig.frameWidth,0,
        animationConfig.frameWidth,animationConfig.frameHeight,t.x-38,t.y-84,76,88);
      ctx.restore();
    }else if(sprite&&sprite.complete&&sprite.naturalWidth>0){
      ctx.save();
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(sprite,t.x-38,t.y-84,76,88);
      ctx.restore();
    }else{
      ctx.fillStyle="#241932";ctx.fillRect(t.x-16,t.y-16,32,32);ctx.strokeStyle=s.color;ctx.lineWidth=2;ctx.strokeRect(t.x-16,t.y-16,32,32);
      ctx.fillStyle=s.color;ctx.fillRect(t.x-8,t.y-8,16,16);ctx.fillStyle="#E5DDF0";ctx.fillRect(t.x-3,t.y-3,6,6);
    }
    if(t.level>1){
      ctx.fillStyle="#F0D58A";ctx.font="bold 11px Georgia";ctx.textAlign="center";
      ctx.fillText("+"+(t.level-1),t.x+30,t.y-78);ctx.textAlign="left";
    }
  });
}
function drawEnemies(){
  if(!currentRun)return;
  currentRun.enemies.forEach(e=>{
    const t=enemyTypes[e.type],size=t.size;ctx.fillStyle="rgba(0,0,0,.3)";ctx.fillRect(e.x-size,e.y+size/2,size*2,5);
    ctx.fillStyle=t.color;ctx.strokeStyle="rgba(20,12,28,.9)";ctx.lineWidth=3;
    if(e.isBoss){
      ctx.beginPath();
      if(e.type==="hollow-bear"){
        ctx.ellipse(e.x,e.y,size*.72,size*.82,0,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(e.x-size*.52,e.y-size*.55,size*.3,0,Math.PI*2);ctx.arc(e.x+size*.52,e.y-size*.55,size*.3,0,Math.PI*2);ctx.fill();
      }else if(e.type==="rift-alpha"){
        ctx.moveTo(e.x,e.y-size);ctx.lineTo(e.x+size*.78,e.y-size*.15);ctx.lineTo(e.x+size*.5,e.y+size*.72);ctx.lineTo(e.x-size*.5,e.y+size*.72);ctx.lineTo(e.x-size*.78,e.y-size*.15);ctx.closePath();ctx.fill();
        ctx.fillRect(e.x-size*.8,e.y-size*1.05,size*.35,size*.5);ctx.fillRect(e.x+size*.45,e.y-size*1.05,size*.35,size*.5);
      }else if(e.type==="ash-colossus"){
        ctx.fillRect(e.x-size*.7,e.y-size*.65,size*1.4,size*1.35);
        ctx.beginPath();ctx.moveTo(e.x-size*.55,e.y-size*.55);ctx.lineTo(e.x-size*.25,e.y-size*1.2);ctx.lineTo(e.x,e.y-size*.55);ctx.lineTo(e.x+size*.28,e.y-size*1.25);ctx.lineTo(e.x+size*.58,e.y-size*.55);ctx.closePath();ctx.fill();
      }else if(e.type==="goblin-warlord"){
        ctx.fillRect(e.x-size*.62,e.y-size*.55,size*1.24,size*1.25);
        ctx.beginPath();ctx.moveTo(e.x-size*.55,e.y-size*.5);ctx.lineTo(e.x-size*.48,e.y-size*1.05);ctx.lineTo(e.x-size*.12,e.y-size*.75);ctx.lineTo(e.x,e.y-size*1.18);ctx.lineTo(e.x+size*.16,e.y-size*.75);ctx.lineTo(e.x+size*.52,e.y-size*1.05);ctx.lineTo(e.x+size*.58,e.y-size*.5);ctx.closePath();ctx.fill();
      }else if(e.type==="frost-wyrm"){
        ctx.ellipse(e.x,e.y,size*.95,size*.48,-.18,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.moveTo(e.x+size*.35,e.y-size*.15);ctx.lineTo(e.x+size*1.05,e.y-size*.8);ctx.lineTo(e.x+size*.78,e.y+size*.15);ctx.closePath();ctx.fill();
        ctx.beginPath();ctx.moveTo(e.x+size*.7,e.y-size*.45);ctx.lineTo(e.x+size*.55,e.y-size*1.05);ctx.lineTo(e.x+size*.95,e.y-size*.6);ctx.closePath();ctx.fill();
      }else if(e.type==="riftbound-knight"){
        ctx.moveTo(e.x,e.y-size);ctx.lineTo(e.x+size*.72,e.y-size*.2);ctx.lineTo(e.x+size*.55,e.y+size*.75);ctx.lineTo(e.x,e.y+size);ctx.lineTo(e.x-size*.55,e.y+size*.75);ctx.lineTo(e.x-size*.72,e.y-size*.2);ctx.closePath();ctx.fill();
        ctx.fillRect(e.x+size*.55,e.y-size*.1,size*.38,size*.85);
      }else{ctx.arc(e.x,e.y,size*.8,0,Math.PI*2);ctx.fill();}
      ctx.stroke();
    }else{ctx.fillRect(e.x-size/2,e.y-size/2,size,size);}
    ctx.fillStyle="#241932";ctx.fillRect(e.x-4,e.y-3,3,3);ctx.fillRect(e.x+2,e.y-3,3,3);
    if(e.burnTimer>0){
      const flame=performance.now()/75;
      for(let f=0;f<3;f++){
        const fx=e.x+(f-1)*7,fy=e.y-size/2-5-Math.abs(Math.sin(flame+f))*8;
        ctx.fillStyle=f%2?"#FF9B42":"#FFE08A";
        ctx.beginPath();ctx.moveTo(fx-4,fy+9);ctx.quadraticCurveTo(fx-7,fy,fx,fy-7-Math.sin(flame+f)*3);ctx.quadraticCurveTo(fx+7,fy,fx+4,fy+9);ctx.closePath();ctx.fill();
      }
    }
    if(currentRun.markedEnemy===e&&currentRun.markedTimer>0){
      const pulse=1+Math.sin(performance.now()/90)*.12;
      ctx.strokeStyle="#F0D58A";ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,(size+10)*pulse,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle="#F0D58A";ctx.font="bold 10px Arial";ctx.textAlign="center";ctx.fillText("MARKED",e.x,e.y-size-22);
    }
    const w=e.isBoss?88:(e.type==="treant"?72:48),p=Math.max(0,e.health/e.maxHealth),barY=e.y-size-17;
    ctx.fillStyle="rgba(8,6,12,.96)";ctx.fillRect(e.x-w/2-2,barY-2,w+4,12);
    ctx.strokeStyle="rgba(245,235,255,.9)";ctx.lineWidth=1;ctx.strokeRect(e.x-w/2-2,barY-2,w+4,12);
    ctx.fillStyle="#38212B";ctx.fillRect(e.x-w/2,barY,w,8);
    ctx.fillStyle=p>.6?"#69C77A":p>.3?"#E4B85C":"#E06470";ctx.fillRect(e.x-w/2,barY,w*p,8);
    ctx.font="bold 10px Arial";ctx.textAlign="center";ctx.fillStyle="#FFFFFF";ctx.strokeStyle="#100B16";ctx.lineWidth=3;
    const hp=Math.max(0,Math.ceil(e.health))+"/"+Math.ceil(e.maxHealth);ctx.strokeText(hp,e.x,barY-3);ctx.fillText(hp,e.x,barY-3);
    if(e.isBoss){ctx.font="bold 11px Georgia";ctx.fillStyle="#F0D58A";ctx.fillText((e.name||t.name).toUpperCase(),e.x,e.y-size-26);ctx.strokeStyle="rgba(240,213,138,.75)";ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,size+5,0,Math.PI*2);ctx.stroke();}
  });ctx.textAlign="left";
}
function drawProjectiles(){
  if(!currentRun)return;
  currentRun.projectiles.forEach(p=>{
    if(p.isArrow){
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle||0);
      const arrow=archerAnimation.arrow;
      if(arrow.complete&&arrow.naturalWidth>0){
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(arrow,-15,-4,30,8);
      }else{
        ctx.strokeStyle="#D8C18B";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(11,0);ctx.stroke();
        ctx.fillStyle="#E7E0D0";ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(6,-4);ctx.lineTo(6,4);ctx.closePath();ctx.fill();
        ctx.strokeStyle="#8A6845";ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(-14,-4);ctx.moveTo(-10,0);ctx.lineTo(-14,4);ctx.stroke();
      }
      ctx.restore();
    }else if(p.isArcaneOrb){
      const orb=arcaneAnimation.orb.image;
      if(orb.complete&&orb.naturalWidth>0){
        const frame=Math.floor((p.animationTime||0)*arcaneAnimation.orb.fps)%arcaneAnimation.orb.frames;
        ctx.save();ctx.imageSmoothingEnabled=false;
        ctx.drawImage(orb,frame*arcaneAnimation.orb.frameWidth,0,
          arcaneAnimation.orb.frameWidth,arcaneAnimation.orb.frameHeight,p.x-13,p.y-13,26,26);
        ctx.restore();
      }else{
        const pulse=1+Math.sin((p.animationTime||0)*12)*.12;
        ctx.save();ctx.shadowColor="#8C70FF";ctx.shadowBlur=16;
        ctx.fillStyle="#A88BFF";ctx.beginPath();ctx.arc(p.x,p.y,7*pulse,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#E8DCFF";ctx.beginPath();ctx.arc(p.x-2,p.y-2,3,0,Math.PI*2);ctx.fill();ctx.restore();
      }
    }else if(p.isCannonBall){
      const ball=cannonAnimation.ball;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle||0);
      if(ball.complete&&ball.naturalWidth>0){
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(ball,-cannonAnimation.projectileWidth/2,-cannonAnimation.projectileHeight/2,
          cannonAnimation.projectileWidth,cannonAnimation.projectileHeight);
      }else{
        ctx.fillStyle="#D0C6B7";ctx.beginPath();ctx.arc(0,0,6,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle="#75675A";ctx.lineWidth=2;ctx.stroke();
      }
      ctx.restore();
    }else{
      ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fill();
    }
  });
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
  const fortress={x:895,y:270};
  const path=getPathPoints();
  const pulse=(speed,phase=0)=>.5+.5*Math.sin(now/speed+phase);
  const glow=(x,y,r,color,alpha=1)=>{
    const g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,color.replace("ALPHA",String(.34*alpha)));
    g.addColorStop(.48,color.replace("ALPHA",String(.12*alpha)));
    g.addColorStop(1,color.replace("ALPHA","0"));
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  };
  const runeRing=(x,y,r,rotation,color,alpha=1,segments=12)=>{
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalAlpha=alpha;
    ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.shadowColor=color;ctx.shadowBlur=12;
    ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,r*.83,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<segments;i++){
      const a=i*Math.PI*2/segments;
      ctx.save();ctx.rotate(a);ctx.beginPath();ctx.moveTo(r*.84,0);ctx.lineTo(r,0);
      ctx.moveTo(r*.91,-4);ctx.lineTo(r*.96,0);ctx.lineTo(r*.91,4);ctx.stroke();ctx.restore();
    }
    ctx.restore();
  };
  const burst=(x,y,r,color,alpha,spokes=12)=>{
    ctx.save();ctx.translate(x,y);ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=2;
    ctx.shadowColor=color;ctx.shadowBlur=14;
    for(let i=0;i<spokes;i++){
      const a=i*Math.PI*2/spokes+now/900;
      const inner=r*.25,outer=r*(.75+.18*pulse(95,i));
      ctx.beginPath();ctx.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);ctx.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);ctx.stroke();
    }
    ctx.restore();
  };

  if(currentRun.bastionTimer>0){
    const active=.55+.22*pulse(170);
    ctx.save();ctx.globalAlpha=active;ctx.strokeStyle="#91D8FF";ctx.lineWidth=3;
    ctx.shadowColor="#66BFFF";ctx.shadowBlur=22;
    ctx.beginPath();ctx.arc(fortress.x,fortress.y,64+Math.sin(now/180)*3,0,Math.PI*2);ctx.stroke();
    ctx.setLineDash([9,7]);ctx.lineDashOffset=-now/22;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(fortress.x,fortress.y,73,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    ctx.beginPath();
    for(let i=0;i<6;i++){const a=-Math.PI/2+i*Math.PI/3;const x=fortress.x+Math.cos(a)*60,y=fortress.y+Math.sin(a)*60;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
    ctx.closePath();ctx.stroke();
    for(let i=0;i<6;i++){
      const a=now/700+i*Math.PI/3,x=fortress.x+Math.cos(a)*68,y=fortress.y+Math.sin(a)*68;
      glow(x,y,13,"rgba(146,220,255,ALPHA)",1);
      ctx.fillStyle="#E6FAFF";ctx.beginPath();ctx.moveTo(x,y-5);ctx.lineTo(x+4,y);ctx.lineTo(x,y+5);ctx.lineTo(x-4,y);ctx.closePath();ctx.fill();
    }
    runeRing(fortress.x,fortress.y,83,-now/1600,"#83CFFF",.42,18);
    ctx.restore();
  }

  currentRun.abilityEffects=(currentRun.abilityEffects||[]).filter(effect=>{
    const progress=Math.max(0,Math.min(1,1-effect.life/effect.duration));
    const fade=Math.min(1,(1-progress)*5,Math.max(0,(1-progress)*0+effect.life*1.7));
    const appear=Math.min(1,progress*7);
    ctx.save();

    if(effect.type==="bastion"){
      const radius=70+progress*52;
      glow(fortress.x,fortress.y,118,"rgba(105,190,255,ALPHA)",fade);
      runeRing(fortress.x,fortress.y,54+progress*30,now/900,"#B9E9FF",fade*.9,12);
      runeRing(fortress.x,fortress.y,radius,-now/1200,"#6BBEFF",fade*.75,18);
      burst(fortress.x,fortress.y,90+progress*55,"#DDF7FF",fade*.8,16);
      ctx.strokeStyle="rgba(210,244,255,"+(fade*.8)+")";ctx.lineWidth=2;
      for(let i=0;i<6;i++){
        const a=i*Math.PI/3+now/1300;
        const x=fortress.x+Math.cos(a)*62,y=fortress.y+Math.sin(a)*62;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*24,y+Math.sin(a)*24);ctx.stroke();
      }
      ctx.fillStyle="rgba(175,225,255,"+(fade*.12)+")";ctx.beginPath();ctx.arc(fortress.x,fortress.y,56,0,Math.PI*2);ctx.fill();

    }else if(effect.type==="rift"){
      const waveRadius=25+progress*120;
      ctx.save();ctx.globalAlpha=fade;ctx.lineCap="round";ctx.lineJoin="round";
      ctx.shadowColor="#B98CFF";ctx.shadowBlur=24;
      ctx.strokeStyle="rgba(135,83,220,.42)";ctx.lineWidth=22;
      ctx.beginPath();path.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
      ctx.strokeStyle="#B88AFF";ctx.lineWidth=8;ctx.setLineDash([22,13]);ctx.lineDashOffset=-now/18;
      ctx.beginPath();path.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
      ctx.setLineDash([]);ctx.strokeStyle="#F0DFFF";ctx.lineWidth=2.5;
      ctx.beginPath();path.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
      ctx.restore();
      path.forEach((p,i)=>{
        const a=now/260+i*1.7,r=waveRadius*(.35+.65*pulse(300,i));
        glow(p.x,p.y,32,"rgba(183,130,255,ALPHA)",fade);
        ctx.strokeStyle="rgba(231,206,255,"+(fade*.85)+")";ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(p.x,p.y,r*.35,0,Math.PI*2);ctx.stroke();
        for(let k=0;k<3;k++){
          const angle=a+k*Math.PI*2/3,x=p.x+Math.cos(angle)*r*.38,y=p.y+Math.sin(angle)*r*.38;
          ctx.fillStyle="rgba(244,226,255,"+(fade*.9)+")";ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();
        }
      });
      currentRun.enemies.forEach((enemy,i)=>{
        const r=18+progress*48;
        ctx.strokeStyle="rgba(213,176,255,"+(fade*.65)+")";ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(enemy.x,enemy.y,r,0,Math.PI*2);ctx.stroke();
        glow(enemy.x,enemy.y,28,"rgba(180,110,255,ALPHA)",fade*.65);
      });

    }else if(effect.type==="mark"&&effect.target){
      const target=effect.target,x=target.x,y=target.y;
      const r=32+Math.sin(now/85)*4+progress*14;
      glow(x,y,66,"rgba(255,202,93,ALPHA)",fade);
      runeRing(x,y,r,now/550,"#F8D27D",fade,8);
      ctx.save();ctx.translate(x,y);ctx.rotate(-now/700);ctx.strokeStyle="#FFF0BD";ctx.lineWidth=3;ctx.shadowColor="#FFC95F";ctx.shadowBlur=18;
      const arm=22+progress*8,gap=11;
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy])=>{
        ctx.beginPath();ctx.moveTo(sx*gap,sy*(arm+7));ctx.lineTo(sx*arm,sy*(arm+7));ctx.lineTo(sx*arm,sy*gap);ctx.stroke();
      });
      ctx.beginPath();ctx.arc(0,0,9,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(5,0);ctx.moveTo(0,-5);ctx.lineTo(0,5);ctx.stroke();
      ctx.restore();
      currentRun.towers.forEach((tower,i)=>{
        if(i%2!==0)return;
        ctx.strokeStyle="rgba(255,218,139,"+(fade*.18)+")";ctx.lineWidth=1;
        ctx.setLineDash([4,8]);ctx.beginPath();ctx.moveTo(tower.x,tower.y-12);ctx.lineTo(x,y);ctx.stroke();ctx.setLineDash([]);
      });

    }else if(effect.type==="gold"){
      const x=fortress.x,y=fortress.y-10;
      glow(x,y,125,"rgba(255,205,83,ALPHA)",fade);
      runeRing(x,y,35+progress*50,now/800,"#FFD979",fade,12);
      runeRing(x,y,66+progress*28,-now/1050,"#E7A83C",fade*.7,16);
      ctx.save();ctx.translate(x,y-4-progress*15);ctx.globalAlpha=fade;ctx.shadowColor="#FFD46C";ctx.shadowBlur=22;
      ctx.fillStyle="#FFF0B4";ctx.strokeStyle="#A96822";ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(-28,8);ctx.lineTo(-24,-15);ctx.lineTo(-8,-3);ctx.lineTo(0,-25);ctx.lineTo(9,-3);ctx.lineTo(25,-15);ctx.lineTo(28,8);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle="#F4BD4D";ctx.fillRect(-24,10,48,5);
      ctx.restore();
      for(let i=0;i<18;i++){
        const a=now/460+i*Math.PI*2/18,orbit=32+progress*70+Math.sin(now/180+i)*5;
        const cx=x+Math.cos(a)*orbit,cy=y+Math.sin(a)*orbit*.58;
        ctx.save();ctx.translate(cx,cy);ctx.rotate(a+now/500);ctx.globalAlpha=fade;
        ctx.fillStyle=i%3===0?"#FFF0AE":"#E8AD42";ctx.strokeStyle="#8B5B22";ctx.lineWidth=1;
        ctx.beginPath();ctx.ellipse(0,0,4,7,0,0,Math.PI*2);ctx.fill();ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha=fade;ctx.textAlign="center";ctx.font="bold 21px Georgia";ctx.fillStyle="#FFF1B9";ctx.shadowColor="#E7A83C";ctx.shadowBlur=16;
      ctx.fillText("+"+(125+(currentRun.skillBonuses?.abilityGold||0))+" GOLD",x,y-55-progress*18);

    }else if(effect.type==="inferno"){
      currentRun.enemies.forEach((enemy,i)=>{
        const x=enemy.x,y=enemy.y;
        const rise=progress*32;
        glow(x,y,54,"rgba(255,92,24,ALPHA)",fade);
        ctx.save();ctx.globalAlpha=fade;ctx.translate(x,y);
        ctx.strokeStyle="#FF9B42";ctx.lineWidth=2.5;ctx.shadowColor="#FF4B16";ctx.shadowBlur=18;
        const ring=18+progress*43;
        ctx.beginPath();ctx.ellipse(0,5,ring,ring*.48,0,0,Math.PI*2);ctx.stroke();
        ctx.strokeStyle="#FFD17A";ctx.lineWidth=2;
        for(let f=0;f<4;f++){
          const offset=(f-1.5)*9,flameH=25+12*pulse(90,i+f);
          ctx.beginPath();ctx.moveTo(offset-5,8);
          ctx.bezierCurveTo(offset-17,-flameH*.25,offset+9,-flameH*.65,offset+Math.sin(now/80+f)*4,-flameH-rise);
          ctx.bezierCurveTo(offset+13,-flameH*.4,offset+12,-flameH*.15,offset+5,8);ctx.stroke();
        }
        ctx.fillStyle="rgba(255,194,87,.7)";ctx.beginPath();ctx.arc(0,-8-rise*.25,5+2*pulse(70,i),0,Math.PI*2);ctx.fill();
        ctx.restore();
      });
      for(let i=0;i<24;i++){
        const enemy=currentRun.enemies[i%Math.max(1,currentRun.enemies.length)];
        if(!enemy)break;
        const a=now/320+i*2.399,r=16+(i%5)*7+progress*26;
        const x=enemy.x+Math.cos(a)*r,y=enemy.y+Math.sin(a)*r-(now/18+i*11)%42;
        ctx.fillStyle="rgba(255,"+(110+i%4*28)+",45,"+(fade*.78)+")";ctx.shadowColor="#FF6B25";ctx.shadowBlur=10;
        ctx.beginPath();ctx.arc(x,y,1.5+(i%3),0,Math.PI*2);ctx.fill();
      }

    }else if(effect.type==="spirits"){
      glow(fortress.x,fortress.y,138,"rgba(165,119,255,ALPHA)",fade);
      runeRing(fortress.x,fortress.y,42+progress*36,now/1200,"#D5B6FF",fade,12);
      runeRing(fortress.x,fortress.y,78+progress*25,-now/1600,"#9164D5",fade*.8,18);
      ctx.strokeStyle="rgba(220,198,255,"+(fade*.65)+")";ctx.lineWidth=2;
      for(let i=0;i<3;i++){
        const a=now/500+i*Math.PI*2/3;
        const x=fortress.x+Math.cos(a)*54,y=fortress.y+Math.sin(a)*31;
        ctx.beginPath();ctx.moveTo(fortress.x,fortress.y);ctx.quadraticCurveTo(x+Math.cos(a+1)*20,y-26,x,y);ctx.stroke();
        glow(x,y,26,"rgba(194,157,255,ALPHA)",fade);
        ctx.save();ctx.translate(x,y+Math.sin(now/100+i)*4);ctx.globalAlpha=fade;
        ctx.fillStyle="rgba(191,160,255,.75)";ctx.shadowColor="#C7A5FF";ctx.shadowBlur=20;
        ctx.beginPath();ctx.moveTo(0,-15);ctx.quadraticCurveTo(15,-11,12,5);ctx.quadraticCurveTo(8,19,0,23);ctx.quadraticCurveTo(-12,12,-12,3);ctx.quadraticCurveTo(-15,-10,0,-15);ctx.fill();
        ctx.fillStyle="#F4E8FF";ctx.fillRect(-5,-6,3,4);ctx.fillRect(3,-6,3,4);
        ctx.strokeStyle="#E9D8FF";ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,2,18,0,Math.PI*2);ctx.stroke();
        ctx.restore();
      }
      for(let i=0;i<12;i++){
        const a=now/700+i*Math.PI/6,r=95+Math.sin(now/160+i)*8;
        const x=fortress.x+Math.cos(a)*r,y=fortress.y+Math.sin(a)*r*.52;
        ctx.fillStyle="rgba(226,208,255,"+(fade*.8)+")";ctx.beginPath();ctx.arc(x,y,2+(i%3),0,Math.PI*2);ctx.fill();
      }

    }else if(effect.type==="wraith-strike"){
      const x=effect.x,y=effect.y,r=10+progress*32;
      glow(x,y,42,"rgba(194,151,255,ALPHA)",fade);
      runeRing(x,y,r,now/300,"#E4CEFF",fade,8);
      burst(x,y,r*1.4,"#F1E4FF",fade,10);
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
function getTotalPathLength(){const points=getPathPoints();let n=0;for(let i=0;i<points.length-1;i++)n+=Math.hypot(points[i+1].x-points[i].x,points[i+1].y-points[i].y);return n;}
function getPathPosition(progress){
  const points=getPathPoints();let d=progress*getTotalPathLength();
  for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],len=Math.hypot(b.x-a.x,b.y-a.y);if(d<=len){const t=d/len;return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}d-=len;}
  return points[points.length-1];
}
function createWaveQueue(wave){
  if(wave===5&&currentRun.encounter?.bossId)return [currentRun.encounter.bossId];
  const totalWave=(currentRun.area-1)*30+(currentRun.campsite-1)*15+(currentRun.stage-1)*5+wave;
  const count=5+wave*2+(currentRun.area-1)*3+Math.floor((totalWave-1)/8),queue=[];
  const route=currentRun.encounter?.id||"bear-cave";
  for(let i=0;i<count;i++){
    if(route==="bear-cave")queue.push(i%3===0?"brute":"riftling");
    else if(route==="wolf-den")queue.push(i%3===0?"riftwing":"riftling");
    else if(route==="goblin-camp")queue.push(i%3===0?"brute":"goblin");
    else if(route==="cinder-quarry")queue.push(i%2===0?"brute":"riftling");
    else if(route==="ash-wastes")queue.push(i%3===0?"brute":"riftwing");
    else if(route==="scavenger-crossing")queue.push(i%3===0?"riftwing":"goblin");
    else if(route==="frozen-hollow")queue.push(i%3===0?"riftwing":"riftling");
    else if(route==="wraithwood")queue.push(i%4===0?"brute":"riftling");
    else if(route==="shattered-keep")queue.push(i%2===0?"brute":"riftwing");
    else if(totalWave>=46&&i%3===0)queue.push("brute");
    else if(totalWave>=25&&i%5===2)queue.push("riftwing");
    else if(currentRun.area>=2&&wave>=3&&i%4===0)queue.push("brute");
    else if(wave>=2&&i%5===2)queue.push("riftwing");
    else if(wave>=3&&i%4===0)queue.push("brute");
    else queue.push("riftling");
  }
  return queue;
}
function startWave(automatic=false){
  if(!currentRun||currentRun.gameOver||currentRun.currentWave>=5)return;
  if(currentRun.waveActive&&!automatic)return;
  currentRun.currentWave++;
  window.riftboundPlaySfx?.("wave");
  currentRun.waveActive=true;
  currentRun.waitingForWave=false;
  currentRun.waveStarted=true;
  currentRun.spawnBatches.push({wave:currentRun.currentWave,queue:createWaveQueue(currentRun.currentWave),timer:0});
  currentRun.waveIntervalTimer=currentRun.currentWave<5?10:0;
  const total=((currentRun.campsite-1)*3+(currentRun.stage-1))*5+currentRun.currentWave;
  if(currentRun.currentWave===5&&currentRun.encounter?.bossId){
    window.riftboundSetMusicTrack?.("boss");
    setWaveStatus("BOSS ENCOUNTER");
    showBattleMessage(currentRun.encounter.name.toUpperCase()+" HAS AWAKENED!");
  }else{
    setWaveStatus("WAVE "+total+" / 30 IN PROGRESS");
    showBattleMessage("WAVE "+total+" HAS BEGUN");
  }
  updateGameDisplay();
  persistRunCheckpoint("battle");
}
function spawnEnemy(type,waveNumber){
  const d=enemyTypes[type];
  const totalWave=(currentRun.area-1)*30+(currentRun.campsite-1)*15+(currentRun.stage-1)*5+waveNumber;
  const progression=totalWave-1;
  const healthScale=areaData().enemyScale*(1+progression*.022+progression*progression*.00012);
  const damageScale=1+progression*.012+progression*progression*.00005;
  const speedScale=1+progression*.002;
  const health=d.health*healthScale*(d.boss?1.12:1);
  const trait=typeof window.getRiftboundTraitEffects==="function"?getRunTraitEffects():{};
  const enemy={type,name:d.name,x:getPathPoints()[0].x,y:getPathPoints()[0].y,health,maxHealth:health,progress:0,reward:d.reward,damage:d.damage*damageScale,speed:d.speed*speedScale,isBoss:!!d.boss};
  if(trait.slowChance&&Math.random()<trait.slowChance){enemy.slowTimer=2;enemy.slowFactor=.75;}
  currentRun.enemies.push(enemy);
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
      const trait=typeof window.getRiftboundTraitEffects==="function"?getRunTraitEffects():{};
      const bossBurn=e.isBoss?1+(currentRun.skillBonuses?.bossDamage||0)+(trait.bossDamage||0):1;
      const burnDamage=(e.burnDamage||3)*(1+(trait.burnDamage||0)+(currentRun.skillBonuses?.burnDamageBonus||0))*bossBurn*burnStep;
      const actualBurn=Math.min(Math.max(0,e.health),burnDamage);
      currentRun.stats.damageDealt+=actualBurn;
      e.health-=burnDamage;
      if(e.burnTimer<=0)e.burnDamage=3;
      if(e.health<=0&&!e.rewarded)damageEnemy(e,0,false);
    }
    if(e.burnTimer>0&&currentRun.skillBonuses?.burnSlow){e.slowTimer=Math.max(e.slowTimer||0,.2);e.slowFactor=1-currentRun.skillBonuses.burnSlow;}
    if(e.slowTimer>0)e.slowTimer=Math.max(0,e.slowTimer-dt);
    const slowPower=currentRun.skillBonuses?.slowPower||0;
    const slowFactor=e.slowTimer>0?Math.max(.25,(e.slowFactor||.55)-slowPower):1;
    e.progress+=(e.speed||enemyTypes[e.type].speed)*slowFactor*dt/getTotalPathLength();
    const p=getPathPosition(e.progress);e.x=p.x;e.y=p.y;
  });
  currentRun.enemies=currentRun.enemies.filter(e=>{
    if(e.progress>=1){if(!currentRun.devInvincible){const bonuses=currentRun.skillBonuses||{};let incomingDamage=e.damage*(currentRun.bastionTimer>0?.5:1);if(e.isBoss)incomingDamage*=1-(bonuses.bossReduction||0);if(getRunCommanderId()==="warden")incomingDamage*=1-(bonuses.damageReduction||0);currentRun.stats.damageTaken+=Math.min(currentRun.castleHealth,incomingDamage);currentRun.castleHealth=Math.max(0,currentRun.castleHealth-incomingDamage);}updateGameDisplay();if(currentRun.castleHealth<=0)endGame();return false;}return e.health>0;
  });
}
function getEnemyDamageMultiplier(target){
  if(!target)return 1;
  const bonuses=currentRun.skillBonuses||{},trait=typeof window.getRiftboundTraitEffects==="function"?getRunTraitEffects():{};
  let multiplier=1;
  if(getRunCommanderId()==="huntmaster"&&target.maxHealth>=150)multiplier*=1.2*(1+(bonuses.eliteDamage||0));
  if(target===currentRun.markedEnemy&&currentRun.markedTimer>0)multiplier*=1.6*(1+(bonuses.markedDamage||0));
  if(target.isBoss)multiplier*=1+(bonuses.bossDamage||0)+(trait.bossDamage||0);
  if(target.slowTimer>0)multiplier*=1+(bonuses.slowedDamage||0)+(trait.slowedDamage||0);
  if(target.health/target.maxHealth>.7)multiplier*=1+(bonuses.freshDamage||0);
  if(target.health/target.maxHealth<.3)multiplier*=1+(bonuses.lowDamage||0);
  return multiplier;
}
function updateTowers(dt){
  currentRun.towers.forEach(t=>{
    // Advance animated attacks and release their projectiles on the authored frame.
    if(t.type==="archer"&&t.archerAnimation?.mode==="attack"){
      const anim=t.archerAnimation;
      anim.elapsed+=dt;
      const attackFrame=Math.floor(anim.elapsed*archerAnimation.attack.fps);
      if(!anim.fired&&attackFrame>=archerAnimation.attack.releaseFrame){
        anim.fired=true;
        if(anim.target&&currentRun.enemies.includes(anim.target)){
          const target=anim.target;
          const dx=target.x-t.x,dy=target.y-t.y,length=Math.hypot(dx,dy)||1;
          const originX=t.x-38+78*archerAnimation.scaleX;
          const originY=t.y-84+43*archerAnimation.scaleY;
          currentRun.projectiles.push({
            x:originX,y:originY,target,damage:getTowerStats(t).damage*getEnemyDamageMultiplier(target),
            color:"#D8C18B",speed:getTowerStats(t).projectileSpeed,towerType:"archer",
            isArrow:true,angle:Math.atan2(dy,dx)
          });
        }
      }
      if(anim.elapsed>=archerAnimation.attack.frames/archerAnimation.attack.fps)t.archerAnimation=null;
    }
    if(t.type==="arcane"&&t.arcaneAnimation?.mode==="attack"){
      const anim=t.arcaneAnimation;
      anim.elapsed+=dt;
      const attackFrame=Math.floor(anim.elapsed*arcaneAnimation.attack.fps);
      if(!anim.fired&&attackFrame>=arcaneAnimation.attack.releaseFrame){
        anim.fired=true;
        if(anim.target&&currentRun.enemies.includes(anim.target)){
          const target=anim.target;
          const dx=target.x-t.x,dy=target.y-t.y;
          const originX=t.x-38+arcaneAnimation.projectileOriginX*arcaneAnimation.scaleX;
          const originY=t.y-84+arcaneAnimation.projectileOriginY*arcaneAnimation.scaleY;
          currentRun.projectiles.push({
            x:originX,y:originY,target,damage:getTowerStats(t).damage*getEnemyDamageMultiplier(target),
            color:"#A88BFF",speed:getTowerStats(t).projectileSpeed,towerType:"arcane",
            isArcaneOrb:true,animationTime:0,angle:Math.atan2(dy,dx)
          });
        }
      }
      if(anim.elapsed>=arcaneAnimation.attack.frames/arcaneAnimation.attack.fps)t.arcaneAnimation=null;
    }
    if(t.type==="cannon"&&t.cannonAnimation?.mode==="attack"){
      const anim=t.cannonAnimation;
      anim.elapsed+=dt;
      const attackFrame=Math.floor(anim.elapsed*cannonAnimation.attack.fps);
      if(!anim.fired&&attackFrame>=cannonAnimation.attack.releaseFrame){
        anim.fired=true;
        if(anim.target&&currentRun.enemies.includes(anim.target)){
          const target=anim.target;
          const originX=t.x-38+cannonAnimation.projectileOriginX*cannonAnimation.scaleX;
          const originY=t.y-84+cannonAnimation.projectileOriginY*cannonAnimation.scaleY;
          currentRun.projectiles.push({
            x:originX,y:originY,target,damage:getTowerStats(t).damage*getEnemyDamageMultiplier(target),
            color:"#D0C6B7",speed:getTowerStats(t).projectileSpeed,towerType:"cannon",
            isCannonBall:true,angle:Math.atan2(target.y-originY,target.x-originX)
          });
        }
      }
      if(anim.elapsed>=cannonAnimation.attack.frames/cannonAnimation.attack.fps)t.cannonAnimation=null;
    }
    const s=getTowerStats(t);t.cooldown-=dt;if(t.cooldown>0)return;
    let target=null,best=-1;
    const marked=currentRun.markedTimer>0?currentRun.markedEnemy:null;
    if(marked&&currentRun.enemies.includes(marked)&&Math.hypot(marked.x-t.x,marked.y-t.y)<=s.range)target=marked;
    if(!target)currentRun.enemies.forEach(e=>{if(Math.hypot(e.x-t.x,e.y-t.y)<=s.range&&e.progress>best){best=e.progress;target=e;}});
    if(!target)return;
    const targetBonus=getEnemyDamageMultiplier(target);
    if(t.type==="archer"){
      t.archerAnimation={mode:"attack",elapsed:0,fired:false,target};
    }else if(t.type==="arcane"){
      t.arcaneAnimation={mode:"attack",elapsed:0,fired:false,target};
    }else if(t.type==="cannon"){
      t.cannonAnimation={mode:"attack",elapsed:0,fired:false,target};
    }else{
      currentRun.projectiles.push({x:t.x,y:t.y,target,damage:s.damage*targetBonus,color:s.color,speed:s.projectileSpeed,towerType:t.type});
    }
    t.cooldown=s.cooldown*(currentRun.bastionTimer>0?.8:1);
  });
}
function damageEnemy(e,dmg,applyPassive=true){
  if(!e||e.rewarded)return;
  const bonuses=currentRun.skillBonuses||{},trait=typeof window.getRiftboundTraitEffects==="function"?getRunTraitEffects():{};
  if(!applyPassive&&dmg>0&&e.isBoss)dmg*=1+(bonuses.bossDamage||0)+(trait.bossDamage||0);
  e.health-=dmg;
  const dealt=Math.max(0,Math.min(Math.max(0,e.health+dmg),dmg));
  currentRun.stats.damageDealt+=dealt;
  if(applyPassive&&dmg>0&&Math.random()<(getRunCommanderId()==="pyromancer"?.25:0)+(bonuses.burnChance||0)) {
    e.burnTimer=Math.max(e.burnTimer||0,3+(trait.burnDuration||0)+(bonuses.burnDuration||0));
    e.burnDamage=3+(bonuses.burnDamage||0);
  }
  if(applyPassive&&dmg>0&&trait.slowChance&&Math.random()<trait.slowChance){e.slowTimer=Math.max(e.slowTimer||0,2);e.slowFactor=.75;}
  if(e.health<=0&&!e.rewarded){
    e.rewarded=true;currentRun.stats.enemiesKilled++;
    const cardBonus=currentRun.cards.filter(c=>c==="greed").length*3;
    const commanderBonus=getRunCommanderId()==="treasurer"?2:0;
    const goldMultiplier=1+(bonuses.goldBonus||0)+(trait.goldBonus||0)+(e.maxHealth>=150?(bonuses.eliteGold||0):0);
    currentRun.gold+=Math.floor((e.reward+cardBonus+commanderBonus)*goldMultiplier);
    if(e.isBoss){
      currentRun.stats.bossesDefeated++;
      if(!currentRun.defeatedBosses.includes(e.type))currentRun.defeatedBosses.push(e.type);
      const bossBonus=Math.floor((150+currentRun.area*75)*(1+(trait.bossGold||0)+(bonuses.bossGold||0)))+(bonuses.bossGoldFlat||0);
      currentRun.gold+=bossBonus;
      showBattleMessage("BOSS DEFEATED · "+(e.name||enemyTypes[e.type].name)+" · BONUS "+bossBonus+" GOLD");
    }
    if(bonuses.burnSpread&&e.burnTimer>0){currentRun.enemies.forEach(other=>{if(other!==e&&Math.hypot(other.x-e.x,other.y-e.y)<58){other.burnTimer=Math.max(other.burnTimer||0,2);other.burnDamage=Math.max(other.burnDamage||0,2);}});}
    const summonChance=.2+(bonuses.summonChance||0)+(trait.summonChance||0);
    const guaranteedSoul=bonuses.everyFifthSoul&&currentRun.stats.enemiesKilled%5===0;
    if(applyPassive&&getRunCommanderId()==="necromancer"&&(Math.random()<summonChance||guaranteedSoul)){
      currentRun.spectralAllies.push({
        life:4+(bonuses.summonDuration||0)+(trait.summonDuration||0),cooldown:0,damage:(18+(bonuses.summonDamage||0))*(1+(bonuses.summonDamageBonus||0)),interval:.85,
        x:895,y:270,orbitAngle:Math.random()*Math.PI*2,attacking:0
      });
      showBattleMessage("SOUL HARVESTED · A SPECTRAL ALLY JOINS THE FIGHT");
    }
    updateGameDisplay();
  }
}
function updateSpectralAllies(dt){
  if(!currentRun.spectralAllies?.length)return;
  const center={x:895,y:270};
  currentRun.spectralAllies=currentRun.spectralAllies.filter((ally,index)=>{
    // Keep newly spawned or older saved allies on the battlefield.
    if(!Number.isFinite(ally.x)||!Number.isFinite(ally.y)){
      const angle=index*Math.PI*2/3;
      ally.x=center.x+Math.cos(angle)*24;
      ally.y=center.y+Math.sin(angle)*18;
    }
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
      const summonBossBonus=target.isBoss?(currentRun.skillBonuses?.summonBossDamage||0):0;
      damageEnemy(target,(ally.damage||18)*(1+summonBossBonus),false);
      if(currentRun.skillBonuses?.wraithSlow){target.slowTimer=Math.max(target.slowTimer||0,2);target.slowFactor=.8;}
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
    enemies.forEach(enemy=>{enemy.slowTimer=Math.max(enemy.slowTimer||0,5+(currentRun.skillBonuses?.slowDuration||0));enemy.slowFactor=.55;const amount=120*(1+(currentRun.skillBonuses?.abilityDamage||0));damageEnemy(enemy,amount,false);if(currentRun.skillBonuses?.abilityEcho)damageEnemy(enemy,amount*currentRun.skillBonuses.abilityEcho,false);});
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
    const decreeGold=125+(currentRun.skillBonuses?.abilityGold||0);currentRun.gold+=decreeGold;
    effect={type:"gold",life:2.1,duration:2.1};
    showBattleMessage("ROYAL DECREE · "+decreeGold+" GOLD HAS BEEN GRANTED");
    updateGameDisplay();
  }else if(id==="pyromancer"){
    const trait=getRunTraitEffects();
    enemies.forEach(enemy=>{enemy.burnTimer=Math.max(enemy.burnTimer||0,5+(currentRun.skillBonuses?.burnDuration||0)+(trait.burnDuration||0));enemy.burnDamage=6+(currentRun.skillBonuses?.burnDamage||0);damageEnemy(enemy,65*(1+(currentRun.skillBonuses?.abilityDamage||0)+(currentRun.skillBonuses?.areaDamage||0)),false);});
    effect={type:"inferno",life:3,duration:3};
    showBattleMessage("INFERNO · THE BATTLEFIELD ERUPTS IN FLAME");
  }else if(id==="necromancer"){
    const trait=getRunTraitEffects();
    for(let i=0;i<3+(currentRun.skillBonuses?.extraWraith||0);i++){
      const angle=i*Math.PI*2/3;
      currentRun.spectralAllies.push({life:12+(currentRun.skillBonuses?.summonDuration||0)+(trait.summonDuration||0),cooldown:.35+i*.18,damage:(18+(currentRun.skillBonuses?.summonDamage||0))*(1+(currentRun.skillBonuses?.summonDamageBonus||0)),interval:.85,
        x:895+Math.cos(angle)*24,y:270+Math.sin(angle)*18,orbitAngle:angle,attacking:0});
    }
    effect={type:"spirits",life:2.8,duration:2.8};
    showBattleMessage("RAISE THE FALLEN · THREE WRAITHS JOIN THE BATTLE");
  }
  if(effect)currentRun.abilityEffects.push(effect);
  if(window.riftboundPlayCommanderSfx)window.riftboundPlayCommanderSfx(id);
  const cooldownReduction=currentRun.skillBonuses?.cooldown||0;
  currentRun.abilityCooldown=Math.max(5,ability.cooldown*(1-cooldownReduction));
  const abilityButton=document.getElementById("commander-ability-button");
  if(abilityButton){
    abilityButton.classList.remove("ability-activated");
    void abilityButton.offsetWidth;
    abilityButton.classList.add("ability-activated");
    window.setTimeout(()=>abilityButton.classList.remove("ability-activated"),700);
  }
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
    if(p.isArcaneOrb)p.animationTime=(p.animationTime||0)+dt;
    const e=p.target;if(!currentRun.enemies.includes(e)||e.health<=0)return false;
    const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy);if(d>0)p.angle=Math.atan2(dy,dx);if(d<=p.speed*dt+8){damageEnemy(e,p.damage);
      if(p.towerType==="cannon"){const trait=typeof window.getRiftboundTraitEffects==="function"?getRunTraitEffects():{};currentRun.enemies.forEach(other=>{if(other!==e&&Math.hypot(other.x-e.x,other.y-e.y)<48+(trait.cannonSplash||0))damageEnemy(other,p.damage*.5*getEnemyDamageMultiplier(other));});}
      return false;
    }p.x+=dx/d*p.speed*dt;p.y+=dy/d*p.speed*dt;return true;
  });currentRun.enemies=currentRun.enemies.filter(e=>e.health>0);
}
function checkWaveCompletion(){
  if(!currentRun.waveActive||currentRun.spawnBatches.length||currentRun.enemies.length)return;
  currentRun.projectiles=[];
  if(currentRun._lastCountedWave!==currentRun.currentWave){currentRun._lastCountedWave=currentRun.currentWave;currentRun.stats.wavesCompleted++;}
  if(currentRun.currentWave>=5){
    currentRun.waveActive=false;
    currentRun.waveIntervalTimer=0;
    const completedWaves=(currentRun.area-1)*30+(currentRun.campsite-1)*15+(currentRun.stage-1)*5+5;
    currentRun.pendingCompletedWaves=completedWaves;
    currentRun.currentWave=0;
    updateGameDisplay();
    if(completedWaves>=90){
      currentRun.runFinished=true;
      showRunCompleteScreen();
      return;
    }
    if(completedWaves%15===0){
      arriveAtCampfire(completedWaves);
      return;
    }
    currentRun.pendingCardSelection=true;
    persistRunCheckpoint("reward");
    showCardSelection();
    return;
  }
  const total=((currentRun.campsite-1)*3+(currentRun.stage-1))*5+currentRun.currentWave;
  setWaveStatus("WAVE "+total+" CLEARED · NEXT WAVE IN "+Math.ceil(currentRun.waveIntervalTimer)+"s");
  showBattleMessage("WAVE CLEARED. THE NEXT GROUP IS APPROACHING.");
}
function finalizeRun(victory){
  if(!currentRun||currentRun.finalized)return;
  currentRun.finalized=true;
  const stats=currentRun.stats||{},classId=currentRun.commanderId||"warden";
  const xp=typeof window.calculateRiftboundRunXP==="function"?window.calculateRiftboundRunXP(stats,victory):stats.wavesCompleted*18+stats.enemiesKilled*2+(victory?220:0);
  const result=typeof window.awardRiftboundClassXP==="function"?window.awardRiftboundClassXP(classId,xp):{level:1,levelsGained:0,skillPointsGained:0};
  currentRun.xpAwarded=xp;
  document.getElementById("result-xp").textContent="+"+xp+" XP";
  document.getElementById("result-level-summary").textContent=classId.toUpperCase()+" · LEVEL "+result.level;
  const levelups=document.getElementById("result-levelups");
  if(result.levelsGained){levelups.hidden=false;levelups.textContent="LEVEL UP ×"+result.levelsGained+" · +"+result.skillPointsGained+" SKILL POINT"+(result.skillPointsGained===1?"":"S")+" EARNED";}
  else{levelups.hidden=true;levelups.textContent="";}
  const rows=[
    ["TOTAL DAMAGE DEALT",Math.floor(stats.damageDealt||0).toLocaleString()],
    ["DAMAGE TAKEN",Math.floor(stats.damageTaken||0).toLocaleString()],
    ["GOLD SPENT",Math.floor(stats.goldSpent||0).toLocaleString()],
    ["GOLD REMAINING",Math.floor(currentRun.gold||0).toLocaleString()],
    ["ENEMIES DEFEATED",Math.floor(stats.enemiesKilled||0).toLocaleString()],
    ["WAVES COMPLETED",Math.floor(stats.wavesCompleted||0).toLocaleString()],
    ["BOSSES DEFEATED",Math.floor(stats.bossesDefeated||0).toLocaleString()]
  ];
  document.getElementById("result-stats").innerHTML=rows.map(([label,value])=>'<div class="result-stat-row"><span>'+label+'</span><strong>'+value+'</strong></div>').join("");
  document.getElementById("result-stats").hidden=true;
  document.getElementById("result-stats-toggle").textContent="VIEW RUN STATISTICS";
}
function endGame(){
  if(currentRun.gameOver)return;currentRun.gameOver=true;currentRun.waveActive=false;stopGameLoop();setWaveStatus("DEFEAT");showBattleMessage("THE CASTLE HAS FALLEN");
  document.getElementById("result-eyebrow").textContent="THE FORTRESS HAS FALLEN";document.getElementById("result-title").textContent="DEFEAT";
  document.getElementById("result-description").textContent="Your expedition ended in area "+currentRun.area+". The fortress will rise again.";
  finalizeRun(false);document.getElementById("result-continue").textContent="RETURN TO LOBBY";document.getElementById("result-overlay").hidden=false;
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
  if(!currentRun||!pendingCards.some(card=>card.id===id))return;
  const completedWaves=(currentRun.area-1)*30+(currentRun.campsite-1)*15+(currentRun.stage-1)*5+5;
  currentRun.cards.push(id);
  if(id==="walls"){currentRun.maxCastleHealth+=20;currentRun.castleHealth=Math.min(currentRun.maxCastleHealth,currentRun.castleHealth+20);}
  document.getElementById("card-overlay").hidden=true;
  currentRun.pendingCardSelection=false;
  if(completedWaves>=90){currentRun.runFinished=true;showRunCompleteScreen();return;}
  currentRun.pendingRoute=true;currentRun.pendingCompletedWaves=completedWaves;currentRun.currentWave=0;
  persistRunCheckpoint("destination");
  showDestinationSelection(completedWaves);
}
let pendingDestinationChoices=[];
let pendingDestinationProgress=null;
function nextProgressionAfterStage(){
  let area=currentRun.area,campsite=currentRun.campsite,stage=currentRun.stage;
  if(stage<3)stage++;
  else if(campsite<2){campsite++;stage=1;}
  else if(area<3){area++;campsite=1;stage=1;}
  return {area,campsite,stage};
}
function showDestinationSelection(completedWaves){
  pendingDestinationProgress=nextProgressionAfterStage();
  const areaIndex=pendingDestinationProgress.area-1;
  const pool=destinationPools[areaIndex];
  const available=pool.filter(node=>node.kind!=="BOSS"||!currentRun.defeatedBosses.includes(node.bossId));
  const shuffled=[...available].sort(()=>Math.random()-.5);
  pendingDestinationChoices=shuffled.slice(0,3);
  while(pendingDestinationChoices.length<3){
    const normal=pool.filter(node=>node.kind!=="BOSS");
    const extra=normal[Math.floor(Math.random()*normal.length)];
    if(extra&&!pendingDestinationChoices.some(node=>node.id===extra.id))pendingDestinationChoices.push(extra);
    else break;
  }
  const area=areas[areaIndex];
  document.getElementById("progress-area").textContent="AREA 0"+pendingDestinationProgress.area+" · "+area.name.toUpperCase()+" · "+(pendingDestinationProgress.campsite===1?"FIRST":"SECOND")+" EXPEDITION";
  const container=document.getElementById("destination-options");
  container.innerHTML="";
  pendingDestinationChoices.forEach(node=>{
    const card=document.createElement("article");
    card.className="destination-card "+(node.kind==="BOSS"?"destination-boss":"");
    card.innerHTML='<span class="destination-kind">'+node.kind+'</span><span class="destination-icon">'+node.icon+'</span><h3>'+node.name+'</h3><p>'+node.description+'</p><small>'+node.reward+'</small><button type="button">CHOOSE ROUTE</button>';
    card.querySelector("button").addEventListener("click",()=>chooseDestination(node.id,completedWaves));
    container.appendChild(card);
  });
  document.getElementById("progress-wave").textContent="A boss lair is a dangerous optional route. Defeating its guardian grants extra gold and class XP.";
  document.getElementById("progress-overlay").hidden=false;
  stopGameLoop();
}
function arriveAtCampfire(completedWaves){
  pendingDestinationProgress=nextProgressionAfterStage();
  const areaIndex=pendingDestinationProgress.area-1;
  const normalRoutes=destinationPools[areaIndex].filter(node=>node.kind!=="BOSS");
  const node=normalRoutes[Math.floor(Math.random()*normalRoutes.length)]||normalRoutes[0];
  const previousArea=currentRun.area;
  currentRun.area=pendingDestinationProgress.area;
  currentRun.campsite=pendingDestinationProgress.campsite;
  currentRun.stage=pendingDestinationProgress.stage;
  if(node)currentRun.encounter={id:node.id,name:node.name,kind:node.kind,bossId:null};
  if(currentRun.area!==previousArea)relocateTowersForCurrentArea();
  currentRun.currentWave=0;currentRun.enemies=[];currentRun.projectiles=[];currentRun.spawnBatches=[];
  currentRun.waveActive=false;currentRun.waitingForWave=false;currentRun.waveStarted=false;
  currentRun.waveIntervalTimer=0;currentRun._lastCountedWave=0;
  currentRun.pendingCardSelection=false;currentRun.pendingRoute=false;
  currentRun.pendingCompletedWaves=completedWaves;currentRun.campsiteRestUsed=false;
  selectedTowerEntity=null;selectedTower=null;
  document.querySelectorAll(".tower-button").forEach(button=>button.classList.remove("selected"));
  updateAreaLabels();updateGameDisplay();
  persistRunCheckpoint("campsite");
  showCampsiteScreen(completedWaves);
}
function chooseDestination(id,completedWaves){
  const node=pendingDestinationChoices.find(choice=>choice.id===id);
  if(!node||!pendingDestinationProgress)return;
  const previousArea=currentRun.area;
  currentRun.area=pendingDestinationProgress.area;currentRun.campsite=pendingDestinationProgress.campsite;currentRun.stage=pendingDestinationProgress.stage;
  currentRun.encounter={id:node.id,name:node.name,kind:node.kind,bossId:node.bossId||null};
  if(currentRun.skillBonuses?.stageGold)currentRun.gold+=currentRun.skillBonuses.stageGold;
  if(currentRun.skillBonuses?.stageHeal)currentRun.castleHealth=Math.min(currentRun.maxCastleHealth,currentRun.castleHealth+currentRun.skillBonuses.stageHeal);
  if(currentRun.area!==previousArea)relocateTowersForCurrentArea();
  currentRun.currentWave=0;currentRun.enemies=[];currentRun.projectiles=[];currentRun.spawnBatches=[];currentRun.waveActive=false;currentRun.waitingForWave=false;currentRun.waveStarted=false;currentRun.waveIntervalTimer=0;currentRun._lastCountedWave=0;
  currentRun.pendingRoute=false;currentRun.pendingCardSelection=false;currentRun.pendingCompletedWaves=0;
  currentRun.campsiteRestUsed=false;selectedTowerEntity=null;selectedTower=null;
  document.querySelectorAll(".tower-button").forEach(button=>button.classList.remove("selected"));
  document.getElementById("progress-overlay").hidden=true;
  updateAreaLabels();updateGameDisplay();
  persistRunCheckpoint(completedWaves%15===0?"campsite":"battle");
  if(completedWaves%15===0){showCampsiteScreen(completedWaves);return;}
  setWaveStatus("READY WHEN YOU ARE");
  showBattleMessage(node.kind==="BOSS"?"BOSS LAIR SELECTED · "+node.name.toUpperCase():"DESTINATION SELECTED · "+node.name.toUpperCase());
  startGameLoop();
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
  const clearance=20,points=getPathPoints();
  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1],dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;
    let t=((x-a.x)*dx+(y-a.y)*dy)/l;t=Math.max(0,Math.min(1,t));
    if(Math.hypot(x-(a.x+t*dx),y-(a.y+t*dy))<clearance)return true;
  }
  return false;
}
function isValidTowerSpot(x,y,ignoreTower=null){
  if(!Number.isFinite(x)||!Number.isFinite(y))return false;
  if(x<42||x>918||y<42||y>498||isOnPath(x,y)||Math.hypot(x-75,y-270)<68||(x>824&&y>194&&y<346))return false;
  if(getTreePositions().some(([tx,ty])=>Math.hypot(x-tx,y-ty)<43))return false;
  if(currentRun.towers.some(t=>t!==ignoreTower&&Math.hypot(x-t.x,y-t.y)<44))return false;
  return true;
}
function relocateTowersForCurrentArea(){
  if(!currentRun)return;
  let moved=0;
  currentRun.towers.forEach(t=>{
    if(isValidTowerSpot(t.x,t.y,t))return;
    let found=null;
    for(let radius=12;radius<=360&&!found;radius+=12){
      for(let step=0;step<48;step++){
        const angle=step*Math.PI*2/48;
        const x=Math.round((t.x+Math.cos(angle)*radius)/6)*6;
        const y=Math.round((t.y+Math.sin(angle)*radius)/6)*6;
        if(isValidTowerSpot(x,y,t)){found={x,y};break;}
      }
    }
    if(found){t.x=found.x;t.y=found.y;moved++;}
  });
  if(moved)showBattleMessage(moved+" TOWER"+(moved===1?"":"S")+" REPOSITIONED TO CLEAR THE NEW ROAD");
}
function canBuild(x,y,checkGold=true){
  if(!isValidTowerSpot(x,y))return false;
  return !checkGold||currentRun.gold>=towerTypes[selectedTower].cost;
}
function canvasPoint(e){
  const rect=canvas.getBoundingClientRect();
  // The canvas has no CSS border: its outline is purely decorative and does
  // not change the drawing area. Map the full visible rectangle to its bitmap.
  if(!rect.width||!rect.height)return{x:0,y:0};
  return {
    x:Math.max(0,Math.min(canvas.width,(e.clientX-rect.left)*(canvas.width/rect.width))),
    y:Math.max(0,Math.min(canvas.height,(e.clientY-rect.top)*(canvas.height/rect.height)))
  };
}
function handleBattlefieldClick(e){
  const p=canvasPoint(e);
  const hit=[...currentRun.towers].reverse().find(t=>Math.abs(p.x-t.x)<=20&&Math.abs(p.y-t.y)<=20);
  if(hit){selectedTowerEntity=hit;selectedTower=null;document.querySelectorAll(".tower-button").forEach(b=>b.classList.remove("selected"));updateTowerPanel();showBattleMessage(towerTypes[hit.type].name.toUpperCase()+" SELECTED");return;}
  if(!selectedTower){selectedTowerEntity=null;updateTowerPanel();return;}
  const type=towerTypes[selectedTower];
  if(getTowerCount(selectedTower)>=TOWER_LIMIT_PER_TYPE){showBattleMessage("MAX "+selectedTower.toUpperCase()+" TOWERS PLACED · 5/5");updateTowerButtons();return;}
  if(currentRun.gold<type.cost){showBattleMessage("NOT ENOUGH GOLD");return;}
  if(!canBuild(p.x,p.y)){showBattleMessage("THAT LOCATION IS BLOCKED — TRY ANOTHER OPEN AREA");return;}
  currentRun.gold-=type.cost;currentRun.stats.goldSpent+=type.cost;currentRun.towers.push({type:selectedTower,x:p.x,y:p.y,cooldown:0,level:1,investedGold:type.cost,upgrades:{damage:0,range:0,speed:0}});
  window.riftboundPlaySfx?.("build");
  updateGameDisplay();persistRunCheckpoint("battle");showBattleMessage(type.name.toUpperCase()+" BUILT");
}
function selectTower(type){
  if(!towerTypes[type])return;selectedTower=type;selectedTowerEntity=null;
  document.querySelectorAll(".tower-button").forEach(b=>b.classList.toggle("selected",b.dataset.tower===type));
  updateTowerPanel();showBattleMessage(type.toUpperCase()+" SELECTED — CLICK AN OPEN AREA TO BUILD");
}
function getTowerInvestment(t){
  if(Number.isFinite(t.investedGold))return Math.max(0,t.investedGold);
  const base=towerTypes[t.type]?.cost||0;
  let total=base;
  for(let level=1;level<t.level;level++)total+=(towerTypes[t.type]?.upgradeCost||0)+(level-1)*35;
  return total;
}
function sellSelectedTower(){
  const t=selectedTowerEntity;if(!t||!currentRun)return;
  const index=currentRun.towers.indexOf(t);if(index<0)return;
  const refund=Math.floor(getTowerInvestment(t)*.5);
  currentRun.gold+=refund;
  currentRun.towers.splice(index,1);
  selectedTowerEntity=null;selectedTower=null;
  updateGameDisplay();persistRunCheckpoint("battle");
  showBattleMessage("TOWER DISMANTLED · "+refund+" GOLD REFUNDED");
}
function getTowerUpgradeCost(t){
  const trait=typeof window.getRiftboundTraitEffects==="function"?getRunTraitEffects():{};
  const reduction=Math.min(.6,(trait.costReduction||0)+(currentRun?.skillBonuses?.costReduction||0));
  return Math.max(1,Math.ceil((towerTypes[t.type].upgradeCost+(t.level-1)*35)*(1-reduction)));
}
function upgradeSelectedTower(stat){
  const t=selectedTowerEntity;if(!t||!currentRun)return;const cost=getTowerUpgradeCost(t);
  if(t.level>=4){showBattleMessage("THIS TOWER IS FULLY UPGRADED");return;}
  if(currentRun.gold<cost){showBattleMessage("NOT ENOUGH GOLD FOR THIS UPGRADE");return;}
  currentRun.gold-=cost;currentRun.stats.goldSpent+=cost;t.investedGold=getTowerInvestment(t)+cost;t.upgrades[stat]=(t.upgrades[stat]||0)+1;t.level++;t.cooldown=0;updateGameDisplay();persistRunCheckpoint("battle");showBattleMessage(towerTypes[t.type].name.toUpperCase()+" UPGRADED");
}
function updateTowerPanel(){
  const panel=document.getElementById("tower-info-panel");if(!panel)return;
  if(!selectedTowerEntity){panel.innerHTML='<div class="tower-panel-empty"><span class="panel-symbol">✧</span><strong> TOWER DETAILS</strong><p>Select a placed tower to view its statistics and upgrades. Select a tower below to build.</p></div>';return;}
  const t=selectedTowerEntity,s=getTowerStats(t),cost=getTowerUpgradeCost(t),disabled=t.level>=4||currentRun.gold<cost;
  panel.innerHTML='<div class="tower-panel-heading"><span class="panel-symbol">'+(t.type==="archer"?"♜":t.type==="arcane"?"✧":"◆")+'</span><div><small>LEVEL '+t.level+'</small><strong>'+towerTypes[t.type].name+'</strong></div></div>'+
    '<div class="tower-stat"><span>Damage</span><strong>'+Math.round(s.damage)+'</strong></div>'+
    '<div class="tower-stat"><span>Cooldown</span><strong>'+s.cooldown.toFixed(2)+'s</strong></div>'+
    '<div class="tower-stat"><span>Range</span><strong>'+Math.round(s.range)+' px</strong></div>'+
    '<p class="panel-upgrade-title">UPGRADE · '+cost+' GOLD</p>'+
    '<button class="tower-upgrade-button" '+(disabled?'disabled':'')+' data-upgrade="damage">Increase damage <span>+30% base damage</span></button>'+
    '<button class="tower-upgrade-button" '+(disabled?'disabled':'')+' data-upgrade="range">Increase range <span>+22 px</span></button>'+
    '<button class="tower-upgrade-button" '+(disabled?'disabled':'')+' data-upgrade="speed">Faster attacks <span>-0.16s cooldown</span></button>'+
    '<p class="panel-hint">'+(t.level>=4?"MAX LEVEL REACHED":"Each upgrade increases the tower level. Maximum level: 4.")+'</p>'+
    '<div class="tower-sell-summary"><span>INVESTED · '+getTowerInvestment(t)+' G</span><strong>REFUND · '+Math.floor(getTowerInvestment(t)*.5)+' G</strong></div>'+
    '<button class="tower-sell-button" type="button" data-sell-tower>DISMANTLE TOWER · '+Math.floor(getTowerInvestment(t)*.5)+' G</button>';
  panel.querySelectorAll("[data-upgrade]").forEach(b=>b.addEventListener("click",()=>upgradeSelectedTower(b.dataset.upgrade)));
  panel.querySelector("[data-sell-tower]")?.addEventListener("click",sellSelectedTower);
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
// Destination choices now advance the expedition directly.
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
  const trait=typeof window.getRiftboundTraitEffects==="function"?getRunTraitEffects():{};
  const reduction=Math.min(.6,(trait.costReduction||0)+(currentRun.skillBonuses?.costReduction||0));
  const healCost=Math.max(1,Math.ceil(40*(1-reduction)));
  const upgradeCost=Math.max(1,Math.ceil(100*(1-reduction)));
  document.getElementById("campsite-heal").textContent="RESTORE CASTLE · "+healCost+" G";
  document.getElementById("campsite-upgrade").textContent="SHARPEN THE ARSENAL · "+upgradeCost+" G";
  document.getElementById("campsite-heal").disabled=currentRun.gold<healCost||currentRun.castleHealth>=currentRun.maxCastleHealth;
  document.getElementById("campsite-upgrade").disabled=currentRun.gold<upgradeCost;
}
function restByCampfire(){
  if(!currentRun||currentRun.campsiteRestUsed||currentRun.castleHealth>=currentRun.maxCastleHealth)return;
  currentRun.campsiteRestUsed=true;currentRun.castleHealth=Math.min(currentRun.maxCastleHealth,currentRun.castleHealth+15);updateCampsiteScreen();persistRunCheckpoint("campsite");
}
function healAtCampsite(){
  if(!currentRun||currentRun.castleHealth>=currentRun.maxCastleHealth)return;
  const trait=typeof window.getRiftboundTraitEffects==="function"?getRunTraitEffects():{};const reduction=Math.min(.6,(trait.costReduction||0)+(currentRun.skillBonuses?.costReduction||0));const cost=Math.max(1,Math.ceil(40*(1-reduction)));if(currentRun.gold<cost)return;currentRun.gold-=cost;currentRun.stats.goldSpent+=cost;currentRun.castleHealth=Math.min(currentRun.maxCastleHealth,currentRun.castleHealth+30);updateCampsiteScreen();persistRunCheckpoint("campsite");
}
function upgradeAtCampsite(){
  if(!currentRun)return;
  const trait=typeof window.getRiftboundTraitEffects==="function"?getRunTraitEffects():{};const reduction=Math.min(.6,(trait.costReduction||0)+(currentRun.skillBonuses?.costReduction||0));const cost=Math.max(1,Math.ceil(100*(1-reduction)));if(currentRun.gold<cost)return;currentRun.gold-=cost;currentRun.stats.goldSpent+=cost;currentRun.towerDamageBonus+=10;updateCampsiteScreen();persistRunCheckpoint("campsite");
}
window.devRiftboundForceCampfire=function(){
  if(!currentRun||currentRun.finalized)return false;
  currentRun.stage=3;
  const completedWaves=(currentRun.area-1)*30+(currentRun.campsite-1)*15+15;
  if(completedWaves>=90)return false;
  arriveAtCampfire(completedWaves);
  return true;
};
function showCampsiteScreen(completedWaves){
  window.riftboundSetMusicTrack?.("campfire");
  stopGameLoop();
  document.getElementById("main-menu").style.display="none";
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
  window.riftboundSetMusicTrack?.("battle");
  document.getElementById("campsite-screen").hidden=true;
  document.getElementById("game-screen").hidden=false;
  updateGameDisplay();
  setWaveStatus("READY WHEN YOU ARE");
  showBattleMessage("YOU ARE RESTED. PREPARE YOUR DEFENSE, THEN START THE NEXT WAVE.");
  startGameLoop();
}
function showRunCompleteScreen(){
  stopGameLoop();
  document.getElementById("main-menu").style.display="none";
  document.getElementById("game-screen").hidden=true;
  document.getElementById("campsite-screen").hidden=true;
  document.getElementById("card-overlay").hidden=true;
  document.getElementById("progress-overlay").hidden=true;
  document.getElementById("result-eyebrow").textContent="THE RIFT HAS BEEN SEALED";
  document.getElementById("result-title").textContent="EXPEDITION COMPLETE";
  document.getElementById("result-description").textContent="You survived the final realm and sealed the Rift.";
  finalizeRun(true);
  document.getElementById("result-continue").textContent="RETURN TO LOBBY";
  document.getElementById("result-overlay").hidden=false;
}
