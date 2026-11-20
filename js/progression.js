/* RIFTBOUND — CLASS PROGRESSION, SKILL TREES AND TRAITS */
(() => {
  "use strict";
  const CLASS_IDS=["warden","arcanist","huntmaster","treasurer","pyromancer","necromancer"];
  const MILESTONES=[5,10,15,20];
  const STORAGE_KEY="riftbound-class-progression-v1";
  const legacyBonuses=window.getRiftboundSkillBonuses;
  const traitList=[
    {index:"01",id:"bulwarks-oath",name:"Bulwark's Oath",rarity:"COMMON",icon:"⬡",description:"The fortress begins each expedition with 10% more maximum health.",synergy:"The Warden",good:["warden"],effects:{fortressHp:.10}},
    {index:"02",id:"hawks-eye",name:"Hawk's Eye",rarity:"COMMON",icon:"➶",description:"Archer Towers deal 12% more damage.",synergy:"The Huntmaster",good:["huntmaster"],effects:{archerDamage:.12}},
    {index:"03",id:"coin-scent",name:"Coin Scent",rarity:"COMMON",icon:"◈",description:"Defeated enemies drop 10% more gold.",synergy:"The Treasurer",good:["treasurer"],effects:{goldBonus:.10}},
    {index:"04",id:"frost-sigil",name:"Frost Sigil",rarity:"RARE",icon:"❄",description:"Tower hits have a 12% chance to slow an enemy for 2 seconds.",synergy:"The Arcanist",good:["arcanist"],effects:{slowChance:.12}},
    {index:"05",id:"ember-heart",name:"Ember Heart",rarity:"RARE",icon:"♨",description:"Burn effects deal 25% more damage and last 1 second longer.",synergy:"The Pyromancer",good:["pyromancer"],effects:{burnDamage:.25,burnDuration:1}},
    {index:"06",id:"soul-conduit",name:"Soul Conduit",rarity:"EPIC",icon:"☠",description:"Spectral allies are summoned 50% more often and remain for 2 extra seconds.",synergy:"The Necromancer",good:["necromancer"],effects:{summonChance:.10,summonDuration:2}},
    {index:"07",id:"siege-savant",name:"Siege Savant",rarity:"EPIC",icon:"◆",description:"Cannon Towers deal 18% more damage and their splash radius is increased.",synergy:"The Treasurer or Warden",good:["treasurer","warden"],effects:{cannonDamage:.18,cannonSplash:18}},
    {index:"08",id:"rift-tactician",name:"Rift Tactician",rarity:"LEGENDARY",icon:"✧",description:"Towers deal 20% more damage to slowed enemies.",synergy:"The Arcanist",good:["arcanist"],effects:{slowedDamage:.20}},
    {index:"09",id:"golden-forge",name:"Golden Forge",rarity:"LEGENDARY",icon:"♛",description:"Tower upgrades and campsite services cost 15% less gold.",synergy:"The Treasurer",good:["treasurer"],effects:{costReduction:.15}},
    {index:"10",id:"worldbreaker",name:"Worldbreaker",rarity:"MYTHIC",icon:"✹",description:"Deal 25% more damage to bosses and earn 20% more boss gold.",synergy:"The Huntmaster or Pyromancer",good:["huntmaster","pyromancer"],effects:{bossDamage:.25,bossGold:.20}}
  ];
  const coreTrees={
    warden:{title:"BASTION ROOT",tagline:"Turn the fortress into an unbreakable anchor.",nodes:[
      {id:"stone-heart",name:"Stone Heart",icon:"⬡",desc:"Increase maximum fortress health.",effect:"fortressHp",per:.025,format:"+2.5% health / rank"},
      {id:"unyielding",name:"Unyielding",icon:"⛨",desc:"Reduce damage dealt to the fortress.",effect:"damageReduction",per:.025,format:"2.5% less damage / rank"},
      {id:"iron-discipline",name:"Iron Discipline",icon:"⚔",desc:"Increase tower attack speed.",effect:"towerSpeed",per:.025,format:"+2.5% attack speed / rank"}],
      forks:[
        [["Bastion Protocol","Gain 15% maximum fortress health.",{fortressHp:.15}],["Reinforced Volley","Towers deal 12% more damage while the fortress is above half health.",{healthyDamage:.12}]],
        [["Last Stand","Towers fire 20% faster below 35% fortress health.",{lowHealthSpeed:.20}],["Stone Renewal","Restore 12 fortress health after each destination.",{stageHeal:12}]],
        [["Iron Rain","Cannon Towers deal 25% more damage.",{cannonDamage:.25}],["Guardian Sigils","Boss attacks deal 20% less fortress damage.",{bossReduction:.20}]],
        [["Unbreakable","Gain 50 maximum fortress health and restore 50.",{flatHealth:50}],["Fortress of Dawn","All towers deal 15% more damage and gain 10% range.",{damage:.15,range:.10}]]]},
    arcanist:{title:"RIFT ROOT",tagline:"Bend the battlefield with arcane force and control.",nodes:[
      {id:"overcharge",name:"Overcharge",icon:"✧",desc:"Increase Arcane Tower damage.",effect:"arcaneDamage",per:.04,format:"+4% arcane damage / rank"},
      {id:"time-fracture",name:"Time Fracture",icon:"◷",desc:"Increase the strength of slows applied by your effects.",effect:"slowPower",per:.04,format:"+4% slow strength / rank"},
      {id:"surge-focus",name:"Surge Focus",icon:"⌁",desc:"Increase commander ability damage.",effect:"abilityDamage",per:.05,format:"+5% ability damage / rank"}],
      forks:[
        [["Arcane Singularity","Arcane Towers deal 20% more damage.",{arcaneDamage:.20}],["Fractured Time","Slowed enemies move 20% slower.",{slowPower:.20}]],
        [["Rift Echo","Rift Surge hits every enemy twice for 35% damage.",{abilityEcho:.35}],["Unstable Field","Your slows last 2 seconds longer.",{slowDuration:2}]],
        [["Astral Reach","Arcane Towers gain 20% range.",{arcaneRange:.20}],["Void Battery","Commander ability cooldowns are 15% shorter.",{cooldown:.15}]],
        [["Event Horizon","Deal 25% more damage to bosses.",{bossDamage:.25}],["Rift Mastery","Arcane damage and ability damage increase by 20%.",{arcaneDamage:.20,abilityDamage:.20}]]]},
    huntmaster:{title:"HUNTER'S ROOT",tagline:"Track elites, expose weaknesses and finish the hunt.",nodes:[
      {id:"predators-mark",name:"Predator's Mark",icon:"➶",desc:"Increase damage against elite enemies.",effect:"eliteDamage",per:.04,format:"+4% elite damage / rank"},
      {id:"long-sight",name:"Long Sight",icon:"◎",desc:"Increase tower range.",effect:"range",per:.025,format:"+2.5% range / rank"},
      {id:"trophy-hunter",name:"Trophy Hunter",icon:"♜",desc:"Earn extra gold from elite enemies.",effect:"eliteGold",per:.04,format:"+4% elite gold / rank"}],
      forks:[
        [["Executioner's Aim","Deal 20% more damage to enemies above 70% health.",{freshDamage:.20}],["Patient Hunter","Deal 20% more damage to enemies below 30% health.",{lowDamage:.20}]],
        [["Marked for Death","Marked targets take 30% more damage.",{markedDamage:.30}],["Pack Tactics","All towers gain 10% attack speed.",{towerSpeed:.10}]],
        [["Colossus Slayer","Deal 25% more damage to bosses.",{bossDamage:.25}],["Quickdraw","Archer Towers deal 25% more damage.",{archerDamage:.25}]],
        [["Perfect Hunt","Boss rewards grant 100 extra gold.",{bossGoldFlat:100}],["Unerring Volley","All tower damage increases by 18%.",{damage:.18}]]]},
    treasurer:{title:"GOLDEN ROOT",tagline:"Turn every coin into a stronger expedition.",nodes:[
      {id:"deep-pockets",name:"Deep Pockets",icon:"◈",desc:"Increase gold earned from enemies.",effect:"goldBonus",per:.04,format:"+4% enemy gold / rank"},
      {id:"efficient-forge",name:"Efficient Forge",icon:"⚒",desc:"Reduce tower upgrade costs.",effect:"costReduction",per:.025,format:"2.5% lower costs / rank"},
      {id:"royal-reserve",name:"Royal Reserve",icon:"♛",desc:"Increase starting gold.",effect:"startingGold",per:15,format:"+15 starting gold / rank"}],
      forks:[
        [["Royal Mint","Gain 100 gold after every completed destination.",{stageGold:100}],["Bounty Ledger","Enemies drop 20% more gold.",{goldBonus:.20}]],
        [["Master Builder","Tower upgrades cost 20% less.",{costReduction:.20}],["War Treasury","Start each run with 150 extra gold.",{startingGold:150}]],
        [["Golden Decree","Royal Decree grants 100 additional gold.",{abilityGold:100}],["Spoils of War","Bosses grant 30% more gold.",{bossGold:.30}]],
        [["Infinite Reserve","Begin each expedition with 250 additional gold.",{startingGold:250}],["Kingdom's Fortune","All gold gains increase by 20%.",{goldBonus:.20}]]]},
    pyromancer:{title:"INFERNO ROOT",tagline:"Spread flame through enemy ranks and burn down bosses.",nodes:[
      {id:"living-flame",name:"Living Flame",icon:"♨",desc:"Increase burn damage.",effect:"burnDamage",per:1,format:"+1 burn damage / second / rank"},
      {id:"wildfire",name:"Wildfire",icon:"✹",desc:"Increase the chance to ignite enemies.",effect:"burnChance",per:.03,format:"+3% burn chance / rank"},
      {id:"ashfall",name:"Ashfall",icon:"☄",desc:"Increase area and commander ability damage.",effect:"areaDamage",per:.04,format:"+4% area damage / rank"}],
      forks:[
        [["Kindling Storm","Burning enemies spread a weaker burn to nearby foes.",{burnSpread:true}],["White Flame","Burn damage increases by 35%.",{burnDamageBonus:.35}]],
        [["Cinderwake","Burning enemies are slowed by 20%.",{burnSlow:.20}],["Fuel the Rift","Inferno deals 30% more damage.",{abilityDamage:.30}]],
        [["Dragonfire","Deal 25% more damage to bosses.",{bossDamage:.25}],["Ashen Tide","Cannon splash damage increases by 25%.",{cannonDamage:.25}]],
        [["World on Fire","Burn effects last 3 seconds longer.",{burnDuration:3}],["Eternal Pyre","All burn and area damage increases by 25%.",{burnDamageBonus:.25,areaDamage:.25}]]]},
    necromancer:{title:"SOUL ROOT",tagline:"Build an army from every fallen enemy.",nodes:[
      {id:"soul-harvest",name:"Soul Harvest",icon:"☠",desc:"Increase the chance to summon a spectral ally.",effect:"summonChance",per:.025,format:"+2.5% summon chance / rank"},
      {id:"wraith-bond",name:"Wraith Bond",icon:"♧",desc:"Increase spectral ally damage.",effect:"summonDamage",per:2,format:"+2 ally damage / rank"},
      {id:"lingering-souls",name:"Lingering Souls",icon:"◉",desc:"Increase spectral ally duration.",effect:"summonDuration",per:.5,format:"+0.5 seconds / rank"}],
      forks:[
        [["Grave Pact","Spectral allies deal 25% more damage.",{summonDamageBonus:.25}],["Endless Procession","Summon chance increases by 15%.",{summonChance:.15}]],
        [["Soul Chains","Enemies hit by wraiths are slowed by 20%.",{wraithSlow:.20}],["Death's Reach","Spectral allies remain for 5 extra seconds.",{summonDuration:5}]],
        [["Grave Sovereign","Bosses take 20% more damage from spectral allies.",{summonBossDamage:.20}],["Army of Ash","Summon one additional wraith with Raise the Fallen.",{extraWraith:1}]],
        [["Lich's Dominion","Every fifth kill guarantees a spectral ally.",{everyFifthSoul:true}],["Eternal Legion","Spectral ally damage and duration increase by 30%.",{summonDamageBonus:.30,summonDuration:4}]]]}
  };
  let profile={classes:{},equippedTrait:"bulwarks-oath"};
  function blankClass(){return {xp:0,level:1,skillPoints:0,spentPoints:0,nodes:{},choices:{},totalXp:0};}
  function normalizeProfile(raw){
    const next={classes:{},equippedTrait:traitList.some(t=>t.id===raw?.equippedTrait)?raw.equippedTrait:"bulwarks-oath"};
    CLASS_IDS.forEach(id=>{
      const c=raw?.classes?.[id]||{};
      const tree=coreTrees[id],rawChoices=c.choices&&typeof c.choices==="object"?c.choices:{},choices={};
      MILESTONES.forEach((level,index)=>{const choice=rawChoices[level];if(tree.forks[index].some(option=>option[0]===choice))choices[level]=choice;});
      next.classes[id]={...blankClass(),xp:Math.max(0,Number(c.xp)||0),level:Math.max(1,Math.min(100,Math.floor(Number(c.level)||1))),skillPoints:Math.max(0,Math.floor(Number(c.skillPoints)||0)),spentPoints:Math.max(0,Math.floor(Number(c.spentPoints)||0)),nodes:c.nodes&&typeof c.nodes==="object"?c.nodes:{},choices,totalXp:Math.max(0,Number(c.totalXp)||0)};
    });
    return next;
  }
  try{profile=normalizeProfile(JSON.parse(localStorage.getItem(STORAGE_KEY)||"null")||{});}catch(e){profile=normalizeProfile({});}
  function save(){
    profile=normalizeProfile(profile);
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(profile));}catch(e){console.warn("Could not save class progression:",e);}
    const savedRun=typeof window.persistRiftboundCheckpoint==="function"?window.persistRiftboundCheckpoint("battle"):false;
    if(savedRun===false&&typeof window.riftboundCloudSaveProfile==="function")window.riftboundCloudSaveProfile();
    renderSkillTree();renderTraits();
  }
  function classData(id=window.riftboundCommanderId||"warden"){return profile.classes[CLASS_IDS.includes(id)?id:"warden"];}
  function xpForNext(level){return Math.round(120+level*45+level*level*2);}
  function getTrait(id=profile.equippedTrait){return traitList.find(t=>t.id===id)||traitList[0];}
  function getTraitEffects(id=profile.equippedTrait){return {...getTrait(id).effects};}
  window.getRiftboundTraitEffects=getTraitEffects;
  window.getRiftboundTrait=function(){return {...getTrait()};};
  window.getRiftboundClassProfile=function(id){const c=classData(id);return JSON.parse(JSON.stringify(c));};
  window.getRiftboundProgressionExport=()=>JSON.parse(JSON.stringify(profile));
  window.loadRiftboundProgression=function(data){if(data&&typeof data==="object"){profile=normalizeProfile(data);try{localStorage.setItem(STORAGE_KEY,JSON.stringify(profile));}catch(e){}renderSkillTree();renderTraits();}};
  window.getRiftboundClassSkillEffects=function(id=window.riftboundCommanderId||"warden"){
    const c=classData(id),tree=coreTrees[id]||coreTrees.warden,effects={};
    tree.nodes.forEach(n=>{const rank=Math.max(0,Math.min(5,Math.floor(Number(c.nodes[n.id])||0)));effects[n.effect]=(effects[n.effect]||0)+rank*n.per;});
    const forks=tree.forks;
    MILESTONES.forEach((level,index)=>{const choice=c.choices[level];if(choice){const option=forks[index].find(x=>x[0]===choice);if(option)Object.entries(option[2]).forEach(([k,v])=>{effects[k]=typeof v==="boolean"?v:(effects[k]||0)+v;});}});
    return effects;
  };
  const baseBonus=legacyBonuses;
  window.getRiftboundSkillBonuses=function(id=window.riftboundCommanderId||"warden"){
    const old=typeof baseBonus==="function"?baseBonus(id):{};
    const e=window.getRiftboundClassSkillEffects(id);
    return {...old,fortressHp:(old.fortressHp||0)+(e.fortressHp||0)+(getTraitEffects().fortressHp||0),cooldown:Math.max(0,(old.cooldown||0)+(e.cooldown||0)),damage:(old.damage||0)+(e.damage||0),range:(old.range||0)+(e.range||0),damageReduction:e.damageReduction||0,towerSpeed:e.towerSpeed||0,arcaneDamage:e.arcaneDamage||0,slowPower:e.slowPower||0,abilityDamage:e.abilityDamage||0,eliteDamage:e.eliteDamage||0,eliteGold:e.eliteGold||0,goldBonus:e.goldBonus||0,costReduction:e.costReduction||0,startingGold:e.startingGold||0,archerDamage:e.archerDamage||0,cannonDamage:e.cannonDamage||0,burnDamage:e.burnDamage||0,burnChance:e.burnChance||0,areaDamage:e.areaDamage||0,summonChance:e.summonChance||0,summonDamage:e.summonDamage||0,summonDuration:e.summonDuration||0,bossDamage:e.bossDamage||0,slowDuration:e.slowDuration||0,stageHeal:e.stageHeal||0,flatHealth:e.flatHealth||0,healthyDamage:e.healthyDamage||0,lowHealthSpeed:e.lowHealthSpeed||0,bossReduction:e.bossReduction||0,arcaneRange:e.arcaneRange||0,markedDamage:e.markedDamage||0,stageGold:e.stageGold||0,startingGoldBonus:e.startingGold||0,abilityGold:e.abilityGold||0,bossGold:e.bossGold||0,bossGoldFlat:e.bossGoldFlat||0,instantGold:e.instantGold||0,burnDamageBonus:e.burnDamageBonus||0,burnDuration:e.burnDuration||0,burnSlow:e.burnSlow||0,extraWraith:e.extraWraith||0,summonDamageBonus:e.summonDamageBonus||0,summonBossDamage:e.summonBossDamage||0,everyFifthSoul:!!e.everyFifthSoul,wraithSlow:e.wraithSlow||0,slowedDamage:e.slowedDamage||0,freshDamage:e.freshDamage||0,lowDamage:e.lowDamage||0,cannonSplash:e.cannonSplash||0,abilityEcho:e.abilityEcho||0,burnSpread:!!e.burnSpread};
  };
  window.awardRiftboundClassXP=function(id,amount){
    if(!CLASS_IDS.includes(id))id="warden";
    const c=classData(id),gain=Math.max(0,Math.floor(amount||0));
    c.xp+=gain;c.totalXp+=gain;let levelsGained=0,points=0;
    while(c.level<100&&c.xp>=xpForNext(c.level)){c.xp-=xpForNext(c.level);c.level++;c.skillPoints++;points++;levelsGained++;}
    save();
    return {classId:id,xpGained:gain,level:c.level,levelsGained,skillPointsGained:points,xp:c.xp,xpToNext:xpForNext(c.level)};
  };
  window.calculateRiftboundRunXP=function(stats,victory){
    const s=stats||{},waves=Math.max(0,s.wavesCompleted||0),kills=Math.max(0,s.enemiesKilled||0),bosses=Math.max(0,s.bossesDefeated||0),damage=Math.max(0,s.damageDealt||0);
    return Math.min(10000,Math.round(waves*18+kills*2+bosses*125+Math.floor(damage/1000)*4+(victory?220:0)));
  };
  function renderSkillTree(){
    const root=document.getElementById("commander-skill-tree");if(!root)return;
    const id=window.riftboundCommanderId||"warden",c=classData(id),tree=coreTrees[id]||coreTrees.warden,needed=xpForNext(c.level),milestoneRows=MILESTONES.map((level,i)=>{
      const chosen=c.choices[level],available=c.level>=level;
      return '<section class="class-fork '+(chosen?"fork-chosen":"")+'"><div class="fork-level"><span>LEVEL '+level+'</span><strong>'+ (chosen?"CHOICE LOCKED":"MILESTONE CHOICE · COST 2 POINTS")+'</strong></div><div class="fork-options">'+tree.forks[i].map(opt=>'<button class="fork-option '+(chosen===opt[0]?"selected":"")+'" data-fork-level="'+level+'" data-fork-choice="'+opt[0]+'" '+(!available||chosen||c.skillPoints<2?"disabled":"")+'><span class="fork-choice-icon">'+(chosen===opt[0]?"✦":"◇")+'</span><strong>'+opt[0]+'</strong><small>'+opt[1]+'</small><em>2 SKILL POINTS</em></button>').join("")+'</div></section>';
    }).join("");
    root.innerHTML='<div class="skill-tree-heading"><div><p class="prep-eyebrow">CLASS PROGRESSION · '+tree.title+'</p><h2>'+id.toUpperCase()+' SKILL TREE</h2><p>'+tree.tagline+'</p></div><div class="skill-points"><strong>'+c.skillPoints+'</strong><span>AVAILABLE<br>SKILL POINTS</span></div></div>'+
      '<div class="class-xp-panel"><div><span>CLASS LEVEL</span><strong>'+c.level+'</strong></div><div class="class-xp-track"><i style="width:'+Math.min(100,c.xp/needed*100)+'%"></i></div><small>'+c.xp+' / '+needed+' XP TO NEXT LEVEL</small></div>'+
      '<div class="skill-tree-root"><span class="tree-root-icon">✦</span><strong>'+id.toUpperCase()+' · '+tree.title+'</strong><small>Choose a branch to shape your class</small></div>'+
      '<div class="class-core-grid">'+tree.nodes.map(n=>{const rank=Math.max(0,Math.min(5,Math.floor(Number(c.nodes[n.id])||0)));return '<article class="class-core-node"><div class="core-node-icon">'+n.icon+'</div><span>CORE BRANCH</span><h3>'+n.name+'</h3><p>'+n.desc+'</p><div class="core-ranks">'+Array.from({length:5},(_,i)=>'<i class="'+(i<rank?"filled":"")+'"></i>').join("")+'</div><small>RANK '+rank+' / 5 · '+n.format+'</small><button data-core-node="'+n.id+'" '+(rank>=5||c.skillPoints<1?"disabled":"")+'>'+ (rank>=5?"MAX RANK":"UPGRADE · 1 POINT")+'</button></article>';}).join("")+'</div>'+
      '<div class="skill-tree-branches"><div class="branch-trunk"></div>'+milestoneRows+'</div>'+
      '<p class="skill-tree-footnote">Every class level grants 1 skill point. Core branches cost 1 point per rank. Milestone choices unlock at levels 5, 10, 15 and 20, and cost 2 points. Choices are permanent for that class and apply to future expeditions. XP: 18 per completed wave, 2 per enemy defeated, 125 per boss, 4 per 1,000 damage dealt, plus 220 for victory.</p>';
    root.querySelectorAll("[data-core-node]").forEach(b=>b.addEventListener("click",()=>{const n=tree.nodes.find(x=>x.id===b.dataset.coreNode);if(!n||c.skillPoints<1)return;const rank=Math.max(0,Math.floor(Number(c.nodes[n.id])||0));if(rank>=5)return;c.skillPoints--;c.spentPoints++;c.nodes[n.id]=rank+1;save();}));
    root.querySelectorAll("[data-fork-choice]").forEach(b=>b.addEventListener("click",()=>{const level=Number(b.dataset.forkLevel),choice=b.dataset.forkChoice;if(c.level<level||c.skillPoints<2||c.choices[level])return;c.skillPoints-=2;c.spentPoints+=2;c.choices[level]=choice;save();}));
  }
  function renderTraits(){
    const root=document.getElementById("trait-collection");if(!root)return;
    const equipped=getTrait(),counts={COMMON:3,RARE:2,EPIC:2,LEGENDARY:2,MYTHIC:1};
    root.innerHTML='<div class="trait-heading"><div><p class="prep-eyebrow">COMMANDER IDENTITY</p><h2>TRAIT COLLECTION</h2><p>Equip one trait to define your expedition playstyle. Every trait has a preferred commander. Changes apply to new expeditions; saved runs keep their original trait.</p></div><span>10 TRAITS · 5 RARITIES</span></div><div class="trait-equipped"><span class="trait-equipped-icon">'+equipped.icon+'</span><div><small>CURRENTLY EQUIPPED · '+equipped.rarity+'</small><strong>'+equipped.name+'</strong><p>'+equipped.description+'</p></div></div><div class="trait-grid">'+traitList.map(t=>'<article class="trait-card rarity-'+t.rarity.toLowerCase()+' '+(t.id===profile.equippedTrait?"trait-active":"")+'"><div class="trait-card-top"><span class="trait-index">#'+t.index+'</span><span class="trait-rarity">'+t.rarity+'</span></div><div class="trait-icon">'+t.icon+'</div><h3>'+t.name+'</h3><p>'+t.description+'</p><small>BEST WITH · '+t.synergy.toUpperCase()+'</small><button data-equip-trait="'+t.id+'" '+(t.id===profile.equippedTrait?"disabled":"")+'>'+(t.id===profile.equippedTrait?"EQUIPPED":"EQUIP TRAIT")+'</button></article>').join("")+'</div>';
    root.querySelectorAll("[data-equip-trait]").forEach(b=>b.addEventListener("click",()=>{const t=traitList.find(x=>x.id===b.dataset.equipTrait);if(!t)return;profile.equippedTrait=t.id;save();}));
  }
  window.renderRiftboundSkillTree=renderSkillTree;
  window.renderRiftboundTraits=renderTraits;
  function init(){renderSkillTree();renderTraits();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();