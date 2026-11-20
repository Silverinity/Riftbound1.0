/* RIFTBOUND — COMMANDERS + PER-COMMANDER SKILL TREES */
(() => {
  "use strict";

  const commanders = [
    {id:"warden",name:"The Warden",speciality:"DEFENCE",emblem:"♜",passive:"Fortified Defences",passiveDescription:"Begins each expedition with 20 additional fortress health.",ability:"Iron Bastion",abilityDescription:"For 12 seconds, the fortress takes half damage and towers fire 25% faster.",playstyle:"Hold the line and outlast dangerous waves.",strength:"Strong survivability",weakness:"Limited offensive support"},
    {id:"arcanist",name:"The Arcanist",speciality:"MAGIC",emblem:"✧",passive:"Arcane Mastery",passiveDescription:"Arcane Towers deal 25% increased damage.",ability:"Rift Surge",abilityDescription:"Deals 120 damage to every enemy and slows them for 5 seconds.",playstyle:"Build around powerful magical damage.",strength:"Powerful magical attacks",weakness:"Less benefit from other towers"},
    {id:"huntmaster",name:"The Huntmaster",speciality:"PRECISION",emblem:"➶",passive:"Predator's Instinct",passiveDescription:"Towers deal 20% more damage to high-health enemies.",ability:"Marked Prey",abilityDescription:"Marks an elite target for 10 seconds; towers deal 60% more damage to it.",playstyle:"Eliminate elite enemies before they reach the fortress.",strength:"Excellent against tough targets",weakness:"Less specialised against groups"},
    {id:"treasurer",name:"The Treasurer",speciality:"ECONOMY",emblem:"♛",passive:"Golden Fortune",passiveDescription:"Gain 2 additional gold for every defeated enemy.",ability:"Royal Decree",abilityDescription:"Instantly grants 125 gold.",playstyle:"Turn smart spending into a lasting advantage.",strength:"Greater resource flexibility",weakness:"Limited direct combat support"},
    {id:"pyromancer",name:"The Pyromancer",speciality:"AREA DAMAGE",emblem:"♨",passive:"Eternal Flame",passiveDescription:"Tower hits have a chance to burn enemies over time.",ability:"Inferno",abilityDescription:"Deals 65 damage to every enemy and burns them for 5 seconds.",playstyle:"Break up enemy formations with burning damage.",strength:"Effective against groups",weakness:"Less specialised against single targets"},
    {id:"necromancer",name:"The Necromancer",speciality:"SUMMONING",emblem:"☠",passive:"Soul Harvest",passiveDescription:"Defeated enemies can leave temporary spectral allies.",ability:"Raise the Fallen",abilityDescription:"Summons three spectral wraiths to fight for 12 seconds.",playstyle:"Use spectral allies to add pressure across the battlefield.",strength:"Creates extra battlefield units",weakness:"Less effective against sparse waves"}
  ];
  const commanderById = id => commanders.find(c=>c.id===id) || commanders[0];
  const storageKey="riftbound-selected-commander";
  const skillStorageKey="riftbound-commander-skill-trees";
  const paths=[
    {id:"fortressHp",name:"FORTRESS VITALITY",stat:"Fortress HP",description:"+5% maximum fortress health per level.",perLevel:.05,format:v=>"+"+Math.round(v*100)+"% HP",icon:"⬡"},
    {id:"cooldown",name:"RIFT ATTUNEMENT",stat:"Ability Cooldown",description:"Commander ability cooldowns are 4% shorter per level.",perLevel:.04,format:v=>"-"+Math.round(v*100)+"% cooldown",icon:"◷"},
    {id:"damage",name:"DEADLY FORCE",stat:"Tower Damage",description:"All towers deal 3% more damage per level.",perLevel:.03,format:v=>"+"+Math.round(v*100)+"% damage",icon:"⚔"},
    {id:"range",name:"EXTENDED REACH",stat:"Tower Range",description:"All towers gain 3% more range per level.",perLevel:.03,format:v=>"+"+Math.round(v*100)+"% range",icon:"◎"}
  ];
  const MAX_LEVEL=5;
  let selectedId="warden";
  let progression={points:2,commanders:{}};
  try {
    const saved=localStorage.getItem(storageKey);
    if(commanders.some(c=>c.id===saved))selectedId=saved;
  } catch(error){console.warn("Could not load selected commander:",error);}
  try {
    const saved=JSON.parse(localStorage.getItem(skillStorageKey)||"null");
    if(saved&&typeof saved==="object"){
      progression.points=Math.max(0,Math.floor(Number(saved.points)||0));
      progression.commanders=saved.commanders&&typeof saved.commanders==="object"?saved.commanders:{};
    }
  } catch(error){console.warn("Could not load commander skill trees:",error);}

  function levelsFor(id){
    const raw=progression.commanders[id]||{};
    return Object.fromEntries(paths.map(path=>[path.id,Math.max(0,Math.min(MAX_LEVEL,Math.floor(Number(raw[path.id])||0)))]));
  }
  function saveProgression(){
    try{localStorage.setItem(skillStorageKey,JSON.stringify(progression));}
    catch(error){console.warn("Could not save commander skill trees:",error);}
  }
  function getBonuses(id=selectedId){
    const levels=levelsFor(id);
    return {
      fortressHp:levels.fortressHp*.05,
      cooldown:levels.cooldown*.04,
      damage:levels.damage*.03,
      range:levels.range*.03
    };
  }
  window.getRiftboundSkillBonuses=getBonuses;
  window.getRiftboundSkillProgress=()=>({points:progression.points,commanders:JSON.parse(JSON.stringify(progression.commanders))});
  window.awardRiftboundSkillPoint=function(){
    progression.points+=1;saveProgression();renderSkillTree();
    return progression.points;
  };

  function publishSelection(){
    const selected=commanderById(selectedId);
    window.riftboundCommanderId=selected.id;
    window.riftboundCommander=selected;
    document.querySelectorAll("[data-commander-id]").forEach(card=>{
      const active=card.dataset.commanderId===selectedId;
      card.classList.toggle("commander-card-selected",active);
      const button=card.querySelector("[data-select-commander]");
      if(button){button.textContent=active?"CURRENT COMMANDER":"SELECT COMMANDER";button.setAttribute("aria-pressed",String(active));}
    });
    const summary=document.getElementById("hub-selected-commander");
    if(summary)summary.textContent=selected.name.toUpperCase()+" SELECTED";
    renderSkillTree();
    try{localStorage.setItem(storageKey,selectedId);}
    catch(error){console.warn("Could not save selected commander:",error);}
  }
  window.setRiftboundCommanderSelection=function(id){
    if(!commanders.some(c=>c.id===id))return;
    selectedId=id;publishSelection();
  };

  function renderCommanders(){
    const root=document.getElementById("commander-selection");
    if(!root||root.dataset.rendered==="true")return;
    root.dataset.rendered="true";
    root.innerHTML=`
      <div class="commander-section-heading">
        <div><p class="prep-eyebrow">CHOOSE YOUR STRATEGY</p><h2 id="commander-selection-title">YOUR COMMANDERS</h2><p>Each leader changes how your fortress fights. Your selection applies to your next expedition.</p></div>
        <strong id="commander-selected-summary" aria-live="polite"></strong>
      </div>
      <div class="commander-grid">
        ${commanders.map(c=>`
          <article class="commander-card" data-commander-id="${c.id}">
            <div class="commander-card-top"><span class="commander-emblem">${c.emblem}</span><span class="commander-speciality">${c.speciality}</span></div>
            <h3>${c.name}</h3>
            <div class="commander-detail"><span>PASSIVE · ${c.passive}</span><p>${c.passiveDescription}</p></div>
            <div class="commander-detail"><span>ABILITY · ${c.ability}</span><p>${c.abilityDescription}</p></div>
            <p class="commander-playstyle">${c.playstyle}</p>
            <div class="commander-tradeoff"><p><b>STRENGTH</b> ${c.strength}</p><p><b>WEAKNESS</b> ${c.weakness}</p></div>
            <button type="button" data-select-commander="${c.id}">SELECT COMMANDER</button>
          </article>`).join("")}
      </div>`;
    root.querySelectorAll("[data-select-commander]").forEach(button=>button.addEventListener("click",()=>{
      selectedId=button.dataset.selectCommander;publishSelection();
    }));
  }

  function renderSkillTree(){
    const root=document.getElementById("commander-skill-tree");
    if(!root)return;
    const levels=levelsFor(selectedId);
    root.innerHTML=`
      <div class="skill-tree-heading">
        <div><p class="prep-eyebrow">PERMANENT COMMAND PROGRESSION</p><h2>COMMANDER SKILL TREE</h2><p>Each commander has an independent skill tree. Spend points to strengthen your chosen leader.</p></div>
        <div class="skill-points"><strong>${progression.points}</strong><span>AVAILABLE<br>SKILL POINTS</span></div>
      </div>
      <div class="skill-commander-label"><span>${commanderById(selectedId).name.toUpperCase()}</span><span>LEVELS ${Object.values(levels).reduce((a,b)=>a+b,0)} / 20</span></div>
      <div class="skill-path-grid">
        ${paths.map(path=>{
          const level=levels[path.id],maxed=level>=MAX_LEVEL;
          return `<article class="skill-path-card skill-${path.id}">
            <div class="skill-path-icon">${path.icon}</div>
            <div class="skill-path-copy"><span class="skill-path-kicker">${path.stat.toUpperCase()}</span><h3>${path.name}</h3><p>${path.description}</p></div>
            <div class="skill-node-row">${Array.from({length:MAX_LEVEL},(_,i)=>`<span class="skill-node ${i<level?"unlocked":""}">${i+1}</span>`).join("")}</div>
            <div class="skill-path-footer"><span>LEVEL ${level} / ${MAX_LEVEL}</span><strong>${path.format(level*path.perLevel)}</strong></div>
            <button type="button" data-upgrade-skill="${path.id}" ${maxed||progression.points<=0?"disabled":""}>${maxed?"PATH MAXED":"UNLOCK NEXT LEVEL · 1 POINT"}</button>
          </article>`;
        }).join("")}
      </div>
      <p class="skill-tree-footnote">Skill points are earned by clearing five-wave stages. Your skill trees are saved in this browser.</p>`;
    root.querySelectorAll("[data-upgrade-skill]").forEach(button=>button.addEventListener("click",()=>{
      const pathId=button.dataset.upgradeSkill;
      const path=paths.find(p=>p.id===pathId);
      const current=levelsFor(selectedId);
      if(!path||progression.points<=0||current[pathId]>=MAX_LEVEL)return;
      progression.points-=1;
      if(!progression.commanders[selectedId])progression.commanders[selectedId]={};
      progression.commanders[selectedId][pathId]=current[pathId]+1;
      saveProgression();renderSkillTree();
    }));
  }

  function init(){
    renderCommanders();publishSelection();renderSkillTree();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();