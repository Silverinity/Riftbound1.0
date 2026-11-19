/* RIFTBOUND - MENU, SETTINGS AND NAVIGATION
   Keep settings on window so both classic scripts share one object safely.
*/
(() => {
  "use strict";

  const DEFAULT_SETTINGS = {
    masterVolume: 100,
    musicVolume: 70,
    sfxVolume: 80,
    screenShake: true,
    damageNumbers: true,
    towerRanges: false,
    difficulty: "normal",
    developerMode: false
  };

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem("riftbound-settings") || "null");
      return saved && typeof saved === "object"
        ? { ...DEFAULT_SETTINGS, ...saved }
        : { ...DEFAULT_SETTINGS };
    } catch (error) {
      console.warn("Could not load Riftbound settings:", error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  window.riftboundSettings = loadSettings();

  const byId = id => document.getElementById(id);
  const mainMenu = byId("main-menu");
  const preparationScreen = byId("preparation-screen");
  const gameScreen = byId("game-screen");
  const campsiteScreen = byId("campsite-screen");
  const resultOverlay = byId("result-overlay");
  const settingsOverlay = byId("settings-overlay");
  const API_BASE = (window.RIFTBOUND_API_BASE || "http://localhost:3000").replace(/\/$/, "");
  let betaAuthenticated = false;
  let cloudSaveAvailable = false;

  async function loadCloudSave() {
    try {
      const response = await fetch(API_BASE + "/api/save", { credentials: "include" });
      if (!response.ok) throw new Error("Cloud save could not be loaded.");
      const data = await response.json();
      cloudSaveAvailable = !!data.hasSave;
      byId("continue-run").hidden = !cloudSaveAvailable;
      if (cloudSaveAvailable) byId("auth-status").textContent = "BETA ACCESS VERIFIED · CLOUD SAVE FOUND";
      return data;
    } catch (error) {
      cloudSaveAvailable = false;
      byId("continue-run").hidden = true;
      console.warn("Could not load Riftbound cloud save:", error);
      return null;
    }
  }

  window.riftboundCloudSave = async run => {
    if (!betaAuthenticated) return;
    try {
      const response = await fetch(API_BASE + "/api/save", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ save: { version: 1, run, settings: window.riftboundSettings } })
      });
      if (!response.ok) throw new Error("Save request failed (" + response.status + ").");
      cloudSaveAvailable = true;
      byId("continue-run").hidden = false;
      byId("auth-status").textContent = "BETA ACCESS VERIFIED · PROGRESS SAVED";
    } catch (error) {
      console.error("Could not save Riftbound progress:", error);
      byId("auth-status").textContent = "CLOUD SAVE FAILED · CHECK BACKEND DATABASE";
    }
  };

  async function checkBetaSession() {
    const status = byId("auth-status");
    const login = byId("discord-login");
    const logout = byId("discord-logout");
    const userLabel = byId("auth-user");
    const newRun = byId("new-run");

    status.textContent = "CHECKING BETA ACCESS...";
    login.hidden = true;
    logout.hidden = true;
    userLabel.hidden = true;
    newRun.disabled = true;

    try {
      const response = await fetch(API_BASE + "/api/session", {
        method: "GET",
        credentials: "include",
        headers: { "Accept": "application/json" }
      });
      const data = await response.json();

      if (response.ok && data.authenticated) {
        betaAuthenticated = true;
        status.textContent = "BETA ACCESS VERIFIED";
        userLabel.textContent = "SIGNED IN AS " + (data.user?.username || "DISCORD USER");
        userLabel.hidden = false;
        logout.hidden = false;
        newRun.disabled = false;
        const cloud = await loadCloudSave();
        if (cloud?.save?.settings) {
          window.riftboundSettings = { ...DEFAULT_SETTINGS, ...cloud.save.settings };
          persistSettings();
          displaySettings();
          if (typeof updateDeveloperModeUI === "function") updateDeveloperModeUI();
        }
        return;
      }

      betaAuthenticated = false;
      const params = new URLSearchParams(window.location.search);
      if (params.get("discord") === "denied" || data.reason === "beta-access-required") {
        status.textContent = "ACCESS DENIED · BETA TESTER ROLE REQUIRED";
      } else if (params.get("discord") === "cancelled") {
        status.textContent = "DISCORD LOGIN CANCELLED";
      } else if (params.get("discord") === "login-error") {
        status.textContent = "DISCORD LOGIN FAILED · PLEASE TRY AGAIN";
      } else {
        status.textContent = "SIGN IN WITH DISCORD TO ACCESS THE CLOSED BETA";
      }
      login.hidden = false;
      byId("continue-run").hidden = true;
    } catch (error) {
      betaAuthenticated = false;
      byId("continue-run").hidden = true;
      status.textContent = "AUTH SERVER UNAVAILABLE · START THE RIFTBOUND BACKEND";
      login.hidden = true;
      console.error("Could not check Riftbound beta access:", error);
    } finally {
      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }

  byId("discord-login").addEventListener("click", () => {
    window.location.href = API_BASE + "/auth/discord";
  });

  byId("discord-logout").addEventListener("click", async () => {
    try {
      await fetch(API_BASE + "/auth/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch (error) {
      console.warn("Could not contact the auth server during logout:", error);
    }
    betaAuthenticated = false;
    byId("new-run").disabled = true;
    byId("auth-status").textContent = "YOU HAVE BEEN LOGGED OUT";
    byId("auth-user").hidden = true;
    byId("discord-logout").hidden = true;
    byId("discord-login").hidden = false;
    byId("continue-run").hidden = true;
  });

  function displaySettings() {
    const s = window.riftboundSettings;
    byId("master-volume").value = s.masterVolume;
    byId("music-volume").value = s.musicVolume;
    byId("sfx-volume").value = s.sfxVolume;
    byId("screen-shake").checked = s.screenShake;
    byId("damage-numbers").checked = s.damageNumbers;
    byId("tower-ranges").checked = s.towerRanges;
    byId("difficulty").value = s.difficulty;
    byId("developer-mode").checked = !!s.developerMode;
    updateVolumeLabels();
  }

  function updateVolumeLabels() {
    ["master", "music", "sfx"].forEach(key => {
      byId(key + "-value").textContent = byId(key + "-volume").value + "%";
    });
  }

  function readSettings() {
    return {
      masterVolume: Number(byId("master-volume").value),
      musicVolume: Number(byId("music-volume").value),
      sfxVolume: Number(byId("sfx-volume").value),
      screenShake: byId("screen-shake").checked,
      damageNumbers: byId("damage-numbers").checked,
      towerRanges: byId("tower-ranges").checked,
      difficulty: byId("difficulty").value,
      developerMode: byId("developer-mode").checked
    };
  }

  function persistSettings() {
    try {
      localStorage.setItem("riftbound-settings", JSON.stringify(window.riftboundSettings));
    } catch (error) {
      console.warn("Could not save Riftbound settings:", error);
    }
  }

  function closeSettings() {
    settingsOverlay.hidden = true;
  }

  function hideScreens() {
    mainMenu.style.display = "none";
    preparationScreen.hidden = true;
    gameScreen.hidden = true;
    if (campsiteScreen) campsiteScreen.hidden = true;
    byId("card-overlay").hidden = true;
    byId("progress-overlay").hidden = true;
    resultOverlay.hidden = true;
    settingsOverlay.hidden = true;
  }

  function returnToMenu() {
    if (typeof stopGameLoop === "function") stopGameLoop();
    hideScreens();
    mainMenu.style.display = "flex";
    resultOverlay.hidden = true;
    settingsOverlay.hidden = true;
    byId("card-overlay").hidden = true;
  }

  function openPreparation() {
    if (typeof stopGameLoop === "function") stopGameLoop();
    hideScreens();
    preparationScreen.hidden = false;
    resultOverlay.hidden = true;
    settingsOverlay.hidden = true;
  }

  byId("settings").addEventListener("click", () => {
    displaySettings();
    settingsOverlay.hidden = false;
  });
  byId("close-settings").addEventListener("click", closeSettings);
  byId("save-settings").addEventListener("click", () => {
    window.riftboundSettings = readSettings();
    persistSettings();
    if (typeof updateDeveloperModeUI === "function") updateDeveloperModeUI();
    closeSettings();
  });
  byId("reset-settings").addEventListener("click", () => {
    window.riftboundSettings = { ...DEFAULT_SETTINGS };
    displaySettings();
    persistSettings();
    if (typeof updateDeveloperModeUI === "function") updateDeveloperModeUI();
  });
  settingsOverlay.addEventListener("click", event => {
    if (event.target === settingsOverlay) closeSettings();
  });
  ["master-volume", "music-volume", "sfx-volume"].forEach(id => {
    byId(id).addEventListener("input", updateVolumeLabels);
  });
  byId("fullscreen-button").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (error) {
      console.warn("Fullscreen is unavailable:", error);
    }
  });

  byId("continue-run").addEventListener("click", async () => {
    if (!betaAuthenticated) return;
    const cloud = await loadCloudSave();
    if (cloud?.save && window.restoreRiftboundRun(cloud.save)) return;
    byId("auth-status").textContent = "NO VALID CLOUD SAVE WAS FOUND";
  });

  byId("new-run").addEventListener("click", async () => {
    if (!betaAuthenticated) {
      byId("auth-status").textContent = "PLEASE SIGN IN WITH AN APPROVED BETA TESTER ACCOUNT";
      return;
    }
    if (cloudSaveAvailable && !window.confirm("Starting a new expedition will replace your existing cloud save. Continue?")) return;
    startNewRun();
    openPreparation();
  });
  byId("back-to-menu").addEventListener("click", returnToMenu);
  byId("begin-defense").addEventListener("click", () => {
    hideScreens();
    gameScreen.hidden = false;
    initBattlefield();
  });
  document.querySelectorAll(".tower-button").forEach(button => {
    button.addEventListener("click", () => selectTower(button.dataset.tower));
  });
  byId("leave-battle").addEventListener("click", () => {
    if (window.confirm("Leave this battle and return to the main menu? Your current run will be lost.")) {
      returnToMenu();
    }
  });
  byId("result-continue").addEventListener("click", returnToMenu);

  byId("upgrades").addEventListener("click", () => {
    window.alert("Permanent upgrades are planned for a future update. Tower upgrades during a run are available on the battlefield.");
  });
  byId("collection").addEventListener("click", () => {
    window.alert("The collection and bestiary are planned for a future update. Your run cards are shown when you earn a reward.");
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !settingsOverlay.hidden) closeSettings();
  });

  displaySettings();
  checkBetaSession();
})();
