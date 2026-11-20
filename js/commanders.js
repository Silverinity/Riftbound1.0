/* RIFTBOUND - COMMANDER SELECTION */
(() => {
  "use strict";

  const commanders = [
    {
      id: "warden", name: "The Warden", speciality: "DEFENCE",
      passive: "Fortified Defences", passiveDescription: "Towers receive a small defensive bonus.",
      ability: "Iron Bastion", abilityDescription: "Temporarily strengthens the castle and nearby towers.",
      playstyle: "Survive difficult waves through careful defensive positioning.",
      strength: "Strong survivability", weakness: "Limited offensive support"
    },
    {
      id: "arcanist", name: "The Arcanist", speciality: "MAGIC",
      passive: "Arcane Mastery", passiveDescription: "Arcane Towers deal increased damage.",
      ability: "Rift Surge", abilityDescription: "Unleashes magical energy along the enemy path.",
      playstyle: "Focus on magical damage and specialised tower builds.",
      strength: "Powerful magical attacks", weakness: "Less benefit from non-magical towers"
    },
    {
      id: "huntmaster", name: "The Huntmaster", speciality: "PRECISION",
      passive: "Predator's Instinct", passiveDescription: "Towers deal bonus damage to high-health enemies.",
      ability: "Marked Prey", abilityDescription: "Marks an enemy and makes towers prioritise it.",
      playstyle: "Eliminate elite enemies and bosses before they reach the castle.",
      strength: "Excellent against tough targets", weakness: "Less specialised against large groups"
    },
    {
      id: "treasurer", name: "The Treasurer", speciality: "ECONOMY",
      passive: "Golden Fortune", passiveDescription: "Gain additional gold from defeated enemies.",
      ability: "Royal Decree", abilityDescription: "Instantly grants a bonus amount of gold.",
      playstyle: "Build an economic advantage through careful spending.",
      strength: "Greater resource flexibility", weakness: "Limited direct combat support"
    },
    {
      id: "pyromancer", name: "The Pyromancer", speciality: "AREA DAMAGE",
      passive: "Eternal Flame", passiveDescription: "Towers have a chance to inflict burning.",
      ability: "Inferno", abilityDescription: "Creates a wave of fire across the enemy path.",
      playstyle: "Clear groups of enemies with area damage and burning.",
      strength: "Effective against groups", weakness: "Less specialised against individual tough targets"
    },
    {
      id: "necromancer", name: "The Necromancer", speciality: "SUMMONING",
      passive: "Soul Harvest", passiveDescription: "Defeated enemies can leave temporary spectral allies.",
      ability: "Raise the Fallen", abilityDescription: "Summons spectral defenders to attack nearby enemies.",
      playstyle: "Turn defeated enemies into additional battlefield support.",
      strength: "Creates extra battlefield units", weakness: "Less effective against sparse enemy waves"
    }
  ];

  const storageKey = "riftbound-selected-commander";
  let selectedId = "warden";
  try {
    const saved = localStorage.getItem(storageKey);
    if (commanders.some(commander => commander.id === saved)) selectedId = saved;
  } catch (error) {
    console.warn("Could not load selected commander:", error);
  }

  function publishSelection() {
    const selected = commanders.find(commander => commander.id === selectedId) || commanders[0];
    window.riftboundCommanderId = selected.id;
    window.riftboundCommander = selected;
    document.querySelectorAll("[data-commander-id]").forEach(card => {
      const active = card.dataset.commanderId === selectedId;
      card.classList.toggle("commander-card-selected", active);
      const button = card.querySelector("button");
      if (button) {
        button.textContent = active ? "SELECTED" : "SELECT COMMANDER";
        button.setAttribute("aria-pressed", String(active));
      }
    });
    const summary = document.getElementById("commander-selected-summary");
    if (summary) summary.textContent = "SELECTED COMMANDER · " + selected.name.toUpperCase();
    try {
      localStorage.setItem(storageKey, selectedId);
    } catch (error) {
      console.warn("Could not save selected commander:", error);
    }
  }

  function createCommanderSection() {
    const preparation = document.getElementById("preparation-screen");
    const anchor = preparation?.querySelector(".preparation-content");
    if (!preparation || !anchor || document.getElementById("commander-selection")) return;

    const section = document.createElement("section");
    section.id = "commander-selection";
    section.className = "commander-selection";
    section.setAttribute("aria-labelledby", "commander-selection-title");
    section.innerHTML = `
      <div class="commander-section-heading">
        <div>
          <p class="prep-eyebrow">CHOOSE YOUR STRATEGY</p>
          <h2 id="commander-selection-title">SELECT YOUR COMMANDER</h2>
          <p>Each commander brings a different speciality, passive and signature ability.</p>
        </div>
        <strong id="commander-selected-summary" aria-live="polite"></strong>
      </div>
      <div class="commander-grid">
        ${commanders.map(commander => `
          <article class="commander-card" data-commander-id="${commander.id}">
            <div class="commander-card-top">
              <span class="commander-emblem">${commander.name === "The Warden" ? "♜" : commander.name === "The Arcanist" ? "✧" : commander.name === "The Huntmaster" ? "➶" : commander.name === "The Treasurer" ? "♛" : commander.name === "The Pyromancer" ? "♨" : "☠"}</span>
              <span class="commander-speciality">${commander.speciality}</span>
            </div>
            <h3>${commander.name}</h3>
            <div class="commander-detail"><span>PASSIVE · ${commander.passive}</span><p>${commander.passiveDescription}</p></div>
            <div class="commander-detail"><span>ABILITY · ${commander.ability}</span><p>${commander.abilityDescription}</p></div>
            <p class="commander-playstyle">${commander.playstyle}</p>
            <div class="commander-tradeoff">
              <p><b>STRENGTH</b> ${commander.strength}</p>
              <p><b>WEAKNESS</b> ${commander.weakness}</p>
            </div>
            <button type="button" data-select-commander="${commander.id}">SELECT COMMANDER</button>
          </article>
        `).join("")}
      </div>
    `;
    anchor.parentNode.insertBefore(section, anchor);
    section.querySelectorAll("[data-select-commander]").forEach(button => {
      button.addEventListener("click", () => {
        selectedId = button.dataset.selectCommander;
        publishSelection();
      });
    });
    publishSelection();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createCommanderSection, { once: true });
  } else {
    createCommanderSection();
  }
})();
