/* RIFTBOUND - LOCAL DEVELOPER / DEBUG PANEL */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const panel = $("developer-panel");
  const toggle = $("dev-panel-toggle");
  const header = $("developer-panel-header");
  const feedback = $("dev-feedback");
  if (!panel || !toggle || !header) return;

  function say(message) { feedback.textContent = message; }
  function enabled() { return !!(window.riftboundSettings && window.riftboundSettings.developerMode); }
  window.updateDeveloperModeUI = function() {
    const on = enabled();
    toggle.hidden = !on;
    if (!on) panel.hidden = true;
  };
  function openPanel() {
    if (!enabled() || $("game-screen").hidden) return;
    panel.hidden = false;
    const r = panel.getBoundingClientRect();
    if (r.right > innerWidth || r.bottom > innerHeight) {
      panel.style.left = Math.max(8, innerWidth-r.width-8)+"px";
      panel.style.top = "80px";
      panel.style.right = "auto";
    }
  }
  toggle.addEventListener("click", () => panel.hidden ? openPanel() : panel.hidden = true);
  $("dev-panel-close").addEventListener("click", () => panel.hidden = true);
  window.updateDeveloperModeUI();

  function active() {
    if (!enabled() || !currentRun) { say("Start a run and enable Developer Mode in Settings first."); return false; }
    return true;
  }
  function refresh() { updateGameDisplay(); drawBattlefield(); }
  function amount(id, fallback=0, max=100000000) {
    const n=Number($(id).value);
    return Number.isFinite(n) ? Math.max(0,Math.min(max,Math.floor(n))) : fallback;
  }
  document.querySelectorAll("[data-dev-gold]").forEach(button => button.addEventListener("click", () => {
    if(!active())return; currentRun.gold=Math.min(100000000,currentRun.gold+Number(button.dataset.devGold));refresh();say("Added "+button.dataset.devGold+" gold.");
  }));
  $("dev-add-gold").addEventListener("click",()=>{if(!active())return;const n=amount("dev-gold-amount");currentRun.gold=Math.min(100000000,currentRun.gold+n);refresh();say("Added "+n+" gold.");});
  $("dev-remove-gold").addEventListener("click",()=>{if(!active())return;const n=amount("dev-gold-amount");currentRun.gold=Math.max(0,currentRun.gold-n);refresh();say("Removed "+n+" gold.");});

  function clearCombat() {
    currentRun.enemies=[];currentRun.spawnBatches=[];currentRun.projectiles=[];
    currentRun.waveActive=false;currentRun.waveIntervalTimer=0;
  }
  function finishDebugStage() {
    clearCombat();currentRun.currentWave=5;currentRun.waveActive=true;checkWaveCompletion();refresh();
  }
  $("dev-skip-wave").addEventListener("click",()=>{
    if(!active())return;
    if(currentRun.currentWave===0){currentRun.currentWave=1;}
    clearCombat();
    if(currentRun.currentWave>=5){currentRun.currentWave=5;currentRun.waveActive=true;checkWaveCompletion();say("Wave 5 cleared. Choose your reward card.");}
    else {setWaveStatus("WAVE SKIPPED · READY FOR NEXT WAVE");showBattleMessage("DEVELOPER MODE: CURRENT WAVE SKIPPED");refresh();say("Skipped the current wave without spawning enemies. Start the next wave when ready.");}
  });
  $("dev-complete-stage").addEventListener("click",()=>{if(!active())return;finishDebugStage();say("Stage completed. Choose a reward card.");});
  $("dev-clear-enemies").addEventListener("click",()=>{if(!active())return;currentRun.enemies=[];currentRun.spawnBatches=[];currentRun.projectiles=[];if(currentRun.currentWave>=5){currentRun.waveActive=true;checkWaveCompletion();}refresh();say("All active enemies and queued spawns cleared.");});
  $("dev-jump-wave").addEventListener("click",()=>{
    if(!active())return;
    const n=Math.max(1,Math.min(5,amount("dev-wave-number",1,5)));
    clearCombat();currentRun.gameOver=false;currentRun.currentWave=n-1;startWave(false);startGameLoop();refresh();say("Started wave "+n+" in the current stage.");
  });

  $("dev-set-health").addEventListener("click",()=>{if(!active())return;currentRun.castleHealth=amount("dev-health-amount",100,1000000);currentRun.maxCastleHealth=Math.max(currentRun.maxCastleHealth,currentRun.castleHealth);if(currentRun.castleHealth>0)currentRun.gameOver=false;refresh();say("Castle HP set to "+currentRun.castleHealth+".");});
  $("dev-heal").addEventListener("click",()=>{if(!active())return;currentRun.castleHealth=currentRun.maxCastleHealth;if(currentRun.castleHealth>0)currentRun.gameOver=false;refresh();say("Castle fully restored.");});
  $("dev-invincible").addEventListener("change",e=>{if(!active())return;currentRun.devInvincible=e.target.checked;say("Invincibility "+(e.target.checked?"enabled.":"disabled."));});

  function addFreeTower(type) {
    const spots=[];for(let y=45;y<=495;y+=42)for(let x=35;x<=925;x+=42)spots.push({x,y});
    for(const p of spots){if(canBuild(p.x,p.y,false)){currentRun.towers.push({type,x:p.x,y:p.y,cooldown:0,level:1,upgrades:{damage:0,range:0,speed:0}});return true;}}
    return false;
  }
  $("dev-add-tower").addEventListener("click",()=>{if(!active())return;const type=$("dev-tower-type").value;if(addFreeTower(type)){refresh();say("Added a free "+type+" tower at the first available location.");}else say("No valid free placement location was found.");});
  $("dev-max-towers").addEventListener("click",()=>{if(!active())return;currentRun.towers.forEach(t=>{t.level=4;t.upgrades={damage:1,range:1,speed:1};t.cooldown=0;});selectedTowerEntity=null;updateTowerPanel();refresh();say("All towers set to level 4 with one of each upgrade.");});
  $("dev-reset-cooldowns").addEventListener("click",()=>{if(!active())return;currentRun.towers.forEach(t=>t.cooldown=0);refresh();say("All tower cooldowns reset.");});

  function jumpProgress(area,camp,stage) {
    clearCombat();currentRun.area=area;currentRun.campsite=camp;currentRun.stage=stage;currentRun.currentWave=0;currentRun.gameOver=false;currentRun.runFinished=false;
    currentRun.devInvincible=$("dev-invincible").checked;selectedTower=null;selectedTowerEntity=null;
    $("card-overlay").hidden=true;$("progress-overlay").hidden=true;$("result-overlay").hidden=true;
    updateAreaLabels();refresh();setWaveStatus("READY WHEN YOU ARE");showBattleMessage("DEVELOPER MODE: PROGRESSION UPDATED");if(!gameRunning)startGameLoop();
  }
  $("dev-jump-progress").addEventListener("click",()=>{if(!active())return;jumpProgress(Number($("dev-area").value),Number($("dev-campsite").value),Number($("dev-stage").value));say("Moved to the selected area, campsite and stage.");});
  $("dev-all-cards").addEventListener("click",()=>{if(!active())return;["arrows","arcane","siege","greed","walls"].forEach(id=>{currentRun.cards.push(id);if(id==="walls"){currentRun.maxCastleHealth+=20;currentRun.castleHealth+=20;}});currentRun.castleHealth=Math.min(currentRun.castleHealth,currentRun.maxCastleHealth);refresh();say("Added one stack of every card, including the wall bonus.");});
  $("dev-trigger-boss").addEventListener("click",()=>{if(!active())return;jumpProgress(3,2,3);currentRun.currentWave=4;startWave(false);startGameLoop();say("Started the final boss wave.");});

  $("dev-pause").addEventListener("click",()=>{if(!active())return;stopGameLoop();say("Game loop paused. Use Resume Game to continue.");});
  $("dev-resume").addEventListener("click",()=>{if(!active())return;if($("card-overlay").hidden&&$("progress-overlay").hidden&&$("result-overlay").hidden)startGameLoop();say("Game loop resumed.");});
  $("dev-apply-speed").addEventListener("click",()=>{if(!active())return;currentRun.devGameSpeed=Math.max(.5,Math.min(3,Number($("dev-speed").value)||1));say("Game speed set to "+currentRun.devGameSpeed+"×.");});

  // Drag by the title bar; clamp the panel so its header remains reachable.
  let dragging=false,startX=0,startY=0,left=0,top=0;
  header.addEventListener("pointerdown",e=>{
    if(e.target.closest("button"))return;
    const r=panel.getBoundingClientRect();dragging=true;startX=e.clientX;startY=e.clientY;left=r.left;top=r.top;
    panel.style.left=left+"px";panel.style.top=top+"px";panel.style.right="auto";
    header.setPointerCapture(e.pointerId);e.preventDefault();
  });
  header.addEventListener("pointermove",e=>{
    if(!dragging)return;
    const r=panel.getBoundingClientRect(),maxLeft=Math.max(0,innerWidth-r.width),maxTop=Math.max(0,innerHeight-48);
    panel.style.left=Math.max(0,Math.min(maxLeft,left+e.clientX-startX))+"px";
    panel.style.top=Math.max(0,Math.min(maxTop,top+e.clientY-startY))+"px";
  });
  const stopDrag=()=>{dragging=false;};
  header.addEventListener("pointerup",stopDrag);header.addEventListener("pointercancel",stopDrag);
})();
