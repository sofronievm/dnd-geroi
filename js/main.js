// Entry point: bootstraps the app on DOMContentLoaded.
// Also exposes a small debug API via window.divnaSheet.

import { buildDefaultState, loadState, saveState, initApp, replaceState, state, defaultState } from "./state.js";
import { normalizeState } from "./mechanics.js";
import { renderAll, renderLoadingState } from "./render.js";
import { saveAndRender, bindEvents } from "./events.js";
import { mergeDeep } from "./state.js";
import { loadFromFirestore, saveToFirestore } from "./firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
  renderLoadingState();

  const builtDefault = await buildDefaultState();

  // Prefer Firestore; fall back to localStorage when offline or on first run.
  const cloudState  = await loadFromFirestore();
  const loadedState = cloudState
    ? mergeDeep(structuredClone(builtDefault), cloudState)
    : loadState(builtDefault);

  initApp(builtDefault, loadedState);

  // Schema migration: bump SCHEMA_VERSION whenever seed data changes in a
  // breaking way. On first load after a bump the affected collections are
  // reset to the current seed so stale state never wins.
  const SCHEMA_VERSION = 14;
  if ((state._schemaVersion ?? 0) < SCHEMA_VERSION) {
    state.traits = structuredClone(defaultState.traits);
    state.spells = structuredClone(defaultState.spells);
    state.skills = structuredClone(defaultState.skills);
    state.basics.race = defaultState.basics.race;

    // v9: restore weapon stats (attackBonus, damage) that may be null in old saves.
    const seedWeaponByName = Object.fromEntries(
      defaultState.inventory
        .filter((i) => i.category === "weapon")
        .map((i) => [i.name, i])
    );
    state.inventory = state.inventory.map((item) => {
      if (item.category !== "weapon") return item;
      const seed = seedWeaponByName[item.name];
      if (!seed) return item;
      return {
        ...item,
        attackBonus: item.attackBonus ?? seed.attackBonus,
        damage:      item.damage      ?? seed.damage,
      };
    });

    state._schemaVersion = SCHEMA_VERSION;
  }

  normalizeState();

  // Persist the (possibly migrated) state to both stores so both are in sync.
  saveState();
  saveToFirestore(state);

  renderAll();
  bindEvents();
});

// ---------------------------------------------------------------------------
// Console debug helpers — useful during development, harmless in production.
// ---------------------------------------------------------------------------
window.divnaSheet = {
  /** Return a snapshot of the current state (safe to inspect or copy). */
  getState: () => structuredClone(state),

  /** Hot-replace state from the console: window.divnaSheet.setState({hp:{current:1}}) */
  setState: (nextState) => {
    replaceState(mergeDeep(structuredClone(defaultState), nextState));
    saveAndRender();
  },
};
