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

  // Main menu / Command Sanctum background music.
  const menuMusic = new Audio("assets/audio/music/menu.mp3");
  menuMusic.loop = true;
  menuMusic.preload = "auto";

  function updateMusicVolume() {
    const settings = window.riftboundSettings || DEFAULT_SETTINGS;
    menuMusic.volume = Math.max(0, Math.min(1,
      (Number(settings.masterVolume) / 100) * (Number(settings.musicVolume) / 100)
    ));
  }

  function playMenuMusic() {
    updateMusicVolume();
    if (menuMusic.volume <= 0) {
      menuMusic.pause();
      return;
    }
    if (menuMusic.paused) {
      menuMusic.play().catch(error => {
        // Browsers may block playback until the player interacts with the page.
        console.info("Menu music will start after the next interaction:", error);
      });
    }
  }

  function stopMenuMusic() {
    menuMusic.pause();
  }

  // Browsers require a user gesture before starting audio.
  document.addEventListener("pointerdown", playMenuMusic, { once: true, capture: true });
  document.addEventListener("keydown", playMenuMusic, { once: true, capture: true });

  const byId = id => document.getElementById(id);
  const mainMenu = byId("main-menu");
  const hubScreen = byId("hub-screen");
  const gameScreen = byId("game-screen");
  const campsiteScreen = byId("campsite-screen");
  const resultOverlay = byId("result-overlay");
  const settingsOverlay = byId("settings-overlay");
  const API_BASE = (window.RIFTBOUND_API_BASE || "http://localhost:3000").replace(/\/$/, "");
  let betaAuthenticated = false;
  async function loadCloudSave() {
    try {
      const response = await fetch(API_BASE + "/api/save", { credentials: "include" });
      if (!response.ok) throw new Error("Player profile could not be loaded.");
      const data = await response.json();
      if (data.progression && typeof window.loadRiftboundProgression === "function") window.loadRiftboundProgression(data.progression);
      return data;
    } catch (error) {
      console.warn("Could not load Riftbound player profile:", error);
      return null;
    }
  }

  // Cloud saves contain permanent profile progression and settings only.
  window.riftboundCloudSave = async () => {
    if (!betaAuthenticated) return;
    try {
      const response = await fetch(API_BASE + "/api/save", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ save: { version: 1, run: null, settings: window.riftboundSettings, progression: typeof window.getRiftboundProgressionExport === "function" ? window.getRiftboundProgressionExport() : null } })
      });
      if (!response.ok) throw new Error("Save request failed (" + response.status + ").");
      byId("auth-status").textContent = "BETA ACCESS VERIFIED · PROFILE SAVED";
    } catch (error) {
      console.error("Could not save Riftbound profile:", error);
      byId("auth-status").textContent = "CLOUD SAVE FAILED · CHECK BACKEND DATABASE";
    }
  };

  window.riftboundCloudSaveProfile = async () => window.riftboundCloudSave();

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
    } catch (error) {
      betaAuthenticated = false;
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
    playMenuMusic();
    hideScreens();
    mainMenu.style.display = "flex";
    if (hubScreen) hubScreen.hidden = true;
    resultOverlay.hidden = true;
    settingsOverlay.hidden = true;
    byId("card-overlay").hidden = true;
  }

  function showHubView(view) {
    if(view==="commanders")window.renderRiftboundCommanders?.();
    if(view==="traits")window.renderRiftboundTraits?.();
    document.querySelectorAll(".hub-view").forEach(section => {
      section.hidden = section.id !== "hub-" + view + "-view";
    });
    document.querySelectorAll("[data-hub-view]").forEach(button => {
      button.classList.toggle("active", button.dataset.hubView === view);
    });
  }

  function openHub() {
    if (typeof stopGameLoop === "function") stopGameLoop();
    playMenuMusic();
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
    updateMusicVolume();
    persistSettings();
    if (typeof updateDeveloperModeUI === "function") updateDeveloperModeUI();
    closeSettings();
  });
  byId("reset-settings").addEventListener("click", () => {
    window.riftboundSettings = { ...DEFAULT_SETTINGS };
    updateMusicVolume();
    displaySettings();
    persistSettings();
    if (typeof updateDeveloperModeUI === "function") updateDeveloperModeUI();
  });
  settingsOverlay.addEventListener("click", event => {
    if (event.target === settingsOverlay) closeSettings();
  });
  ["master-volume", "music-volume", "sfx-volume"].forEach(id => {
    byId(id).addEventListener("input", () => {
      updateVolumeLabels();
      updateMusicVolume();
    });
  });
  byId("fullscreen-button").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (error) {
      console.warn("Fullscreen is unavailable:", error);
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
  byId("hub-play").addEventListener("click", async () => {
    const activeRun=!!window.isRiftboundRunActive?.();
    if (activeRun && !window.confirm("Starting a new expedition will abandon your current expedition. Continue?")) return;
    try {
      if (typeof window.startRiftboundNewRun !== "function") {
        throw new Error("The game engine did not expose the new-run function.");
      }
      stopMenuMusic();
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
    if (window.confirm("Return to the lobby? Your current expedition will be abandoned and cannot be resumed.")) {
      openHub();
    }
  });
  byId("result-continue").addEventListener("click", () => openHub());
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
