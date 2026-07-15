// Rendering: builds all HTML from current state and writes it to the DOM.
// Render functions are pure with respect to state — they read, never write.

import { state } from "./state.js";
import { skillDefinitions, conditionDefinitions, exhaustionEffects, sorcererSpellSlots, flexibleCastingCost, actionReference } from "./constants.js";
import {
  getAbilityModifier,
  getProficiencyBonus,
  getArmorClass,
  getAvailableSlots,
  getSkillBonus,
  groupSpellsByLevel,
  resolveDynamicText,
} from "./mechanics.js";
import { formatModifier, capitalize, escapeAttribute } from "./utils.js";

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export function renderAll() {
  renderTabs();
  updateHeroIdentity();
  renderAbilities();
  renderSkills();
  renderCombat();
  renderConditions();
  renderActions();
  renderSpells();
  renderSorceryPoints();
  renderMetamagic();
  renderWildMagic();
  renderCoins();
  renderAttunement();
  renderInventory();
  renderTraits();
}

export function renderLoadingState() {
  const template = document.getElementById("loading-state-template");
  const content = template ? template.innerHTML : '<div class="callout">Loading...</div>';
  for (const id of ["spell-slots", "known-spells", "metamagic-list", "inventory-list", "traits-list"]) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = content;
  }
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function renderTabs() {
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.tab === state.activeTab);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === state.activeTab);
  });
}

function updateHeroIdentity() {
  document.title = `${state.basics.name} Character Sheet`;
  document.querySelector(".hero h1").textContent =
    `${state.basics.name} the ${state.basics.race}`;
  document.getElementById("hero-class").textContent    = state.basics.className;
  document.getElementById("hero-subclass").textContent = state.basics.subclass;
  document.getElementById("hero-race").textContent     = state.basics.race;
  document.getElementById("hero-background").textContent = state.basics.background ?? "—";
  document.getElementById("hero-prof-bonus").textContent = formatModifier(getProficiencyBonus());
  document.getElementById("hero-passive-perception").textContent = 10 + getSkillBonus("perception");
  document.getElementById("hero-passive-insight").textContent    = 10 + getSkillBonus("insight");
  const inspirationToggle = document.getElementById("hero-inspiration-toggle");
  if (inspirationToggle) inspirationToggle.checked = Boolean(state.inspiration);

  // Show remaining hit dice on the short rest button
  const hdUsed = state.hitDice?.used ?? 0;
  const hdTotal = state.basics.level;
  const hdAvail = Math.max(0, hdTotal - hdUsed);
  const srBtn = document.getElementById("short-rest-button");
  if (srBtn) srBtn.textContent = "Short Rest";
}

// ---------------------------------------------------------------------------
// Stats tab
// ---------------------------------------------------------------------------

function renderAbilities() {
  const abilities = [
    ["STR", "str"],
    ["DEX", "dex"],
    ["CON", "con"],
    ["INT", "int"],
    ["WIS", "wis"],
    ["CHA", "cha"],
  ];

  document.getElementById("ability-grid").innerHTML = abilities
    .map(
      ([label, key]) => {
        const proficient = state.savingThrows?.[key]?.proficient ?? false;
        const saveMod = getAbilityModifier(state.abilities[key]) + (proficient ? getProficiencyBonus() : 0);
        return `
          <article class="ability-card">
            <span class="ability-name">${label}</span>
            <div class="big-number">${formatModifier(getAbilityModifier(state.abilities[key]))}</div>
            <div class="subtext">modifier</div>
            <input class="ability-score" type="number" min="1" max="30"
              value="${state.abilities[key]}" data-ability-field="${key}">
            <div class="ability-save-row">
              <span class="ability-save-value${proficient ? " is-proficient" : ""}">${formatModifier(saveMod)}</span>
              <label class="toggle ability-save-toggle">
                <input type="checkbox" ${proficient ? "checked" : ""} data-save-toggle="${key}">
                Save
              </label>
            </div>
          </article>`;
      }
    )
    .join("");
}

