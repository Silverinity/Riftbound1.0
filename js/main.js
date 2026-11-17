/* RIFTBOUND - MENU, SETTINGS AND NAVIGATION */
const mainMenu=document.getElementById("main-menu");
const preparationScreen=document.getElementById("preparation-screen");
const gameScreen=document.getElementById("game-screen");
const restScreen=document.getElementById("rest-screen");
const resultOverlay=document.getElementById("result-overlay");
const settingsOverlay=document.getElementById("settings-overlay");
const defaultSettings={masterVolume:100,musicVolume:70,sfxVolume:80,screenShake:true,damageNumbers:true,towerRanges:false,difficulty:"normal"};
function loadSettings(){try{const saved=localStorage.getItem("riftbound-settings");return saved?{...defaultSettings,...JSON.parse(saved)}:{...defaultSettings};}catch(e){return {...defaultSettings};}}
let settings=loadSettings();
function displaySettings(){document.getElementById("master-volume").value=settings.masterVolume;document.getElementById("music-volume").value=settings.musicVolume;document.getElementById("sfx-volume").value=settings.sfxVolume;document.getElementById("screen-shake").checked=settings.screenShake;document.getElementById("damage-numbers").checked=settings.damageNumbers;document.getElementById("tower-ranges").checked=settings.towerRanges;document.getElementById("difficulty").value=settings.difficulty;updateVolumeLabels();}
function updateVolumeLabels(){["master","music","sfx"].forEach(k=>document.getElementById(k+"-value").textContent=document.getElementById(k+"-volume").value+"%");}
function readSettings(){return {masterVolume:+document.getElementById("master-volume").value,musicVolume:+document.getElementById("music-volume").value,sfxVolume:+document.getElementById("sfx-volume").value,screenShake:document.getElementById("screen-shake").checked,damageNumbers:document.getElementById("damage-numbers").checked,towerRanges:document.getElementById("tower-ranges").checked,difficulty:document.getElementById("difficulty").value};}
function saveSettings(){settings=readSettings();try{localStorage.setItem("riftbound-settings",JSON.stringify(settings));}catch(e){console.warn(e);}}
function closeSettings(){settingsOverlay.hidden=true;}
document.getElementById("settings").addEventListener("click",()=>{settingsOverlay.hidden=false;displaySettings();});
document.getElementById("close-settings").addEventListener("click",closeSettings);
document.getElementById("save-settings").addEventListener("click",()=>{saveSettings();closeSettings();});
document.getElementById("reset-settings").addEventListener("click",()=>{settings={...defaultSettings};displaySettings();try{localStorage.setItem("riftbound-settings",JSON.stringify(settings));}catch(e){console.warn(e);}});
settingsOverlay.addEventListener("click",e=>{if(e.target===settingsOverlay)closeSettings();});
["master-volume","music-volume","sfx-volume"].forEach(id=>document.getElementById(id).addEventListener("input",updateVolumeLabels));
document.getElementById("fullscreen-button").addEventListener("click",async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch(e){console.warn("Fullscreen unavailable",e);}});
displaySettings();
function hideAllScreens(){mainMenu.style.display="none";preparationScreen.hidden=true;gameScreen.hidden=true;restScreen.hidden=true;}
function showMainMenu(){stopGameLoop();hideAllScreens();mainMenu.style.display="flex";resultOverlay.hidden=true;settingsOverlay.hidden=true;document.getElementById("card-overlay").hidden=true;}
function showPreparationScreen(){stopGameLoop();hideAllScreens();preparationScreen.hidden=false;resultOverlay.hidden=true;}
document.getElementById("new-run").addEventListener("click",()=>{startNewRun();showPreparationScreen();});
document.getElementById("back-to-menu").addEventListener("click",showMainMenu);
document.getElementById("begin-defense").addEventListener("click",()=>{hideAllScreens();gameScreen.hidden=false;initBattlefield();});
document.querySelectorAll(".tower-button").forEach(b=>b.addEventListener("click",()=>selectTower(b.dataset.tower)));
document.getElementById("leave-battle").addEventListener("click",()=>{if(window.confirm("Leave this battle and return to the main menu? Your current run will be lost."))showMainMenu();});
document.getElementById("result-continue").addEventListener("click",()=>{resultOverlay.hidden=true;showMainMenu();});
document.getElementById("rest-heal").addEventListener("click",healAtRestSite);
document.getElementById("rest-upgrade").addEventListener("click",upgradeAtRestSite);
document.getElementById("finish-run").addEventListener("click",showMainMenu);
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(!settingsOverlay.hidden){closeSettings();return;}if(!gameScreen.hidden){selectedTowerEntity=null;selectedTower=null;document.querySelectorAll(".tower-button").forEach(b=>b.classList.remove("selected"));updateTowerPanel();}}});
document.getElementById("upgrades").addEventListener("click",()=>alert("Permanent upgrades are planned for a future update."));
document.getElementById("collection").addEventListener("click",()=>alert("The collection and bestiary are planned for a future update."));
