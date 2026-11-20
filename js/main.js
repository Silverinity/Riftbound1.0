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
  const hubScreen = byId("hub-screen");
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
      if (data.progression && typeof window.loadRiftboundProgression === "function") window.loadRiftboundProgression(data.progression);
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
        body: JSON.stringify({ save: { version: 1, run: run || null, settings: window.riftboundSettings, progression: typeof window.getRiftboundProgressionExport === "function" ? window.getRiftboundProgressionExport() : null } })
      });
      if (!response.ok) throw new Error("Save request failed (" + response.status + ").");
      cloudSaveAvailable = !!run && !run.completed;
      byId("continue-run").hidden = !cloudSaveAvailable;
      byId("auth-status").textContent = run ? "BETA ACCESS VERIFIED · PROGRESS SAVED" : "BETA ACCESS VERIFIED · PROFILE SAVED";
    } catch (error) {
      console.error("Could not save Riftbound progress:", error);
      byId("auth-status").textContent = "CLOUD SAVE FAILED · CHECK BACKEND DATABASE";
    }
  };

  window.riftboundCloudSaveProfile = async () => {
    if (!betaAuthenticated) return;
    try {
      const response = await fetch(API_BASE + "/api/save", { credentials: "include" });
      if (!response.ok) throw new Error("Could not read the existing cloud save.");
      const data = await response.json();
      const existingRun = data.save?.run;
      return window.riftboundCloudSave(existingRun && !existingRun.completed ? existingRun : null);
    } catch (error) {
      console.warn("Could not update cloud progression without a run:", error);
      byId("auth-status").textContent = "PROFILE SAVED LOCALLY · CLOUD SYNC UNAVAILABLE";
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
        const cloud = await loadCloudSave();
        newRun.disabled = false;
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
      status.textContent = "COULD NOT REACH AUTH SERVER · CHECK CONNECTION AND RETRY";
      login.hidden = false;
      console.error("Could not check Riftbound beta access:", error);
    } finally {
      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }

  byId("discord-login").addEventListener("click", () => {
    byId("auth-status").textContent = "CONNECTING TO DISCORD...";
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
    if (hubScreen) hubScreen.hidden = true;
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
    if (hubScreen) hubScreen.hidden = true;
    resultOverlay.hidden = true;
    settingsOverlay.hidden = true;
    byId("card-overlay").hidden = true;
  }

  function showHubView(view) {
    document.querySelectorAll(".hub-view").forEach(section => {
      section.hidden = section.id !== "hub-" + view + "-view";
    });
    document.querySelectorAll("[data-hub-view]").forEach(button => {
      button.classList.toggle("active", button.dataset.hubView === view);
    });
  }

  function openHub() {
    if (typeof stopGameLoop === "function") stopGameLoop();
    hideScreens();
    hubScreen.hidden = false;
    showHubView("home");
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
    const button = byId("continue-run");
    if (!betaAuthenticated) {
      byId("auth-status").textContent = "PLEASE SIGN IN WITH DISCORD BEFORE CONTINUING";
      return;
    }
    button.disabled = true;
    button.textContent = "LOADING RUN...";
    byId("auth-status").textContent = "LOADING YOUR SAVED EXPEDITION...";
    try {
      const response = await fetch(API_BASE + "/api/save", { credentials: "include" });
      if (!response.ok) throw new Error("Save request failed (" + response.status + ").");
      const cloud = await response.json();
      cloudSaveAvailable = !!cloud.hasSave;
      if (!cloud.hasSave || !cloud.save?.run) {
        byId("auth-status").textContent = "NO VALID CLOUD SAVE WAS FOUND";
        return;
      }
      if (typeof window.restoreRiftboundRun !== "function") {
        throw new Error("The run restoration system did not load.");
      }
      const restored = window.restoreRiftboundRun(cloud.save);
      if (!restored) throw new Error("The saved expedition data could not be restored.");
      byId("auth-status").textContent = "EXPEDITION RESTORED";
    } catch (error) {
      console.error("Could not continue Riftbound run:", error);
      byId("auth-status").textContent = "COULD NOT CONTINUE RUN · " + error.message.toUpperCase();
    } finally {
      button.disabled = false;
      button.textContent = "CONTINUE RUN";
    }
  });

  byId("new-run").addEventListener("click", () => {
    if (!betaAuthenticated) {
      byId("auth-status").textContent = "PLEASE SIGN IN WITH AN APPROVED BETA TESTER ACCOUNT";
      return;
    }
    // PLAY on the title screen only opens the Command Sanctum.
    // Replacing an existing expedition is confirmed at BEGIN EXPEDITION instead.
    openHub();
  });
  byId("hub-back").addEventListener("click", returnToMenu);
  document.querySelectorAll("[data-hub-view]").forEach(button => {
    button.addEventListener("click", () => showHubView(button.dataset.hubView));
  });
  byId("hub-play").addEventListener("click", () => {
    if (cloudSaveAvailable && !window.confirm("Starting a new expedition will replace your existing run. Continue?")) return;
    try {
      if (typeof window.startRiftboundNewRun !== "function") {
        throw new Error("The game engine did not expose the new-run function.");
      }
      window.startRiftboundNewRun();
      hideScreens();
      gameScreen.hidden = false;
      initBattlefield();
    } catch (error) {
      console.error("Could not start a Riftbound expedition:", error);
      gameScreen.hidden = true;
      hubScreen.hidden = false;
      showHubView("home");
      byId("auth-status").textContent = "COULD NOT START THE EXPEDITION · CHECK THE CONSOLE";
    }
  });
  document.querySelectorAll(".tower-button").forEach(button => {
    button.addEventListener("click", () => selectTower(button.dataset.tower));
  });
  byId("leave-battle").addEventListener("click", () => {
    if (window.confirm("Leave the battlefield and return to the Command Sanctum? Your progress will be saved.")) {
      if (typeof window.persistRiftboundCheckpoint === "function") {
        window.persistRiftboundCheckpoint("battle");
      }
      openHub();
    }
  });
  byId("result-continue").addEventListener("click", async () => {
    try { await window.riftboundCloudSave?.(null); } catch (error) { console.warn("Could not clear completed expedition:", error); }
    openHub();
  });
  byId("result-stats-toggle").addEventListener("click", () => {
    const panel = byId("result-stats");
    panel.hidden = !panel.hidden;
    byId("result-stats-toggle").textContent = panel.hidden ? "VIEW RUN STATISTICS" : "HIDE RUN STATISTICS";
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !settingsOverlay.hidden) closeSettings();
  });

  displaySettings();
  checkBetaSession();
})();
