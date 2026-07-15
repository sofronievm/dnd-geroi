// Event handling: all DOM event listeners and the saveAndRender coordinator.

import { state, saveState } from "./state.js";
import {
  normalizeState,
  applyLongRest,
  applyShortRest,
  adjustSpellSlot,
  setSpellSlotUsage,
  toggleMageArmor,
  slotToSP,
  spToSlot,
  useMetamagic,
  useSecondFace,
} from "./mechanics.js";
import { renderAll } from "./render.js";
import { addListItem, editListItem, deleteListItem, showShortRestDialog, showLongRestDialog } from "./prompts.js";
import { clampNumber, coerceInputValue, findById } from "./utils.js";
import { saveToFirestore } from "./firebase.js";

// ---------------------------------------------------------------------------
// Coordinator
// ---------------------------------------------------------------------------

export function saveAndRender() {
  normalizeState();
  saveState();
  saveToFirestore(state); // async fire-and-forget
  renderAll();
}

// ---------------------------------------------------------------------------
// Binding
// ---------------------------------------------------------------------------

export function bindEvents() {
  document.querySelector(".tab-bar").addEventListener("click", handleTabClick);
  document.body.addEventListener("change", handleChange);
  document.body.addEventListener("click", handleClick);
  document.body.addEventListener("mouseover", handleTooltipShow);
  document.body.addEventListener("mouseout", handleTooltipHide);
  document.body.addEventListener("mousemove", moveTooltip);
}

// ---------------------------------------------------------------------------
// Tab
// ---------------------------------------------------------------------------

function handleTabClick(event) {
  const button = event.target.closest("[data-tab]");
  if (!button) return;
  state.activeTab = button.dataset.tab;
  saveAndRender();
}

// ---------------------------------------------------------------------------
// Change events (inputs, checkboxes, selects)
// ---------------------------------------------------------------------------

function handleChange(event) {
  const target = event.target;

  if (target.matches("[data-basic-field]")) {
    state.basics[target.dataset.basicField] = coerceInputValue(target);
    normalizeState();
    saveAndRender();
    return;
  }

  if (target.matches("[data-ability-field]")) {
    state.abilities[target.dataset.abilityField] = clampNumber(target.value, 1, 30, 10);
    normalizeState();
    saveAndRender();
    return;
  }

  if (target.matches("[data-skill-toggle]")) {
    state.skills[target.dataset.skillToggle].proficient = target.checked;
    saveAndRender();
    return;
  }

  if (target.matches("[data-save-toggle]")) {
    state.savingThrows[target.dataset.saveToggle].proficient = target.checked;
    saveAndRender();
    return;
  }

  if (target.matches("[data-inspiration-toggle]")) {
    state.inspiration = target.checked;
    saveAndRender();
    return;
  }

  if (target.matches("[data-hp-field]")) {
    state.hp[target.dataset.hpField] = clampNumber(target.value, 0, 999, 0);
    normalizeState();
    saveAndRender();
    return;
  }

  if (target.matches("[data-mage-armor-toggle]")) {
    toggleMageArmor(target.checked);
    saveAndRender();
    return;
  }

  if (target.matches("[data-combat-toggle]")) {
    state.combat[target.dataset.combatToggle] = target.checked;
    saveAndRender();
    return;
  }

  if (target.matches("[data-condition-toggle]")) {
    state.combat.conditions[target.dataset.conditionToggle] = target.checked;
    saveAndRender();
    return;
  }

  if (target.matches("[data-combat-field]")) {
    state.combat[target.dataset.combatField] = clampNumber(target.value, 0, state.basics.level, state.basics.level);
    saveAndRender();
    return;
  }

  if (target.matches("[data-second-face-toggle]")) {
    if (target.checked) useSecondFace();
    saveAndRender();
    return;
  }

  if (target.matches("[data-inventory-toggle]")) {
    const item = findById(state.inventory, target.dataset.id);
    if (!item) return;
    const field = target.dataset.inventoryToggle;
    if (field === "attuned" && target.checked) {
      const attuned = state.inventory.filter((i) => i.requiresAttunement && i.attuned).length;
      if (attuned >= 3) {
        target.checked = false;
        return;
      }
    }
    item[field] = target.checked;
    saveAndRender();
    return;
  }

  if (target.matches("[data-coin-field]")) {
    if (!state.coins) state.coins = { copper: 0, silver: 0, gold: 0 };
    state.coins[target.dataset.coinField] = clampNumber(target.value, 0, 9999999, 0);
    saveAndRender();
    return;
  }
}

// ---------------------------------------------------------------------------
// Click events (buttons)
// ---------------------------------------------------------------------------

