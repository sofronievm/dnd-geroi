// Game mechanics: ability math, AC, spell slots, sorcery points, long rest.
// All functions read from the shared `state` live binding (never reassign it).

import { state } from "./state.js";
import { sorcererSpellSlots, skillDefinitions, conditionDefinitions, flexibleCastingCost } from "./constants.js";
import { clampNumber, formatModifier } from "./utils.js";

// ---------------------------------------------------------------------------
// Ability scores
// ---------------------------------------------------------------------------

export function getAbilityModifier(score) {
  return Math.floor((Number(score) - 10) / 2);
}

export function getProficiencyBonus() {
  return 2 + Math.floor((state.basics.level - 1) / 4);
}

export function getSkillBonus(skillKey) {
  const skill = skillDefinitions.find((s) => s.key === skillKey);
  if (!skill) return 0;
  return (
    getAbilityModifier(state.abilities[skill.ability]) +
    (state.skills[skillKey].proficient ? getProficiencyBonus() : 0)
  );
}

// ---------------------------------------------------------------------------
// Armor class
// ---------------------------------------------------------------------------

export function getArmorClass() {
  const dexMod = getAbilityModifier(state.abilities.dex);
  const equippedArmor = state.inventory.find((i) => i.equipped && i.category === "armor");

  const equippedBonuses = state.inventory.reduce((total, item) => {
    if (!item.equipped || item.category === "armor") return total;
    if (item.requiresAttunement && !item.attuned) return total;
    return total + (Number(item.acBonus) || 0);
  }, 0);

  if (equippedArmor) {
    const cap = equippedArmor.dexCap;
    const dexContribution = cap == null || Number.isNaN(cap) ? dexMod : Math.min(dexMod, cap);
    return {
      total: (Number(equippedArmor.armorBase) || 10) + dexContribution + equippedBonuses,
      source: `${equippedArmor.name}${equippedBonuses ? " + bonuses" : ""}`,
    };
  }

  if (state.combat.mageArmorActive) {
    return {
      total: 13 + dexMod + equippedBonuses,
      source: `Mage Armor${equippedBonuses ? " + bonuses" : ""}`,
    };
  }

  return {
    total: 10 + dexMod + equippedBonuses,
    source: `Unarmored${equippedBonuses ? " + bonuses" : ""}`,
  };
}

// ---------------------------------------------------------------------------
// Spell slots
// ---------------------------------------------------------------------------

export function getAvailableSlots() {
  return sorcererSpellSlots[state.basics.level] || {};
}

export function adjustSpellSlot(level, delta) {
  const max = getAvailableSlots()[level] ?? 0;
  state.spellSlotsUsed[level] = clampNumber(state.spellSlotsUsed[level] - delta, 0, max, 0);
}

export function setSpellSlotUsage(level, slotIndex) {
  const max = getAvailableSlots()[level] ?? 0;
  if (!max) return;
  const current = state.spellSlotsUsed[level] ?? 0;
  state.spellSlotsUsed[level] = slotIndex < current ? slotIndex : slotIndex + 1;
}

// ---------------------------------------------------------------------------
// Sorcery points
// ---------------------------------------------------------------------------

export function setSorceryPoints(pointIndex) {
  const current = state.combat.sorceryPointsCurrent;
  state.combat.sorceryPointsCurrent = pointIndex < current ? pointIndex : pointIndex + 1;
}

// Mage Armor: toggling on spends a 1st-level spell slot.
export function toggleMageArmor(enable) {
  if (enable) {
    const wearingArmor = state.inventory.some((i) => i.equipped && i.category === "armor");
    if (wearingArmor) return;
    const available = (getAvailableSlots()[1] ?? 0) - (state.spellSlotsUsed[1] ?? 0);
    if (available <= 0) return;
    state.spellSlotsUsed[1] = (state.spellSlotsUsed[1] ?? 0) + 1;
    state.combat.mageArmorActive = true;
  } else {
    state.combat.mageArmorActive = false;
  }
}

// Flexible Casting: expend 1 slot of the given level, gain SP equal to its level.
export function slotToSP(level) {
  const max = getAvailableSlots()[level] ?? 0;
  const used = state.spellSlotsUsed[level] ?? 0;
  if (max - used <= 0) return;
  const spMax = state.basics.level;
  if (state.combat.sorceryPointsCurrent >= spMax) return;
  state.spellSlotsUsed[level] = used + 1;
  state.combat.sorceryPointsCurrent = Math.min(state.combat.sorceryPointsCurrent + level, spMax);
}

// Flexible Casting: spend SP to restore 1 used slot of the given level.
export function spToSlot(level) {
  const cost = flexibleCastingCost[level];
  if (cost == null) return;
  if (state.combat.sorceryPointsCurrent < cost) return;
  const used = state.spellSlotsUsed[level] ?? 0;
  if (used <= 0) return;
  state.combat.sorceryPointsCurrent -= cost;
  state.spellSlotsUsed[level] = used - 1;
}

// Metamagic: spend the SP cost of the given option.
export function useMetamagic(optionId) {
  const option = state.metamagic?.find((o) => o.id === optionId);
  if (!option) return;
  if (state.combat.sorceryPointsCurrent < option.cost) return;
  state.combat.sorceryPointsCurrent -= option.cost;
}

// Second Face (Magical Silver Ring): once per long rest, regain half level SP (rounded down).
export function useSecondFace() {
  if (state.combat.secondFaceUsed) return;
  const ringActive = state.inventory.some(
    (item) => item.name === "Magical Silver Ring" && item.equipped && item.attuned
  );
  if (!ringActive) return;
  const regain = Math.floor(state.basics.level / 2);
  const spMax = state.basics.level;
  state.combat.sorceryPointsCurrent = Math.min(spMax, state.combat.sorceryPointsCurrent + regain);
  state.combat.secondFaceUsed = true;
}

