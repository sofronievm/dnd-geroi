// Persistence layer: localStorage save/load, JSON seed fetching, deep merge.
//
// `state` and `defaultState` are ES module live bindings. Importing modules
// can read them freely. Only functions in this file reassign them.

import { STORAGE_KEY, DATA_FILES, baseState } from "./constants.js";

// ---------------------------------------------------------------------------
// Shared mutable app state — read freely, never reassign from outside modules.
// ---------------------------------------------------------------------------
export let state = null;
export let defaultState = null;

export function initApp(builtDefault, loadedState) {
  defaultState = builtDefault;
  state = loadedState;
}

// Called by window.divnaSheet.setState to hot-swap state from the console.
export function replaceState(nextState) {
  state = mergeDeep(structuredClone(defaultState), nextState);
}

// ---------------------------------------------------------------------------
// Bootstrapping
// ---------------------------------------------------------------------------

/** Fetches JSON seed files and merges them into a fresh copy of baseState. */
export async function buildDefaultState() {
  const [spells, inventory, traits, metamagic, wildMagicTable] = await Promise.all([
    loadJsonCollection(DATA_FILES.spells, "spells"),
    loadJsonCollection(DATA_FILES.inventory, "inventory"),
    loadJsonCollection(DATA_FILES.traits, "traits"),
    loadJsonCollection(DATA_FILES.metamagic, "metamagic"),
    loadJsonCollection(DATA_FILES.wildmagic, "wildMagicTable"),
  ]);

  return { ...structuredClone(baseState), spells, inventory, traits, metamagic, wildMagicTable };
}

/** Loads and merges localStorage on top of the seed state. */
export function loadState(seedState) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(seedState);
    const merged = mergeDeep(structuredClone(seedState), JSON.parse(saved));

    // Patch weapon stat fields (attackBonus, damage) that may have been saved as
    // null by an older version of the app, restoring the seed values in that case.
    const seedWeaponByName = Object.fromEntries(
      (seedState.inventory ?? [])
        .filter((i) => i.category === "weapon")
        .map((i) => [i.name, i])
    );
    merged.inventory = (merged.inventory ?? []).map((item) => {
      if (item.category !== "weapon") return item;
      const seed = seedWeaponByName[item.name];
      if (!seed) return item;
      return {
        ...item,
        attackBonus: item.attackBonus ?? seed.attackBonus,
        damage:      item.damage      ?? seed.damage,
      };
    });

    return merged;
  } catch (error) {
    console.warn("Unable to load saved sheet state.", error);
    return structuredClone(seedState);
  }
}

export function saveState() {
  // Exclude metamagic — always reloaded fresh from JSON, never user-edited.
  const { metamagic: _mm, ...toSave } = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

// ---------------------------------------------------------------------------
// JSON collection helpers
// ---------------------------------------------------------------------------

async function loadJsonCollection(path, type) {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Expected an array");
    return data.map((entry) => hydrateCollectionItem(entry, type));
  } catch (error) {
    console.warn(`Unable to load ${type} from ${path}.`, error);
    return [];
  }
}

function hydrateCollectionItem(entry, type) {
  const item = { ...entry };
  if (!item.id) item.id = crypto.randomUUID();

  if (type === "inventory") {
    item.equipped = Boolean(item.equipped);
    item.requiresAttunement = Boolean(item.requiresAttunement);
    item.attuned = Boolean(item.attuned);
    item.acBonus = Number(item.acBonus) || 0;
    item.armorBase = item.armorBase == null || item.armorBase === "" ? null : Number(item.armorBase);
    item.dexCap = item.dexCap == null || item.dexCap === "" ? null : Number(item.dexCap);
    item.attackBonus = item.attackBonus == null || item.attackBonus === "" ? null : Number(item.attackBonus);
    item.damage = item.damage || null;
    item.goldCost = Number(item.goldCost) || 0;
  }

  if (type === "traits") {
    item.category = item.category || "other";
    item.link = item.link || null;
  }

  if (type === "spells") {
    item.level         = Number(item.level) || 0;
    item.attackRoll    = Boolean(item.attackRoll);
    item.saveType      = item.saveType   || null;
    item.damageDie     = item.damageDie  || null;
    item.damageType    = item.damageType || null;
    item.conditions    = item.conditions || null;
    item.concentration = Boolean(item.concentration);
    item.ritual        = Boolean(item.ritual);
    item.upcast        = item.upcast ?? null;
  }

  if (type === "wildMagicTable") {
    item.level = Number(item.level) || 0;
    item.used = Boolean(item.used);
  }

  return item;
}

// ---------------------------------------------------------------------------
// Deep merge utility
// ---------------------------------------------------------------------------

export function mergeDeep(base, override) {
  if (!override || typeof override !== "object") return base;

  for (const [key, value] of Object.entries(override)) {
    if (Array.isArray(value)) {
      base[key] = value;
    } else if (value && typeof value === "object") {
      base[key] = mergeDeep(base[key] ?? {}, value);
    } else {
      base[key] = value;
    }
  }

  return base;
}