async function handleClick(event) {
  const target = event.target;

  // Short rest
  if (target.closest("#short-rest-button")) {
    await showShortRestDialog();
    return;
  }

  // Long rest
  if (target.closest("#long-rest-button")) {
    const confirmed = await showLongRestDialog();
    if (confirmed) {
      applyLongRest();
      saveAndRender();
    }
    return;
  }

  // Action reference card — navigate to linked tab
  const navCard = target.closest("[data-navigate-tab]");
  if (navCard) {
    state.activeTab = navCard.dataset.navigateTab;
    saveAndRender();
    return;
  }

  // Spell slot pip toggle
  const slotMark = target.closest("[data-slot-index]");
  if (slotMark) {
    setSpellSlotUsage(Number(slotMark.dataset.slotLevel), Number(slotMark.dataset.slotIndex));
    saveAndRender();
    return;
  }

  // Spell slot ± button
  const slotAdjust = target.closest("[data-slot-adjust]");
  if (slotAdjust) {
    adjustSpellSlot(Number(slotAdjust.dataset.slotLevel), Number(slotAdjust.dataset.slotAdjust));
    saveAndRender();
    return;
  }

  // Flexible Casting: slot → SP
  const slotToSPBtn = target.closest("[data-slot-to-sp]");
  if (slotToSPBtn) {
    slotToSP(Number(slotToSPBtn.dataset.slotToSp));
    saveAndRender();
    return;
  }

  // Flexible Casting: SP → slot
  const spToSlotBtn = target.closest("[data-sp-to-slot]");
  if (spToSlotBtn) {
    spToSlot(Number(spToSlotBtn.dataset.spToSlot));
    saveAndRender();
    return;
  }

  // Metamagic use
  const metamagicBtn = target.closest("[data-metamagic-use]");
  if (metamagicBtn) {
    useMetamagic(metamagicBtn.dataset.metamagicUse);
    saveAndRender();
    return;
  }

  // Exhaustion level ± buttons
  const exhaustionBtn = target.closest("[data-exhaustion-delta]");
  if (exhaustionBtn) {
    const delta = Number(exhaustionBtn.dataset.exhaustionDelta);
    state.combat.exhaustionLevel = Math.min(6, Math.max(0, (state.combat.exhaustionLevel ?? 0) + delta));
    saveAndRender();
    return;
  }

  // Coin +/- buttons
  const coinBtn = target.closest("[data-coin-adjust]");
  if (coinBtn) {
    if (!state.coins) state.coins = { copper: 0, silver: 0, gold: 0 };
    const key = coinBtn.dataset.coinAdjust;
    const delta = Number(coinBtn.dataset.coinDelta);
    state.coins[key] = Math.max(0, (state.coins[key] ?? 0) + delta);
    saveAndRender();
    return;
  }

  // Wild magic per-entry toggle (if used in future layouts)
  const wildToggle = target.closest("[data-wild-toggle]");
  if (wildToggle) {
    const entry = findById(state.wildMagicTable, wildToggle.dataset.id);
    if (!entry) return;
    entry.used = !entry.used;
    saveAndRender();
    return;
  }

  // List item CRUD
  const editButton = target.closest("[data-edit-list]");
  if (editButton) {
    await editListItem(editButton.dataset.editList, editButton.dataset.id);
    saveAndRender();
    return;
  }

  const deleteButton = target.closest("[data-delete-list]");
  if (deleteButton) {
    deleteListItem(deleteButton.dataset.deleteList, deleteButton.dataset.id);
    saveAndRender();
    return;
  }

  const addButton = target.closest("[data-list-add]");
  if (addButton) {
    await addListItem(addButton.dataset.listAdd);
    saveAndRender();
  }
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

function handleTooltipShow(event) {
  const tooltipTarget = event.target.closest("[data-tooltip]");
  if (!tooltipTarget) return;

  const tooltip = document.getElementById("tooltip");
  tooltip.textContent = (tooltipTarget.dataset.tooltip ?? "").replaceAll("\\n", "\n");
  tooltip.classList.add("is-visible");
  moveTooltip(event, tooltipTarget);
}

function handleTooltipHide(event) {
  const from = event.target.closest("[data-tooltip]");
  if (!from) return;

  const related = event.relatedTarget;
  if (related?.closest?.("[data-tooltip]") === from) return;

  document.getElementById("tooltip").classList.remove("is-visible");
}

function moveTooltip(event, explicitTarget = null) {
  const tooltip = document.getElementById("tooltip");
  if (!tooltip.classList.contains("is-visible")) return;

  const target = explicitTarget || event.target.closest?.("[data-tooltip]");
  const rect = target?.getBoundingClientRect?.();
  const x = event.clientX > 0 ? event.clientX : (rect ? rect.left + rect.width / 2 : 24);
  const y = event.clientY > 0 ? event.clientY : (rect ? rect.top + rect.height / 2 : 24);
  const offset = 16;

  tooltip.style.left = `${Math.min(x + offset, window.innerWidth  - tooltip.offsetWidth  - 12)}px`;
  tooltip.style.top  = `${Math.min(y + offset, window.innerHeight - tooltip.offsetHeight - 12)}px`;
}