// ---------------------------------------------------------------------------
// Dynamic text resolution (replaces template strings in action descriptions)
// ---------------------------------------------------------------------------

export function resolveDynamicText(text) {
  const spellAttack  = formatModifier(getProficiencyBonus() + getAbilityModifier(state.abilities.cha));
  const weaponAttack = formatModifier(getProficiencyBonus() + getAbilityModifier(state.abilities.dex));
  const weaponDamage = formatModifier(getAbilityModifier(state.abilities.dex));

  return String(text)
    .replaceAll("proficiency + Charisma", spellAttack)
    .replaceAll("proficiency + Dexterity", weaponAttack)
    .replaceAll(
      "+ Dexterity",
      weaponDamage.startsWith("-") ? weaponDamage : `+ ${weaponDamage.replace("+", "")}`
    );
}

// ---------------------------------------------------------------------------
// Short rest & Long rest
// ---------------------------------------------------------------------------

/**
 * Called after the short-rest dialog confirms how many Hit Dice were spent.
 * diceSpent and hpGained are already validated by the dialog.
 */
export function applyShortRest(diceSpent, hpGained) {
  state.hitDice ??= { used: 0 };
  state.hitDice.used = Math.min(state.hitDice.used + diceSpent, state.basics.level);
  state.hp.current = Math.min(state.hp.current + hpGained, state.hp.max);
}

export function applyLongRest() {
  state.hp.current = state.hp.max;
  state.hp.temp = 0;
  state.combat.sorceryPointsCurrent = state.basics.level;
  state.combat.wildMagicTableUsed = false;
  state.combat.secondFaceUsed = false;
  state.combat.mageArmorActive = false;
  state.hitDice ??= { used: 0 };
  state.hitDice.used = 0; // All Hit Dice are restored on a Long Rest (PHB 2024).

  for (const level of Object.keys(state.spellSlotsUsed)) {
    state.spellSlotsUsed[level] = 0;
  }

  state.wildMagicTable ??= [];
  state.wildMagicTable.forEach((entry) => {
    entry.used = false;
  });
}

// ---------------------------------------------------------------------------
// State normalization — clamps all values into valid ranges.
// Called after every state mutation before saving/rendering.
// ---------------------------------------------------------------------------

export function normalizeState() {
  state.basics.level = clampNumber(state.basics.level, 1, 20, 4);
  state.basics.speed = clampNumber(state.basics.speed, 0, 120, 30);

  for (const key of Object.keys(state.abilities)) {
    state.abilities[key] = clampNumber(state.abilities[key], 1, 30, 10);
  }

  state.hp.max     = clampNumber(state.hp.max, 1, 999, 1);
  state.hp.current = clampNumber(state.hp.current, 0, 999, state.hp.max);
  state.hp.temp    = clampNumber(state.hp.temp, 0, 999, 0);

  state.hitDice ??= { used: 0 };
  state.hitDice.used = clampNumber(state.hitDice.used, 0, state.basics.level, 0);

  state.inspiration = Boolean(state.inspiration ?? false);

  state.savingThrows ??= {
    str: { proficient: false },
    dex: { proficient: false },
    con: { proficient: true  },
    int: { proficient: false },
    wis: { proficient: false },
    cha: { proficient: true  },
  };
  for (const key of ["str", "dex", "con", "int", "wis", "cha"]) {
    state.savingThrows[key] ??= { proficient: false };
    state.savingThrows[key].proficient = Boolean(state.savingThrows[key].proficient);
  }

  state.combat.sorceryPointsCurrent = clampNumber(
    state.combat.sorceryPointsCurrent,
    0,
    state.basics.level,
    state.basics.level
  );
  state.combat.wildMagicTableUsed = Boolean(state.combat.wildMagicTableUsed);
  state.combat.secondFaceUsed = Boolean(state.combat.secondFaceUsed);
  state.combat.conditions ??= {};
  conditionDefinitions.forEach((c) => {
    state.combat.conditions[c.key] = Boolean(state.combat.conditions[c.key]);
  });

  state.wildMagicTable ??= [];
  state.wildMagicTable = state.wildMagicTable.map((entry) => ({
    ...entry,
    level: clampNumber(entry.level, 0, 9, 0),
    used: Boolean(entry.used),
  }));

  const availableSlots = getAvailableSlots();
  for (let level = 1; level <= 9; level++) {
    const max = availableSlots[level] ?? 0;
    state.spellSlotsUsed[level] = clampNumber(state.spellSlotsUsed[level], 0, max, 0);
  }

  state.inventory = state.inventory.map((item) => ({
    ...item,
    acBonus:     Number(item.acBonus) || 0,
    armorBase:   item.armorBase == null || item.armorBase === "" ? null : Number(item.armorBase),
    dexCap:      item.dexCap == null || item.dexCap === "" ? null : Number(item.dexCap),
    attackBonus: item.attackBonus == null || item.attackBonus === "" ? null : Number(item.attackBonus),
    damage:      item.damage || null,
    goldCost:    Number(item.goldCost) || 0,
  }));

  state.traits = state.traits.map((t) => ({
    ...t,
    category: t.category || "other",
    link:     t.link ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

export function groupSpellsByLevel() {
  return state.spells.reduce((groups, spell) => {
    const level = Number(spell.level);
    groups[level] ??= [];
    groups[level].push(spell);
    return groups;
  }, {});
}