function renderSkills() {
  document.getElementById("skills-grid").innerHTML = skillDefinitions
    .map((skill) => {
      const bonus = getSkillBonus(skill.key);
      const abilityMod = getAbilityModifier(state.abilities[skill.ability]);
      const proficient = state.skills[skill.key].proficient;
      return `
        <div class="skill-row">
          <div class="skill-total">
            <span class="skill-value">${formatModifier(bonus)}</span>
            <span class="mini-label">total</span>
          </div>
          <div class="skill-main">
            <div class="skill-label-row">
              <strong class="skill-label">${skill.label}</strong>
              <span class="pill">${skill.ability.toUpperCase()}</span>
            </div>
            <div class="skill-meta">
              <span class="pill">Ability ${formatModifier(abilityMod)}</span>
              <span class="pill">${proficient ? `Proficient +${getProficiencyBonus()}` : "No proficiency"}</span>
            </div>
          </div>
          <label class="toggle skill-toggle">
            <input type="checkbox" ${proficient ? "checked" : ""}
              data-skill-toggle="${skill.key}">
            Prof.
          </label>
        </div>`;
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Combat tab
// ---------------------------------------------------------------------------

function renderCombat() {
  const ac = getArmorClass();
  const proficiency = getProficiencyBonus();
  const chaMod = getAbilityModifier(state.abilities.cha);
  const dexMod = getAbilityModifier(state.abilities.dex);
  const spellAttack = proficiency + chaMod;
  const spellSaveDc = 8 + proficiency + chaMod;
  const mageActive = state.combat.mageArmorActive;
  const level1Remaining = (getAvailableSlots()[1] ?? 0) - (state.spellSlotsUsed[1] ?? 0);
  const wearingArmor = state.inventory.some((i) => i.equipped && i.category === "armor");
  const mageArmorDisabled = wearingArmor || (!mageActive && level1Remaining <= 0) ? "disabled" : "";

  document.getElementById("combat-overview").innerHTML = `
    <article class="hp-card">
      <div class="hp-main">
        <label class="hp-value">
          <span class="mini-label">Current HP</span>
          <input type="number" value="${state.hp.current}" data-hp-field="current">
        </label>
        <span class="hp-divider">/</span>
        <label class="hp-value">
          <span class="mini-label">Max HP</span>
          <input type="number" value="${state.hp.max}" data-hp-field="max">
        </label>
      </div>
      <div class="temp-hp-box">
        <span class="mini-label">Temp HP</span>
        <input type="number" value="${state.hp.temp}" data-hp-field="temp">
      </div>
    </article>
    <article class="overview-card${mageActive ? " is-active" : ""}"
      data-tooltip="${escapeAttribute(wearingArmor
        ? "Mage Armor has no effect while wearing armor."
        : "Mage Armor: while not wearing armor, your AC becomes 13 + Dex modifier. Lasts 8 hours. Casting spends a 1st-level spell slot.")}">
      <span class="mini-label">Armor Class</span>
      <span class="overview-number">${ac.total}</span>
      <span class="overview-note">${ac.source}</span>
      <label class="toggle mage-armor-toggle">
        <input type="checkbox" data-mage-armor-toggle
          ${mageActive ? "checked" : ""}
          ${mageArmorDisabled}>
        Mage Armor
      </label>
    </article>
    <article class="overview-card">
      <span class="mini-label">Spell Attack</span>
      <span class="overview-number">${formatModifier(spellAttack)}</span>
    </article>
    <article class="overview-card">
      <span class="mini-label">Spell Save</span>
      <span class="overview-number">${spellSaveDc}</span>
    </article>
    <article class="overview-card">
      <span class="mini-label">Initiative</span>
      <span class="overview-number">${formatModifier(dexMod)}</span>
    </article>
    <article class="overview-card">
      <span class="mini-label">Speed</span>
      <span class="overview-number">${state.basics.speed}</span>
      <span class="overview-note">feet</span>
    </article>`;
}

function renderConditions() {
  const exLevel = state.combat.exhaustionLevel ?? 0;

  const cumulativeEffects = exLevel === 0
    ? `<span class="exhaustion-effect-none">None</span>`
    : Array.from({ length: exLevel }, (_, i) =>
        `<span class="exhaustion-effect-line">
          <span class="exhaustion-effect-lvl">Lv ${i + 1}</span>
          ${exhaustionEffects[i + 1]}
        </span>`
      ).join("");

  const exhaustionRow = `
    <article class="condition-row exhaustion-row">
      <div class="exhaustion-top">
        <span class="condition-name">Exhaustion</span>
        <div class="exhaustion-controls">
          <button class="exhaustion-btn" type="button" data-exhaustion-delta="-1" ${exLevel <= 0 ? "disabled" : ""} aria-label="Decrease exhaustion">−</button>
          <span class="exhaustion-level">${exLevel}</span>
          <button class="exhaustion-btn" type="button" data-exhaustion-delta="1" ${exLevel >= 6 ? "disabled" : ""} aria-label="Increase exhaustion">+</button>
        </div>
      </div>
      <div class="exhaustion-effects">${cumulativeEffects}</div>
    </article>`;

  const conditionRows = conditionDefinitions
    .map((condition) => {
      const active = Boolean(state.combat.conditions[condition.key]);
      return `
        <article class="condition-row" data-tooltip="${escapeAttribute(condition.description)}">
          <div>
            <span class="condition-name">${condition.label}</span>
            <span class="condition-state">${active ? "Active" : "Clear"}</span>
          </div>
          <label class="toggle">
            <input type="checkbox" ${active ? "checked" : ""}
              data-condition-toggle="${condition.key}">
            On
          </label>
        </article>`;
    })
    .join("");

  document.getElementById("conditions-grid").innerHTML = exhaustionRow + `<div class="conditions-divider"></div>` + conditionRows;
}

function renderActions() {
  const movementCards = actionReference.movement.map((item) =>
    `<article class="list-card action-ref-card"
      data-tooltip="${escapeAttribute(item.description)}">
      <span class="action-ref-name">${item.name}</span>
    </article>`
  ).join("");

  document.getElementById("movement-list").innerHTML = movementCards;

  renderActionRefList("actions-list",       actionReference.actions);
  renderActionRefList("bonus-actions-list", actionReference.bonusActions);
  renderActionRefList("reactions-list",     actionReference.reactions);
}

const ACTION_LINK_LABELS = { inventory: "Inventory", spells: "Spells", traits: "Traits" };

function renderActionRefList(elementId, items) {
  document.getElementById(elementId).innerHTML = items.map((item) => {
    const nav   = item.link ? ` data-navigate-tab="${item.link}"` : "";
    const badge = item.link
      ? `<span class="action-ref-link">${ACTION_LINK_LABELS[item.link]} ↗</span>`
      : "";
    return `
      <article class="list-card action-ref-card"
        data-tooltip="${escapeAttribute(item.description)}"${nav}>
        <span class="action-ref-name">${item.name}</span>
        ${badge}
      </article>`;
  }).join("");
}

// ---------------------------------------------------------------------------
// Spells tab
// ---------------------------------------------------------------------------

function renderSorceryPoints() {
  const el = document.getElementById("sorcery-points");
  if (!el) return;

  const current = state.combat.sorceryPointsCurrent;
  const max = state.basics.level;
  const secondFaceUsed = Boolean(state.combat.secondFaceUsed);
  const secondFaceRingActive = state.inventory.some(
    (item) => item.name === "Magical Silver Ring" && item.equipped && item.attuned
  );
  const secondFaceAvailable = secondFaceRingActive && !secondFaceUsed;
  const secondFaceRegain = Math.floor(state.basics.level / 2);
  const secondFacePotentialGain = Math.min(secondFaceRegain, Math.max(0, max - current));
  const track = Array.from({ length: max }, (_, i) => {
    const available = i < current;
    return `<span class="slot-mark ${available ? "is-used" : ""}" aria-hidden="true"></span>`;
  }).join("");

  el.innerHTML = `
    <article class="slot-card"
      data-tooltip="Sorcery Points fuel metamagic and Flexible Casting. ${current} of ${max} available.">
      <span class="slot-label">Current</span>
      <span class="slot-value">${current}</span>
      <div class="slot-track">${track}</div>
      <span class="slot-max">Max ${max}</span>
    </article>
    <article class="slot-card second-face-card"
      data-tooltip="${escapeAttribute(
        `Second Face (once per long rest).\\nRequires the Magical Silver Ring to be equipped and attuned.\\nRegain half your level in sorcery points: ${secondFaceRegain}.\\nCurrent use status: ${secondFaceUsed ? "Used" : (secondFaceRingActive ? "Available" : "Unavailable")}.\\nIf used now, SP gained: ${secondFacePotentialGain}.\\nDrawback: disadvantage on Insight checks.`
      )}">
      <div class="second-face-row">
        <span class="slot-label">Second Face</span>
        <span class="slot-max">${secondFaceUsed ? "Used" : (secondFaceRingActive ? "Available" : "Unavailable")}</span>
      </div>
      <div class="second-face-row">
        <span class="slot-value">${secondFaceRegain}</span>
        <span class="mini-label">SP on use</span>
      </div>
      <label class="toggle second-face-toggle">
        <input type="checkbox" data-second-face-toggle ${secondFaceUsed ? "checked" : ""} ${secondFaceAvailable ? "" : "disabled"}>
        Activate
      </label>
    </article>`;
}

function renderSpellSlots() {
  const slots = getAvailableSlots();
  const maxSlots = sorcererSpellSlots[20];

  document.getElementById("spell-slots").innerHTML = Array.from({ length: 9 }, (_, i) => i + 1)
    .map((level) => {
      const isActive = level in slots;

      if (isActive) {
        const max = slots[level];
        const used = state.spellSlotsUsed[level] ?? 0;
        const remaining = max - used;
        const spCurrent = state.combat.sorceryPointsCurrent;
        const spMax = state.basics.level;
        const flexCost = flexibleCastingCost[level] ?? null;

        const track = Array.from({ length: max }, (_, i) => {
          const isUsed = i < used;
          return `
          <button
            class="slot-mark ${isUsed ? "is-used" : ""}"
            type="button"
            aria-label="Level ${level} slot ${i + 1}: ${isUsed ? "used" : "available"}"
            aria-pressed="${isUsed}"
            data-slot-level="${level}"
            data-slot-index="${i}"
          ></button>`;
        }).join("");

        const slotToSPDisabled = remaining <= 0 || spCurrent >= spMax ? "disabled" : "";
        const spToSlotDisabled = !flexCost || used <= 0 || spCurrent < flexCost ? "disabled" : "";
        const spToSlotBtn = flexCost != null ? `
          <button class="casting-btn" type="button"
            data-sp-to-slot="${level}"
            ${spToSlotDisabled}
            aria-label="Spend ${flexCost} sorcery points to restore a level ${level} slot">
            ${flexCost}SP&nbsp;&#8594;&nbsp;Slot
          </button>` : "";

        return `
        <article class="slot-card"
          data-tooltip="${escapeAttribute(`Level ${level} slots. ${remaining} available, ${used} spent.`)}">
          <span class="slot-label">Level ${level}</span>
          <span class="slot-value">${remaining}</span>
          <div class="slot-track">${track}</div>
          <span class="slot-max">Max ${max}</span>
          <div class="slot-casting-controls">
            <button class="casting-btn" type="button"
              data-slot-to-sp="${level}"
              ${slotToSPDisabled}
              aria-label="Spend a level ${level} slot, gain ${level} sorcery points">
              Slot&nbsp;&#8594;&nbsp;${level}SP
            </button>
            ${spToSlotBtn}
          </div>
        </article>`;
      } else {
        const inactiveMax = maxSlots[level] ?? 0;
        const track = Array.from({ length: inactiveMax }, (_, i) =>
          `<span class="slot-mark is-inactive" aria-hidden="true"></span>`
        ).join("");

        return `
        <article class="slot-card is-inactive"
          aria-disabled="true">
          <span class="slot-label">Level ${level}</span>
          <span class="slot-value">—</span>
          <div class="slot-track">${track}</div>
          <span class="slot-max">Max ${inactiveMax}</span>
        </article>`;
      }
    })
    .join("");
}

function renderSpells() {
  const grouped = groupSpellsByLevel();
  const orderedLevels = Object.keys(grouped).map(Number).sort((a, b) => a - b);
  const spellAttackMod = formatModifier(getProficiencyBonus() + getAbilityModifier(state.abilities.cha));
  const slots = getAvailableSlots();
  const spCurrent = state.combat.sorceryPointsCurrent;
  const spMax = state.basics.level;

  document.getElementById("known-spells").innerHTML = orderedLevels
    .map((level) => {
      const label = level === 0 ? "Cantrips" : `Level ${level}`;

      // Inline slot tracker for levels that have active slots
      let slotHtml = "";
      if (level > 0 && level in slots) {
        const max = slots[level];
        const used = state.spellSlotsUsed[level] ?? 0;
        const remaining = max - used;
        const flexCost = flexibleCastingCost[level] ?? null;

        const pips = Array.from({ length: max }, (_, i) => {
          const isUsed = i < used;
          return `<button
              class="slot-mark ${isUsed ? "is-used" : ""}"
              type="button"
              aria-label="Level ${level} slot ${i + 1}: ${isUsed ? "used" : "available"}"
              aria-pressed="${isUsed}"
              data-slot-level="${level}"
              data-slot-index="${i}"
            ></button>`;
        }).join("");

        const slotToSPDisabled = remaining <= 0 || spCurrent >= spMax ? "disabled" : "";
        const spToSlotDisabled = !flexCost || used <= 0 || spCurrent < flexCost ? "disabled" : "";
        const spToSlotBtn = flexCost != null ? `<button class="casting-btn" type="button" data-sp-to-slot="${level}" ${spToSlotDisabled}>${flexCost}SP&#8594;Slot</button>` : "";

        slotHtml = `
          <div class="spell-slot-inline">
            <div class="spell-slot-pips">${pips}</div>
            <span class="spell-slot-count">${remaining}/${max}</span>
            <div class="spell-slot-btns">
              <button class="casting-btn" type="button" data-slot-to-sp="${level}" ${slotToSPDisabled}>Slot&#8594;${level}SP</button>
              ${spToSlotBtn}
            </div>
          </div>`;
      }

      const cards = grouped[level]
        .map((spell) => {
          const tooltip = [
            spell.description,
            `Casting time: ${spell.castingTime}.`,
            `Range: ${spell.range}.`,
            `Duration: ${spell.duration}.`,
          ].join(" ");

          const castLower = spell.castingTime.toLowerCase();
          const actionLabel = castLower.includes("bonus action") ? "Bonus Action"
                            : castLower.includes("reaction")     ? "Reaction"
                            : "Action";

          const pills = [];
          pills.push(`<span class="spell-stat-pill spell-stat-pill--timing"><span class="spell-stat-key">${actionLabel}</span></span>`);
          if (spell.concentration) pills.push(`<span class="spell-stat-pill spell-stat-pill--timing"><span class="spell-stat-key">Conc.</span></span>`);
          if (spell.ritual)        pills.push(`<span class="spell-stat-pill spell-stat-pill--timing"><span class="spell-stat-key">Ritual</span></span>`);
          if (spell.attackRoll) {
            pills.push(`<span class="spell-stat-pill"><span class="spell-stat-key">Attack</span>${spellAttackMod}</span>`);
            pills.push(`<span class="spell-stat-pill"><span class="spell-stat-key">Range</span>${spell.range}</span>`);
          }
          if (spell.saveType)   pills.push(`<span class="spell-stat-pill"><span class="spell-stat-key">Save</span>${spell.saveType}</span>`);
          if (spell.damageDie)  pills.push(`<span class="spell-stat-pill"><span class="spell-stat-key">Dmg</span>${spell.damageDie}${spell.damageType ? ` ${spell.damageType}` : ""}</span>`);
          if (spell.conditions) pills.push(`<span class="spell-stat-pill"><span class="spell-stat-key">Effect</span>${spell.conditions}</span>`);

          const pillRow = `<div class="spell-stat-row">${pills.join("")}</div>`;

          return `
            <article class="spell-card" data-tooltip="${escapeAttribute(tooltip)}">
              <div class="spell-card-top">
                <span class="spell-name">${spell.name}</span>
                <span class="spell-school-tag">${spell.school}</span>
              </div>
              ${pillRow}
            </article>`;
        })
        .join("");

      // Upcast options: lower-level spells that scale when cast with this slot
      let upcastHtml = "";
      if (level > 1) {
        const upcastable = state.spells.filter(
          (spell) => spell.level > 0 && spell.level < level && spell.upcast
        );
        if (upcastable.length > 0) {
          const upcastCards = upcastable.map((spell) => {
            const levelsAbove = level - spell.level;
            const n = spell.upcast.baseCount + levelsAbove * spell.upcast.perLevel;
            const scaledLabel = spell.upcast.scaledLabel.replace("{n}", n);
            const castLower = spell.castingTime.toLowerCase();
            const actionLabel = castLower.includes("bonus action") ? "Bonus Action"
                              : castLower.includes("reaction")     ? "Reaction"
                              : "Action";
            return `
              <article class="spell-card spell-card--upcast"
                data-tooltip="${escapeAttribute(`${spell.name} cast at level ${level}. ${spell.description} Upcast: ${spell.upcast.note}.`)}">
                <div class="spell-card-top">
                  <span class="spell-name">${spell.name}</span>
                  <span class="spell-upcast-badge">↑ lvl ${level}</span>
                </div>
                <div class="spell-stat-row">
                  <span class="spell-stat-pill spell-stat-pill--timing"><span class="spell-stat-key">${actionLabel}</span></span>
                  <span class="spell-stat-pill spell-stat-pill--upcast"><span class="spell-stat-key">Dmg</span>${scaledLabel}</span>
                </div>
              </article>`;
          }).join("");
          upcastHtml = `
            <div class="upcast-subsection">
              <span class="upcast-subsection-label">Upcast from lower levels</span>
              <div class="spell-cards-grid">${upcastCards}</div>
            </div>`;
        }
      }

      return `
        <div class="inventory-group">
          <span class="inventory-group-label">${label}</span>
          ${slotHtml}
          <div class="spell-cards-grid">${cards}</div>
          ${upcastHtml}
        </div>`;
    })
    .join("");
}

function renderMetamagic() {
  const el = document.getElementById("metamagic-list");
  if (!el) return;

  const spCurrent = state.combat.sorceryPointsCurrent;

  el.innerHTML = (state.metamagic ?? []).map((option) => {
    const canAfford = spCurrent >= option.cost;
    const pips = Array.from({ length: option.cost }, () =>
      `<button class="slot-mark is-used" type="button"
        data-metamagic-use="${option.id}"
        ${canAfford ? "" : "disabled"}
        aria-label="Use ${escapeAttribute(option.name)} (costs ${option.cost} SP)"></button>`
    ).join("");
    const costLabel = option.costNote ? `${option.cost} SP (${option.costNote})` : `${option.cost} SP`;
    const tooltip = escapeAttribute(
      `${option.description} Requirement: ${option.requirement}`
    );
    return `
      <article class="metamagic-card" data-tooltip="${tooltip}">
        <span class="metamagic-name">${option.name}</span>
        <div class="metamagic-cost">
          <span class="mini-label">${costLabel}</span>
          <div class="slot-track">${pips}</div>
        </div>
      </article>`;
  }).join("");
}

function renderWildMagic() {
  const toggle = document.getElementById("wild-magic-table-toggle");
  if (toggle) toggle.checked = Boolean(state.combat.wildMagicTableUsed);

  document.getElementById("wild-magic-list").innerHTML = state.wildMagicTable
    .map((entry) => {
      const tooltip = `Level ${entry.level}. ${entry.description}`;
      return `
        <article class="list-card wild-magic-row"
          data-tooltip="${escapeAttribute(tooltip)}">
          <span class="wild-magic-name">${entry.name}</span>
        </article>`;
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Coins tracker
// ---------------------------------------------------------------------------

function renderCoins() {
  const el = document.getElementById("coins-tracker");
  if (!el) return;

  const coins = state.coins ?? { copper: 0, silver: 0, gold: 0 };
  const types = [
    { key: "copper", label: "Copper" },
    { key: "silver", label: "Silver" },
    { key: "gold",   label: "Gold"   },
  ];

  el.innerHTML = types.map(({ key, label }) => {
    const amount = coins[key] ?? 0;
    return `
      <article class="coin-card coin-${key}">
        <span class="coin-label">${label}</span>
        <div class="coin-controls">
          <button class="coin-btn" type="button"
            data-coin-adjust="${key}" data-coin-delta="-1"
            aria-label="Remove 1 ${label} piece">−</button>
          <input class="coin-input" type="number" min="0" max="9999999"
            value="${amount}"
            data-coin-field="${key}"
            aria-label="${label} pieces">
          <button class="coin-btn" type="button"
            data-coin-adjust="${key}" data-coin-delta="1"
            aria-label="Add 1 ${label} piece">+</button>
        </div>
      </article>`;
  }).join("");
}

// ---------------------------------------------------------------------------
// Inventory tab
// ---------------------------------------------------------------------------

function renderAttunement() {
  const el = document.getElementById("attunement-tracker");
  if (!el) return;

  const attunedItems = state.inventory.filter((item) => item.requiresAttunement && item.attuned);

  el.innerHTML = Array.from({ length: 3 }, (_, i) => {
    const item = attunedItems[i] ?? null;
    return `
      <div class="attunement-slot${item ? " is-filled" : ""}"
        data-tooltip="${item ? `Attuned: ${escapeAttribute(item.name)}` : "Empty attunement slot"}">
        <span class="attunement-slot-label">Slot ${i + 1}</span>
        <span class="attunement-slot-name">${item ? item.name : "—"}</span>
      </div>`;
  }).join("");
}

function renderInventory() {
  const categories = [
    { key: "weapon", label: "Weapons" },
    { key: "armor",  label: "Armor" },
    { key: "shield", label: "Shields" },
    { key: "gear",   label: "Gear" },
    { key: "magic",  label: "Magic Items" },
  ];

  const grouped = Object.fromEntries(categories.map((c) => [c.key, []]));
  for (const item of state.inventory) {
    if (item.category in grouped) grouped[item.category].push(item);
    else grouped["gear"].push(item);
  }

  document.getElementById("inventory-list").innerHTML = categories
    .filter((c) => grouped[c.key].length > 0)
    .map((c) => {
      const rows = grouped[c.key].map((item) => renderInventoryCard(item)).join("");
      return `
        <div class="inventory-group">
          <span class="inventory-group-label">${c.label}</span>
          ${rows}
        </div>`;
    })
    .join("");
}

function renderInventoryCard(item) {
  // Build extra stat chips depending on category
  let statsHtml = "";
  if (item.category === "weapon") {
    const chips = [];
    if (item.attackBonus != null) chips.push(`${formatModifier(item.attackBonus)} to hit`);
    if (item.damage)              chips.push(item.damage);
    if (chips.length) {
      statsHtml = `<div class="inventory-stats">${chips.map((c) => `<span class="stat-chip">${c}</span>`).join("")}</div>`;
    }
  } else if (item.category === "armor" || item.category === "shield") {
    const chips = [];
    if (item.armorBase != null) chips.push(`Base AC ${item.armorBase}`);
    if (item.acBonus)           chips.push(`+${item.acBonus} AC`);
    if (item.dexCap != null)    chips.push(`Dex cap ${item.dexCap}`);
    if (chips.length) {
      statsHtml = `<div class="inventory-stats">${chips.map((c) => `<span class="stat-chip">${c}</span>`).join("")}</div>`;
    }
  }

  // Tags row: attunement + gold cost
  const tags = [];
  if (item.requiresAttunement) tags.push(item.attuned ? "Attuned" : "Needs attunement");
  if (item.goldCost > 0) tags.push(`${item.goldCost} gp`);

  const tooltip = [
    item.name,
    item.description,
    item.attackBonus != null ? `Attack: ${formatModifier(item.attackBonus)} to hit.` : "",
    item.damage ? `Damage: ${item.damage}.` : "",
    item.armorBase != null ? `Base AC: ${item.armorBase}.` : "",
    item.acBonus ? `AC bonus: +${item.acBonus}.` : "",
    item.dexCap != null ? `Dex cap: ${item.dexCap}.` : "",
  ].filter(Boolean).join("\\n");

  return `
    <article class="inventory-row" data-tooltip="${escapeAttribute(tooltip)}">
      <div class="inventory-main">
        <div>
          <span class="inventory-name">${item.name}</span>
          ${tags.length ? `<div class="inventory-tags">${tags.map((t) => `<span>${t}</span>`).join("")}</div>` : ""}
          ${statsHtml}
        </div>
      </div>
      <div class="inventory-controls">
        <label class="toggle">
          <input type="checkbox" ${item.equipped ? "checked" : ""}
            data-inventory-toggle="equipped" data-id="${item.id}">
          Equipped
        </label>
        <label class="toggle">
          <input type="checkbox" ${item.attuned ? "checked" : ""}
            ${item.requiresAttunement ? "" : "disabled"}
            data-inventory-toggle="attuned" data-id="${item.id}">
          Attuned
        </label>
      </div>
      <div class="list-actions">
        <button class="mini-button" type="button"
          data-edit-list="inventory" data-id="${item.id}">Edit</button>
        <button class="mini-button danger" type="button"
          data-delete-list="inventory" data-id="${item.id}">Remove</button>
      </div>
    </article>`;
}

// ---------------------------------------------------------------------------
// Traits tab
// ---------------------------------------------------------------------------

function renderTraits() {
  const categories = [
    { key: "racial",      label: "Racial Traits" },
    { key: "class",       label: "Class Traits" },
    { key: "feat",        label: "Feats" },
    { key: "background",  label: "Background" },
    { key: "lycanthropy", label: "Lycantropy" },
  ];

  const grouped = Object.fromEntries(categories.map((c) => [c.key, []]));
  const other = [];
  for (const trait of state.traits) {
    if (trait.category in grouped) grouped[trait.category].push(trait);
    else other.push(trait);
  }
  if (other.length) {
    categories.push({ key: "__other", label: "Other" });
    grouped["__other"] = other;
  }

  const traitSections = categories
    .filter((c) => grouped[c.key].length > 0)
    .map((c) => {
      const cards = grouped[c.key].map((trait) => {
        const navAttr  = trait.link ? ` data-navigate-tab="${trait.link}"` : "";
        const navBadge = trait.link
          ? `<span class="action-ref-link">${capitalize(trait.link)} ↗</span>`
          : "";
        return `
          <article class="list-card${trait.link ? " action-ref-card" : ""}"
            data-tooltip="${escapeAttribute(trait.description)}"${navAttr}>
            <div class="list-card-header">
              <div>
                <span class="trait-chip">${trait.name}</span>
              </div>
              ${navBadge ? `<div class="list-actions">${navBadge}</div>` : ""}
            </div>
          </article>`;
      }).join("");

      return `
        <div class="inventory-group">
          <span class="inventory-group-label">${c.label}</span>
          <div class="card-stack two-column">${cards}</div>
        </div>`;
    })
    .join("");

  const magicItems = state.inventory.filter((item) => item.category === "magic");
  const magicItemsSection = magicItems.length
    ? `
      <div class="inventory-group">
        <span class="inventory-group-label">Magical Items</span>
        <div class="card-stack two-column">
          ${magicItems.map((item) => `
            <article class="list-card action-ref-card"
              data-navigate-tab="inventory"
              data-tooltip="${escapeAttribute(item.description)}">
              <div class="list-card-header">
                <span class="trait-chip">${item.name}</span>
                <div class="list-actions"><span class="action-ref-link">Inventory ↗</span></div>
              </div>
            </article>
          `).join("")}
        </div>
      </div>`
    : "";

  document.getElementById("traits-list").innerHTML = traitSections + magicItemsSection;
}
