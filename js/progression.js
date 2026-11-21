/* RIFTBOUND — CLASS PROGRESSION, SKILL TREES AND TRAITS */
(() => {
  "use strict";
  const CLASS_IDS=["warden","arcanist","huntmaster","treasurer","pyromancer","necromancer"];
  const MILESTONES=[5,10,15,20];
  const STORAGE_KEY="riftbound-class-progression-v1";
  const legacyBonuses=window.getRiftboundSkillBonuses;
  const traitList=[
    {index:"01",id:"bulwarks-oath",name:"Bulwark's Oath",rarity:"COMMON",icon:"⬡",description:"A sturdy ward reinforces the fortress, giving every commander a little more room for mistakes.",synergy:"Warden, Necromancer and any commander built around long defensive runs",good:["warden","necromancer","arcanist","huntmaster","treasurer","pyromancer"],stats:["+4% maximum fortress health"],effects:{"fortressHp":0.04}},
    {index:"02",id:"hawks-eye",name:"Hawk's Eye",rarity:"COMMON",icon:"➶",description:"A universal marksman's blessing sharpens every Archer Tower, whatever strategy commands the battlefield.",synergy:"Huntmaster, Warden and Arcanist",good:["huntmaster","warden","arcanist","treasurer"],stats:["+5% Archer Tower damage"],effects:{"archerDamage":0.05}},
    {index:"03",id:"coin-scent",name:"Coin Scent",rarity:"COMMON",icon:"◈",description:"A faint golden aura draws extra coin from defeated foes and supports every expedition.",synergy:"Treasurer, Warden and upgrade-focused builds",good:["treasurer","warden","arcanist","huntmaster","pyromancer","necromancer"],stats:["+5% gold from enemies"],effects:{"goldBonus":0.05}},
    {index:"04",id:"stonebound",name:"Stonebound Core",rarity:"COMMON",icon:"⬟",description:"Ancient runes reinforce the fortress foundations for any commander.",synergy:"Warden, Necromancer and defensive builds",good:["warden","necromancer","arcanist","huntmaster","treasurer","pyromancer"],stats:["+2.5% maximum fortress health"],effects:{"fortressHp":0.025}},
    {index:"05",id:"frost-sigil",name:"Frost Sigil",rarity:"RARE",icon:"❄",description:"Tower strikes can briefly bind enemies in glacial magic, setting up stronger attacks from the whole army.",synergy:"Arcanist, Huntmaster and any commander using many towers",good:["arcanist","huntmaster","warden","treasurer","pyromancer","necromancer"],stats:["+18% chance for tower hits to slow for 2 seconds"],effects:{"slowChance":0.18}},
    {index:"06",id:"ember-heart",name:"Ember Heart",rarity:"RARE",icon:"♨",description:"A living coal strengthens lingering burns, rewarding commanders who bring flame to the battlefield.",synergy:"Pyromancer, Arcanist and burn-focused builds",good:["pyromancer","arcanist","necromancer"],stats:["+35% burn damage","+1.5 seconds burn duration"],effects:{"burnDamage":0.35,"burnDuration":1.5}},
    {index:"07",id:"soul-conduit",name:"Soul Conduit",rarity:"RARE",icon:"☠",description:"A spectral channel sustains summoned allies and rewards commanders who fight alongside an army.",synergy:"Necromancer, Warden and summon-support builds",good:["necromancer","warden","arcanist"],stats:["+15 percentage points spectral summon chance","+3 seconds spectral ally duration"],effects:{"summonChance":0.15,"summonDuration":3}},
    {index:"08",id:"siege-savant",name:"Siege Savant",rarity:"RARE",icon:"◆",description:"Cannon engineers discover a devastating blast pattern that supports almost any tower formation.",synergy:"Warden, Treasurer, Huntmaster and area-damage builds",good:["warden","treasurer","huntmaster","arcanist","pyromancer","necromancer"],stats:["+30% Cannon Tower damage","+25 splash radius"],effects:{"cannonDamage":0.3,"cannonSplash":25}},
    {index:"09",id:"rift-tactician",name:"Rift Tactician",rarity:"EPIC",icon:"✧",description:"Exploit enemies weakened by control effects, turning battlefield setup into damage for every tower strategy.",synergy:"Arcanist, Huntmaster, Warden and control-focused builds",good:["arcanist","huntmaster","warden","treasurer","pyromancer","necromancer"],stats:["+35% damage against slowed enemies"],effects:{"slowedDamage":0.35}},
    {index:"10",id:"golden-forge",name:"Golden Forge",rarity:"EPIC",icon:"♛",description:"A masterwork royal seal lowers upgrade and campsite costs, leaving more resources for every strategy.",synergy:"Treasurer, Warden, Necromancer and upgrade-heavy builds",good:["treasurer","warden","necromancer","arcanist","huntmaster","pyromancer"],stats:["-25% tower upgrade and campsite service costs"],effects:{"costReduction":0.25}},
    {index:"11",id:"ashen-covenant",name:"Ashen Covenant",rarity:"EPIC",icon:"♧",description:"The ash remembers every flame and feeds it new strength, greatly rewarding any build that can ignite enemies.",synergy:"Pyromancer, Arcanist and burn-focused builds",good:["pyromancer","arcanist","necromancer"],stats:["+35% burn damage","+3 seconds burn duration"],effects:{"burnDamage":0.35,"burnDuration":3}},
    {index:"12",id:"worldbreaker",name:"Worldbreaker",rarity:"LEGENDARY",icon:"✹",description:"A legendary mark makes every commander more dangerous to bosses while increasing the riches claimed from their defeat.",synergy:"All commanders — especially boss-hunting, damage and economy builds",good:["warden","arcanist","huntmaster","treasurer","pyromancer","necromancer"],stats:["+50% damage against bosses","+35% boss gold rewards"],effects:{"bossDamage":0.5,"bossGold":0.35}},
    {index:"13",id:"crown-of-embers",name:"Crown of Embers",rarity:"LEGENDARY",icon:"♨",description:"A crown of eternal cinders massively amplifies burn damage and duration, making every source of flame more threatening.",synergy:"Pyromancer, Arcanist and Necromancer when using burn effects",good:["pyromancer","arcanist","necromancer"],stats:["+60% burn damage","+5 seconds burn duration"],effects:{"burnDamage":0.6,"burnDuration":5}},
    {index:"14",id:"eclipse-engine",name:"Eclipse Engine",rarity:"MYTHIC",icon:"◉",description:"A forbidden celestial engine turns control and boss encounters into opportunities for overwhelming damage, regardless of commander.",synergy:"All commanders — strongest with slow, control and boss-focused tower builds",good:["warden","arcanist","huntmaster","treasurer","pyromancer","necromancer"],stats:["+60% damage against slowed enemies","+40% damage against bosses"],effects:{"slowedDamage":0.6,"bossDamage":0.4}},
    {index:"15",id:"soul-of-the-kingdom",name:"Soul of the Kingdom",rarity:"MYTHIC",icon:"✥",description:"The fortress itself answers the call, greatly strengthening its walls and treasury for every commander and every expedition.",synergy:"All commanders — exceptional for defensive, economy and long-run builds",good:["warden","arcanist","huntmaster","treasurer","pyromancer","necromancer"],stats:["+35% maximum fortress health","+45% gold from enemies"],effects:{"fortressHp":0.35,"goldBonus":0.45}}
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
  let profile={classes:{},equippedTrait:null};
  function blankClass(){return {xp:0,level:1,skillPoints:0,spentPoints:0,nodes:{},choices:{},totalXp:0};}
  function normalizeProfile(raw){
    const oldTraits=raw?.traits&&typeof raw.traits==="object"?raw.traits:{};
    const owned=oldTraits.owned&&typeof oldTraits.owned==="object"?{...oldTraits.owned}:{};
    Object.keys(owned).forEach(id=>{if(!traitList.some(t=>t.id===id)||Number(owned[id])<=0)delete owned[id];else owned[id]=Math.max(1,Math.floor(Number(owned[id])||1));});
    const totalRolls=Math.max(0,Math.floor(Number(oldTraits.totalRolls)||0));
    let equippedTrait=traitList.some(t=>t.id===raw?.equippedTrait)?raw.equippedTrait:null;
    // Older profiles automatically received Bulwark's Oath. Remove that free starter trait during migration.
    if(equippedTrait==="bulwarks-oath"&&totalRolls===0&&Object.keys(owned).every(id=>id==="bulwarks-oath")){
      equippedTrait=null;
      delete owned["bulwarks-oath"];
    }
    const next={classes:{},equippedTrait,traits:{rolls:Math.max(0,Math.floor(Number(oldTraits.rolls)||0)),pityLegendary:Math.max(0,Math.min(49,Math.floor(Number(oldTraits.pityLegendary)||0))),pityMythic:Math.max(0,Math.min(1499,Math.floor(Number(oldTraits.pityMythic)||0))),totalRolls,owned,redeemedCodes:Array.isArray(oldTraits.redeemedCodes)?oldTraits.redeemedCodes.filter(x=>typeof x==="string").slice(0,50):[]}};
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
    if(typeof window.persistRiftboundCheckpoint==="function")window.persistRiftboundCheckpoint("battle");
    if(typeof window.riftboundCloudSaveProfile==="function")window.riftboundCloudSaveProfile();
    renderSkillTree();renderTraits();window.renderRiftboundCommanders?.();
  }
  function classData(id=window.riftboundCommanderId||"warden"){return profile.classes[CLASS_IDS.includes(id)?id:"warden"];}
  function xpForNext(level){return Math.round(120+level*45+level*level*2);}
  const NO_TRAIT={id:null,name:"No Trait Equipped",rarity:"NONE",icon:"—",description:"No trait is equipped. Your expedition receives no trait bonuses.",synergy:"None",good:[],stats:["No additional stat bonuses"],effects:{}};
  function getTrait(id=profile.equippedTrait){return traitList.find(t=>t.id===id)||NO_TRAIT;}
  function getTraitEffects(id=profile.equippedTrait){return {...getTrait(id).effects};}
  window.getRiftboundTraitEffects=getTraitEffects;
  window.getRiftboundTrait=function(){return {...getTrait()};};
  window.getRiftboundClassProfile=function(id){const c=classData(id);return JSON.parse(JSON.stringify(c));};
  window.getRiftboundProgressionExport=()=>JSON.parse(JSON.stringify(profile));
  window.loadRiftboundProgression=function(data){if(data&&typeof data==="object"){const localProfile=profile;profile=normalizeProfile(data);if(!data.traits&&localProfile?.traits){profile.traits=localProfile.traits;if(!data.equippedTrait&&localProfile.equippedTrait)profile.equippedTrait=localProfile.equippedTrait;}try{localStorage.setItem(STORAGE_KEY,JSON.stringify(profile));}catch(e){}renderSkillTree();renderTraits();if(!data.traits&&localProfile?.traits&&typeof window.riftboundCloudSaveProfile==="function")window.riftboundCloudSaveProfile();}};
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
  window.devRiftboundGrantClassXP=function(id,amount){return window.awardRiftboundClassXP(id,amount);};
  window.devRiftboundGrantSkillPoints=function(id,amount){
    if(!CLASS_IDS.includes(id))return false;
    const c=classData(id);c.skillPoints=Math.min(100000,c.skillPoints+Math.max(0,Math.floor(Number(amount)||0)));save();return c.skillPoints;
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
  const rarityOdds={COMMON:55,RARE:29.5,EPIC:12,LEGENDARY:3,MYTHIC:.5};
  function rarityClass(r){return String(r||"common").toLowerCase();}
  function traitChance(trait){const count=traitList.filter(t=>t.rarity===trait.rarity).length;return (rarityOdds[trait.rarity]/count).toFixed(3).replace(/0+$/,"").replace(/\.$/,"")+"%";}
  function traitOwned(id){return Math.max(0,Number(profile.traits.owned[id])||0);}
  function traitStatsMarkup(trait){return "<ul class='trait-stat-list'>"+trait.stats.map(s=>"<li>"+s+"</li>").join("")+"</ul>";}
  function openTraitDetail(id){
    const trait=traitList.find(t=>t.id===id);if(!trait)return;
    const overlay=document.getElementById("trait-detail-overlay");if(!overlay)return;
    const owned=traitOwned(id)>0,locked=!!window.isRiftboundRunActive?.();
    overlay.innerHTML="<div class='trait-detail-card rarity-"+rarityClass(trait.rarity)+"' role='dialog' aria-modal='true'><button class='trait-detail-close' type='button' aria-label='Close'>×</button><div class='trait-art trait-art-large'><span>"+trait.icon+"</span></div><p class='trait-detail-rarity'>"+trait.rarity+" · "+traitChance(trait)+" PER TRAIT</p><h2>"+trait.name+"</h2><p class='trait-detail-description'>"+trait.description+"</p><h3>STAT BONUSES</h3>"+traitStatsMarkup(trait)+"<h3>BEST SYNERGY</h3><p class='trait-detail-synergy'>"+trait.synergy+"</p><p class='trait-owned-note'>"+(owned?"OWNED · UNLOCKED":"NOT YET DISCOVERED")+(profile.equippedTrait===id?" · CURRENTLY ACTIVE":"")+"</p></div>";
    overlay.hidden=false;
    overlay.querySelector(".trait-detail-close").addEventListener("click",()=>{overlay.hidden=true;});
    overlay.addEventListener("click",event=>{if(event.target===overlay)overlay.hidden=true;},{once:true});
  }
  function rollTrait(){
    if(profile.traits.rolls<1||window.isRiftboundRunActive?.())return null;
    profile.traits.rolls--;
    let rarity;
    if(profile.traits.pityMythic>=1499)rarity="MYTHIC";
    else{
      const roll=Math.random()*100;
      rarity=roll<.5?"MYTHIC":roll<3.5?"LEGENDARY":roll<15.5?"EPIC":roll<45?"RARE":"COMMON";
      if(profile.traits.pityLegendary>=49&&rarity!=="MYTHIC"&&rarity!=="LEGENDARY")rarity="LEGENDARY";
    }
    const pool=traitList.filter(t=>t.rarity===rarity);
    const trait=pool[Math.floor(Math.random()*pool.length)];
    profile.traits.totalRolls++;
    profile.traits.pityMythic=rarity==="MYTHIC"?0:Math.min(1499,profile.traits.pityMythic+1);
    profile.traits.pityLegendary=(rarity==="MYTHIC"||rarity==="LEGENDARY")?0:Math.min(49,profile.traits.pityLegendary+1);
    const duplicate=traitOwned(trait.id)>0;
    if(!duplicate)profile.traits.owned[trait.id]=1;
    profile.equippedTrait=trait.id;
    save();
    return {trait,duplicate,rarity};
  }
  function showProtectedTraitRollConfirmation(){
    const current=getTrait();
    const root=document.getElementById("trait-collection");
    if(!root)return;
    const overlay=document.createElement("div");
    overlay.className="trait-confirm-overlay";
    overlay.innerHTML="<div class='trait-confirm-card rarity-"+rarityClass(current.rarity)+"' role='dialog' aria-modal='true' aria-labelledby='trait-confirm-title'><p class='prep-eyebrow'>IMPORTANT · ACTIVE TRAIT PROTECTED</p><div class='trait-art trait-art-large'><span>"+current.icon+"</span></div><p class='trait-detail-rarity'>"+current.rarity+" TRAIT EQUIPPED</p><h2 id='trait-confirm-title'>"+current.name+"</h2><p>Rolling again may replace this "+current.rarity.toLowerCase()+" trait with a lower-rarity trait. Do you want to spend a roll and risk replacing it?</p><div class='trait-confirm-actions'><button type='button' class='trait-confirm-keep'>CANCEL · KEEP TRAIT</button><button type='button' class='trait-confirm-equip'>CONFIRM ROLL</button></div></div>";
    root.appendChild(overlay);
    overlay.querySelector(".trait-confirm-keep").addEventListener("click",()=>overlay.remove());
    overlay.querySelector(".trait-confirm-equip").addEventListener("click",()=>{
      overlay.remove();
      performTraitRoll();
    });
  }
  function performTraitRoll(){
    const pulled=rollTrait();
    if(!pulled)return;
    window._riftboundLastTraitRoll=pulled;
    renderTraits(true);
  }
  function requestTraitRoll(){
    if(profile.traits.rolls<1||window.isRiftboundRunActive?.())return;
    const rarity=getTrait().rarity;
    if(rarity==="LEGENDARY"||rarity==="MYTHIC"){
      showProtectedTraitRollConfirmation();
      return;
    }
    performTraitRoll();
  }
  window.riftboundGetTraitState=()=>JSON.parse(JSON.stringify(profile.traits));
  window.riftboundRedeemTraitCode=async function(code){
    const normalized=String(code||"").trim().toUpperCase();
    if(!normalized)return {ok:false,message:"ENTER A CODE"};
    const api=(window.RIFTBOUND_API_BASE||"").replace(/\/$/,"");
    if(!api)return {ok:false,message:"CODE REDEMPTION REQUIRES THE SERVER"};
    try{
      const response=await fetch(api+"/api/traits/redeem",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({code:normalized})});
      const data=await response.json().catch(()=>({}));
      if(response.status===409)return {ok:false,message:"THIS DISCORD ACCOUNT HAS ALREADY REDEEMED THIS CODE"};
      if(response.status===400)return {ok:false,message:"INVALID CODE"};
      if(!response.ok)throw new Error(data.error||"Code redemption failed.");
      profile.traits.rolls+=Math.max(0,Math.floor(Number(data.rollsGranted)||0));
      if(!profile.traits.redeemedCodes.includes(normalized))profile.traits.redeemedCodes.push(normalized);
      save();
      return {ok:true,message:data.message||"CODE ACCEPTED"};
    }catch(error){
      console.error("Trait code redemption failed:",error);
      return {ok:false,message:"COULD NOT REDEEM CODE · CHECK YOUR CONNECTION"};
    }
  };
  function renderTraits(showLastRoll=false){
    const root=document.getElementById("trait-collection");if(!root)return;
    const equipped=getTrait(),locked=!!window.isRiftboundRunActive?.(),state=profile.traits;
    const result=showLastRoll?(window._riftboundLastTraitRoll||null):null;
    window._riftboundLastTraitRoll=null;
    const resultMarkup=result?"<div class='trait-roll-result rarity-"+rarityClass(result.trait.rarity)+"'><div class='trait-art trait-art-result'><span>"+result.trait.icon+"</span></div><div><small>"+(result.duplicate?"DUPLICATE · ALREADY OWNED · NO BONUS ROLLS":"NEW TRAIT DISCOVERED")+"</small><strong>"+result.trait.name+"</strong><em>"+result.trait.rarity+"</em></div><button type='button' data-result-details='"+result.trait.id+"'>VIEW DETAILS</button></div>":"";
    root.innerHTML="<div class='trait-heading'><div><p class='prep-eyebrow'>THE RIFTBOUND TRAIT HALL</p><h2>TRAIT SUMMONING HALL</h2><p>Spend a roll to discover a trait. Your new trait becomes active automatically.</p></div><span>15 TRAITS · 5 RARITIES</span></div>"+
      "<div class='trait-summon-layout'><section class='trait-summon-stage'><div class='trait-stage-top'><span>ACTIVE TRAIT</span><span>"+(locked?"EXPEDITION ACTIVE":"SANCTUM READY")+"</span></div><div class='trait-equipped-large rarity-"+rarityClass(equipped.rarity)+"'><div class='trait-art trait-art-equipped'><span>"+equipped.icon+"</span></div><div><small>EQUIPPED · "+equipped.rarity+"</small><h3>"+equipped.name+"</h3><p>"+equipped.description+"</p></div></div><div class='trait-summon-orbit'><div class='trait-orbit-ring ring-one'></div><div class='trait-orbit-ring ring-two'></div><div class='trait-orbit-core'><span>✧</span><small>RIFT<br>RESONANCE</small></div></div>"+resultMarkup+"<div class='trait-stage-actions'><button type='button' id='trait-index-open'>✧ OPEN TRAIT INDEX</button><span>Discoveries are permanent · Duplicates do not grant bonus rolls</span></div></section>"+
      "<aside class='trait-roll-panel'><p class='prep-eyebrow'>SUMMONING RITES</p><h3>RIFT ROLLS</h3><div class='trait-roll-count'><strong>"+state.rolls+"</strong><span>AVAILABLE ROLLS</span></div><button type='button' id='trait-roll-button' "+(state.rolls<1||locked?"disabled":"")+">✦ SUMMON TRAIT · 1 ROLL</button><p class='trait-roll-lock'>"+(locked?"Trait rolls are unavailable during an expedition.":"Duplicates do not grant bonus rolls. Every summon costs exactly 1 roll.")+"</p><div class='trait-pity-block'><div class='trait-pity-heading'><span>LEGENDARY PITY</span><strong>"+state.pityLegendary+" / 50</strong></div><div class='trait-pity-track'><i style='width:"+(state.pityLegendary/50*100)+"%'></i></div><small>Legendary or Mythic guaranteed by roll 50</small></div><div class='trait-pity-block mythic-pity'><div class='trait-pity-heading'><span>MYTHIC PITY</span><strong>"+state.pityMythic.toLocaleString()+" / 1,500</strong></div><div class='trait-pity-track'><i style='width:"+(state.pityMythic/1500*100)+"%'></i></div><small>Mythic guaranteed by roll 1,500</small></div><div class='trait-roll-total'><span>TOTAL ROLLS USED</span><strong>"+state.totalRolls.toLocaleString()+"</strong></div></aside></div>"+
      "<div id='trait-index-panel' class='trait-index-panel' hidden><div class='trait-index-heading'><div><p class='prep-eyebrow'>TRAIT ARCHIVE</p><h3>TRAIT INDEX</h3><p>Every trait, its rarity, and its exact chance per roll. Select any trait to inspect its effects and synergies.</p></div><button type='button' id='trait-index-close'>CLOSE INDEX</button></div><div class='trait-index-legend'>COMMON 55% · RARE 29.5% · EPIC 12% · LEGENDARY 3% · MYTHIC 0.5%</div><div class='trait-index-grid'>"+traitList.map(t=>"<button type='button' class='trait-index-card rarity-"+rarityClass(t.rarity)+"' data-trait-detail='"+t.id+"'><span class='trait-art trait-art-index'><span>"+t.icon+"</span></span><span class='trait-index-copy'><strong>"+t.name+"</strong><small>"+t.rarity+" · "+traitChance(t)+"</small><em>"+(traitOwned(t.id)>0?"OWNED":"UNDISCOVERED")+"</em></span><span class='trait-index-arrow'>›</span></button>").join("")+"</div></div>"+
      "<div id='trait-detail-overlay' class='trait-detail-overlay' hidden></div>";
    root.querySelector("#trait-index-open").addEventListener("click",()=>{root.querySelector("#trait-index-panel").hidden=false;root.querySelector("#trait-index-panel").scrollIntoView({behavior:"smooth",block:"start"});});
    root.querySelector("#trait-index-close").addEventListener("click",()=>{root.querySelector("#trait-index-panel").hidden=true;});
    root.querySelector("#trait-roll-button").addEventListener("click",requestTraitRoll);
    root.querySelectorAll("[data-trait-detail]").forEach(button=>button.addEventListener("click",()=>openTraitDetail(button.dataset.traitDetail)));
    const details=root.querySelector("[data-result-details]");if(details)details.addEventListener("click",()=>openTraitDetail(details.dataset.resultDetails));
  }
  window.renderRiftboundSkillTree=renderSkillTree;
  window.renderRiftboundTraits=renderTraits;
  function init(){renderSkillTree();renderTraits();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();