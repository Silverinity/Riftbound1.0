
/* =========================================
   RIFTBOUND - MAIN MENU AND NAVIGATION
========================================= */

const mainMenu = document.getElementById("main-menu");
const preparationScreen = document.getElementById("preparation-screen");
const gameScreen = document.getElementById("game-screen");
const restScreen = document.getElementById("rest-screen");

const resultOverlay = document.getElementById("result-overlay");
const settingsOverlay = document.getElementById("settings-overlay");


/* =========================================
   SETTINGS
========================================= */

const defaultSettings = {
    masterVolume: 100,
    musicVolume: 70,
    sfxVolume: 80,
    screenShake: true,
    damageNumbers: true,
    towerRanges: false,
    difficulty: "normal"
};

function loadSettings() {
    try {
        const saved = localStorage.getItem("riftbound-settings");

        return saved
            ? { ...defaultSettings, ...JSON.parse(saved) }
            : { ...defaultSettings };
    } catch (error) {
        return { ...defaultSettings };
    }
}

let settings = loadSettings();

function displaySettings() {
    document.getElementById("master-volume").value = settings.masterVolume;
    document.getElementById("music-volume").value = settings.musicVolume;
    document.getElementById("sfx-volume").value = settings.sfxVolume;

    document.getElementById("screen-shake").checked = settings.screenShake;
    document.getElementById("damage-numbers").checked = settings.damageNumbers;
    document.getElementById("tower-ranges").checked = settings.towerRanges;

    document.getElementById("difficulty").value = settings.difficulty;

    updateVolumeLabels();
}

function updateVolumeLabels() {
    document.getElementById("master-value").textContent =
        document.getElementById("master-volume").value + "%";

    document.getElementById("music-value").textContent =
        document.getElementById("music-volume").value + "%";

    document.getElementById("sfx-value").textContent =
        document.getElementById("sfx-volume").value + "%";
}

function readSettings() {
    return {
        masterVolume: Number(document.getElementById("master-volume").value),
        musicVolume: Number(document.getElementById("music-volume").value),
        sfxVolume: Number(document.getElementById("sfx-volume").value),

        screenShake: document.getElementById("screen-shake").checked,
        damageNumbers: document.getElementById("damage-numbers").checked,
        towerRanges: document.getElementById("tower-ranges").checked,

        difficulty: document.getElementById("difficulty").value
    };
}

function saveSettings() {
    settings = readSettings();

    try {
        localStorage.setItem(
            "riftbound-settings",
            JSON.stringify(settings)
        );
    } catch (error) {
        console.warn("Could not save settings:", error);
    }
}

function closeSettings() {
    settingsOverlay.hidden = true;
}

document.getElementById("settings").addEventListener("click", () => {
    settingsOverlay.hidden = false;
    displaySettings();
});

document.getElementById("close-settings").addEventListener("click", closeSettings);

document.getElementById("save-settings").addEventListener("click", () => {
    saveSettings();
    closeSettings();
});

document.getElementById("reset-settings").addEventListener("click", () => {
    settings = { ...defaultSettings };
    displaySettings();

    try {
        localStorage.setItem(
            "riftbound-settings",
            JSON.stringify(settings)
        );
    } catch (error) {
        console.warn("Could not save settings:", error);
    }
});

settingsOverlay.addEventListener("click", event => {
    if (event.target === settingsOverlay) {
        closeSettings();
    }
});

["master-volume", "music-volume", "sfx-volume"].forEach(id => {
    document.getElementById(id).addEventListener("input", updateVolumeLabels);
});

document.getElementById("fullscreen-button").addEventListener("click", async () => {
    try {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
        } else {
            await document.exitFullscreen();
        }
    } catch (error) {
        console.warn("Fullscreen is unavailable:", error);
    }
});

displaySettings();


/* =========================================
   SCREEN HELPERS
========================================= */

function hideAllScreens() {
    mainMenu.style.display = "none";
    preparationScreen.hidden = true;
    gameScreen.hidden = true;
    restScreen.hidden = true;
}

function showMainMenu() {
    stopGameLoop();

    hideAllScreens();

    mainMenu.style.display = "flex";

    resultOverlay.hidden = true;
    settingsOverlay.hidden = true;
}

function showPreparationScreen() {
    stopGameLoop();

    hideAllScreens();

    preparationScreen.hidden = false;
    resultOverlay.hidden = true;
}

function showRestScreen() {
    stopGameLoop();

    hideAllScreens();

    restScreen.hidden = false;
    resultOverlay.hidden = true;

    updateRestScreen();
}


/* =========================================
   NEW RUN
========================================= */

document.getElementById("new-run").addEventListener("click", () => {
    startNewRun();
    showPreparationScreen();
});


/* =========================================
   PREPARATION SCREEN
========================================= */

document.getElementById("back-to-menu").addEventListener("click", () => {
    showMainMenu();
});

document.getElementById("begin-defense").addEventListener("click", () => {
    hideAllScreens();

    gameScreen.hidden = false;

    initBattlefield();
});


/* =========================================
   BATTLEFIELD CONTROLS
========================================= */

document.querySelectorAll(".tower-button").forEach(button => {
    button.addEventListener("click", () => {
        selectTower(button.dataset.tower);
    });
});

document.getElementById("start-wave").addEventListener("click", () => {
    startWave();
});

document.getElementById("leave-battle").addEventListener("click", () => {
    const shouldLeave = window.confirm(
        "Leave this battle and return to the main menu? Your current run will be lost."
    );

    if (shouldLeave) {
        showMainMenu();
    }
});


/* =========================================
   VICTORY AND DEFEAT
========================================= */

document.getElementById("result-continue").addEventListener("click", event => {
    const action = event.currentTarget.dataset.action;

    resultOverlay.hidden = true;

    if (action === "rest") {
        showRestScreen();
    } else {
        showMainMenu();
    }
});


/* =========================================
   RESTING SITE
========================================= */

document.getElementById("rest-heal").addEventListener("click", () => {
    healAtRestSite();
});

document.getElementById("rest-upgrade").addEventListener("click", () => {
    upgradeAtRestSite();
});

document.getElementById("finish-run").addEventListener("click", () => {
    showMainMenu();
});


/* =========================================
   KEYBOARD CONTROLS
========================================= */

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        if (!settingsOverlay.hidden) {
            closeSettings();
            return;
        }

    }
});


/* =========================================
   PLACEHOLDER MENU BUTTONS
========================================= */

document.getElementById("upgrades").addEventListener("click", () => {
    alert("Permanent upgrades are planned for a future update.");
});

document.getElementById("collection").addEventListener("click", () => {
    alert("The collection and bestiary are planned for a future update.");
});
