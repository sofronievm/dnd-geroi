// CRUD prompts: modal <dialog> for adding and editing list items.

import { state } from "./state.js";
import { clampNumber, escapeAttribute, findById, formatModifier } from "./utils.js";
import { normalizeState, getAbilityModifier } from "./mechanics.js";

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

export async function addListItem(listKey) {
  const created = await showItemDialog(listKey, null);
  if (!created) return;
  state[listKey].push(created);
}

export async function editListItem(listKey, id) {
  const entry = findById(state[listKey], id);
  if (!entry) return;
  const edited = await showItemDialog(listKey, entry);
  if (!edited) return;
  Object.assign(entry, edited);
  normalizeState();
}

export function deleteListItem(listKey, id) {
  state[listKey] = state[listKey].filter((entry) => entry.id !== id);
}

// ---------------------------------------------------------------------------
// Modal dialog
// ---------------------------------------------------------------------------

const LIST_LABELS = {
  inventory:     "Item",
  traits:        "Trait",
  actions:       "Action",
  bonusActions:  "Bonus Action",
  reactions:     "Reaction",
  spells:        "Spell",
  wildMagicTable: "Wild Magic Entry",
};

function showItemDialog(listKey, existing) {
  return new Promise((resolve) => {
    const dialog  = document.getElementById("item-dialog");
    const titleEl = dialog.querySelector(".dialog-title");
    const fieldsEl = dialog.querySelector(".dialog-fields");
    const form     = dialog.querySelector("form");
    const cancelBtn = dialog.querySelector(".dialog-cancel");

    titleEl.textContent = (existing ? "Edit " : "Add ") + (LIST_LABELS[listKey] ?? "Entry");
    fieldsEl.innerHTML  = buildFields(listKey, existing);

    let settled = false;

    function settle(data) {
      if (settled) return;
      settled = true;
      form.removeEventListener("submit", onSubmit);
      cancelBtn.removeEventListener("click", onCancel);
      dialog.removeEventListener("click", onBackdropClick);
      document.removeEventListener("keydown", onEscape);
      dialog.classList.remove("is-open");
      document.body.style.overflow = "";
      resolve(data);
    }

    function onSubmit(e) {
      e.preventDefault();
      settle(extractItem(listKey, existing, new FormData(form)));
    }

    const onCancel        = () => settle(null);
    const onBackdropClick = (e) => { if (e.target === dialog) settle(null); };
    const onEscape        = (e) => { if (e.key === "Escape") settle(null); };

    form.addEventListener("submit", onSubmit);
    cancelBtn.addEventListener("click", onCancel);
    dialog.addEventListener("click", onBackdropClick);
    document.addEventListener("keydown", onEscape);

    dialog.classList.add("is-open");
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      fieldsEl.querySelector("input, select, textarea")?.focus();
    });
  });
}

// ---------------------------------------------------------------------------
// Field builders
// ---------------------------------------------------------------------------

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function field(label, inputHtml, hint) {
  return `<label class="dialog-field">
      <span class="field-label">${label}</span>
      ${inputHtml}
      ${hint ? `<span class="field-hint">${hint}</span>` : ""}
    </label>`;
}

function checkboxField(label, name, checked) {
  return `<label class="dialog-field dialog-field--inline">
      <input type="checkbox" name="${name}" ${checked ? "checked" : ""}>
      <span class="field-label">${label}</span>
    </label>`;
}

function textInput(name, value, required = false) {
  return `<input type="text" name="${name}" value="${esc(value)}" ${required ? "required" : ""}>`;
}

function numberInput(name, value, min, max, placeholder) {
  return `<input type="number" name="${name}" value="${esc(value ?? "")}" min="${min}" max="${max}"${placeholder ? ` placeholder="${esc(placeholder)}"` : ""}>`;
}

function textarea(name, value) {
  return `<textarea name="${name}">${esc(value)}</textarea>`;
}

function selectField(name, options, current) {
  const opts = options
    .map((v) => `<option value="${v}"${current === v ? " selected" : ""}>${v.charAt(0).toUpperCase() + v.slice(1)}</option>`)
    .join("");
  return `<select name="${name}">${opts}</select>`;
}

function buildFields(listKey, ex) {
  switch (listKey) {
    case "inventory":
      return [
        field("Name",          textInput("name", ex?.name ?? "", true)),
        field("Category",      selectField("category", ["weapon", "gear", "armor", "shield", "magic"], ex?.category ?? "gear")),
        field("Gold Cost",     numberInput("goldCost", ex?.goldCost ?? 0, 0, 999999)),
        field("Description",   textarea("description", ex?.description ?? "")),
        checkboxField("Requires Attunement", "requiresAttunement", ex?.requiresAttunement ?? false),
        field("Attack Bonus",  numberInput("attackBonus", ex?.attackBonus ?? "", -10, 30, "Weapons only · e.g. 3")),
        field("Damage",        textInput("damage", ex?.damage ?? ""), "e.g. 1d4 piercing · weapons only"),
        field("AC Bonus",      numberInput("acBonus", ex?.acBonus ?? 0, -10, 10)),
        field("Armor Base AC", numberInput("armorBase", ex?.armorBase ?? "", 1, 30, "Leave blank if not armor")),
        field("Dex Cap",       numberInput("dexCap", ex?.dexCap ?? "", 0, 10, "Leave blank for full Dexterity")),
      ].join("");

    case "traits":
      return [
        field("Name",        textInput("name", ex?.name ?? "", true)),
        field("Category",    selectField("category", ["racial", "class", "feat", "other"], ex?.category ?? "other")),
        field("Source",      textInput("source", ex?.source ?? "Custom")),
        field("Tab Link",    selectField("link", ["none", "spells", "inventory", "combat"], ex?.link ?? "none"), "Optional: clicking the card navigates to this tab"),
        field("Description", textarea("description", ex?.description ?? "")),
      ].join("");

    case "actions":
    case "bonusActions":
    case "reactions":
      return [
        field("Name",          textInput("name", ex?.name ?? "", true)),
        field("Attack Detail", textInput("attack", ex?.attack ?? "None")),
        field("Damage Detail", textInput("damage", ex?.damage ?? "None")),
        field("Save / DC",     textInput("save", ex?.save ?? "None")),
        field("Description",   textarea("description", ex?.description ?? "")),
      ].join("");

    case "spells":
      return [
        field("Name",         textInput("name", ex?.name ?? "", true)),
        field("Level",        numberInput("level", ex?.level ?? 1, 0, 9), "0 = cantrip"),
        field("School",       textInput("school", ex?.school ?? "Arcane")),
        field("Casting Time", textInput("castingTime", ex?.castingTime ?? "1 action")),
        field("Range",        textInput("range", ex?.range ?? "Self")),
        field("Duration",     textInput("duration", ex?.duration ?? "Instantaneous")),
        checkboxField("Attack Roll",    "attackRoll",    ex?.attackRoll    ?? false),
        checkboxField("Concentration",   "concentration", ex?.concentration ?? false),
        checkboxField("Ritual",          "ritual",        ex?.ritual        ?? false),
        field("Save Type",    textInput("saveType",    ex?.saveType    ?? ""), "e.g. WIS, CON — leave blank if none"),
        field("Damage Die",   textInput("damageDie",   ex?.damageDie   ?? ""), "e.g. 1d10, 2d8+1d6"),
        field("Damage Type",  textInput("damageType",  ex?.damageType  ?? ""), "e.g. fire, cold"),
        field("Conditions",   textInput("conditions",  ex?.conditions  ?? ""), "e.g. Speed −10 ft., Charmed"),
        field("Description",  textarea("description",  ex?.description ?? "")),
      ].join("");

    case "wildMagicTable":
      return [
        field("Name",        textInput("name", ex?.name ?? "", true)),
        field("Spell Level", numberInput("level", ex?.level ?? 1, 0, 9)),
        field("Description", textarea("description", ex?.description ?? "")),
      ].join("");

    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Data extraction
// ---------------------------------------------------------------------------

function extractItem(listKey, existing, fd) {
  switch (listKey) {
    case "inventory":    return extractInventoryItem(existing, fd);
    case "traits":       return extractTraitItem(existing, fd);
    case "actions":
    case "bonusActions":
    case "reactions":    return extractActionItem(existing, fd);
    case "spells":       return extractSpellItem(existing, fd);
    case "wildMagicTable": return extractWildMagicItem(existing, fd);
    default: return null;
  }
}

function extractInventoryItem(existing, fd) {
  const requiresAttunement = fd.get("requiresAttunement") === "on";
  const armorBaseRaw   = fd.get("armorBase");
  const dexCapRaw      = fd.get("dexCap");
  const attackBonusRaw = fd.get("attackBonus");
  return {
    id: existing?.id ?? crypto.randomUUID(),
    name:        fd.get("name").trim(),
    category:    fd.get("category"),
    description: fd.get("description").trim(),
    equipped:    existing?.equipped ?? false,
    requiresAttunement,
    attuned:     requiresAttunement ? (existing?.attuned ?? false) : false,
    goldCost:    clampNumber(fd.get("goldCost"), 0, 999999, 0),
    attackBonus: attackBonusRaw === "" ? null : Number(attackBonusRaw),
    damage:      fd.get("damage").trim() || null,
    acBonus:     clampNumber(fd.get("acBonus"), -10, 10, 0),
    armorBase:   armorBaseRaw === "" ? null : Number(armorBaseRaw),
    dexCap:      dexCapRaw    === "" ? null : Number(dexCapRaw),
  };
}

function extractTraitItem(existing, fd) {
  return {
    id:          existing?.id ?? crypto.randomUUID(),
    name:        fd.get("name").trim(),
    category:    fd.get("category") ?? "other",
    source:      fd.get("source").trim(),
    link:        fd.get("link") === "none" ? null : fd.get("link"),
    description: fd.get("description").trim(),
  };
}

function extractActionItem(existing, fd) {
  return {
    id:          existing?.id ?? crypto.randomUUID(),
    name:        fd.get("name").trim(),
    attack:      fd.get("attack"),
    damage:      fd.get("damage"),
    save:        fd.get("save"),
    description: fd.get("description").trim(),
  };
}

function extractSpellItem(existing, fd) {
  return {
    id:          existing?.id ?? crypto.randomUUID(),
    name:        fd.get("name").trim(),
    level:       clampNumber(fd.get("level"), 0, 9, 0),
    school:      fd.get("school").trim(),
    castingTime: fd.get("castingTime").trim(),
    range:       fd.get("range").trim(),
    duration:    fd.get("duration").trim(),
    attackRoll:    fd.get("attackRoll")    === "on",
    concentration: fd.get("concentration") === "on",
    ritual:        fd.get("ritual")        === "on",
    saveType:      fd.get("saveType").trim()    || null,
    damageDie:     fd.get("damageDie").trim()   || null,
    damageType:    fd.get("damageType").trim()  || null,
    conditions:    fd.get("conditions").trim()  || null,
    description:   fd.get("description").trim(),
    upcast:        existing?.upcast ?? null,
  };
}

function extractWildMagicItem(existing, fd) {
  return {
    id:          existing?.id ?? crypto.randomUUID(),
    name:        fd.get("name").trim(),
    level:       clampNumber(fd.get("level"), 0, 9, 1),
    description: fd.get("description").trim(),
    used:        existing?.used ?? false,
  };
}

// ---------------------------------------------------------------------------
// Short rest dialog
// ---------------------------------------------------------------------------

/**
 * Opens the short-rest dialog and resolves with { diceSpent, hpGained } when
 * the player confirms, or null if they cancel.
 */
export function showShortRestDialog() {
  return new Promise((resolve) => {
    const dialog   = document.getElementById("short-rest-dialog");
    const fieldsEl = document.getElementById("short-rest-fields");
    const cancelBtn = document.getElementById("short-rest-cancel");
    const actionBtn = document.getElementById("short-rest-action");

    const level    = state.basics.level;
    const used     = state.hitDice?.used ?? 0;
    const available = Math.max(0, level - used);
    const conMod   = getAbilityModifier(state.abilities.con);
    const conLabel = formatModifier(conMod);

    fieldsEl.innerHTML = `
      <p class="short-rest-description">
        Take a 1-hour rest. You have
        <strong>${available} of ${level} Hit Dice</strong> remaining.
      </p>
      <p class="short-rest-description">
        To recover HP, roll any number of Hit Dice (d6) and add your CON
        modifier (<strong>${conLabel}</strong>) to each roll. Update your
        current HP manually, then mark the dice as used.
      </p>
      <p class="short-rest-note">
        Sorcerers do not recover spell slots or Sorcery Points on a Short Rest.
        All Hit Dice are restored after a Long Rest.
      </p>`;

    let settled = false;
    function settle() {
      if (settled) return;
      settled = true;
      actionBtn.removeEventListener("click", settle);
      cancelBtn.removeEventListener("click", settle);
      dialog.removeEventListener("click", onBackdropClick);
      document.removeEventListener("keydown", onEscape);
      dialog.classList.remove("is-open");
      document.body.style.overflow = "";
      resolve();
    }

    const onBackdropClick = (e) => { if (e.target === dialog) settle(); };
    const onEscape        = (e) => { if (e.key === "Escape") settle(); };

    actionBtn.addEventListener("click", settle);
    cancelBtn.addEventListener("click", settle);
    dialog.addEventListener("click", onBackdropClick);
    document.addEventListener("keydown", onEscape);

    dialog.classList.add("is-open");
    document.body.style.overflow = "hidden";
  });
}

// ---------------------------------------------------------------------------
// Long rest dialog
// ---------------------------------------------------------------------------

/**
 * Opens the long-rest confirmation dialog. Resolves with true if the player
 * confirms, or false if they cancel.
 */
export function showLongRestDialog() {
  return new Promise((resolve) => {
    const dialog     = document.getElementById("long-rest-dialog");
    const fieldsEl   = document.getElementById("long-rest-fields");
    const cancelBtn  = document.getElementById("long-rest-cancel");
    const confirmBtn = document.getElementById("long-rest-confirm");

    const level    = state.basics.level;
    const used     = state.hitDice?.used ?? 0;
    const spMax    = level;
    const hpMax    = state.hp.max;

    const slotLines = Object.entries(state.spellSlotsUsed ?? {})
      .filter(([, usedCount]) => usedCount > 0)
      .map(([lvl]) => `<li>Spell slots (level ${lvl}) — restored</li>`)
      .join("");

    fieldsEl.innerHTML = `
      <p class="short-rest-description">
        Taking a long rest (8 hours) will restore the following:
      </p>
      <ul class="long-rest-list">
        <li>HP — restored to maximum (<strong>${hpMax}</strong>)</li>
        <li>Temporary HP — cleared</li>
        <li>All Spell Slots — restored</li>
        <li>Sorcery Points — restored to full (<strong>${spMax}</strong>)</li>
        <li>Second Face — cooldown reset</li>
        <li>All Hit Dice — restored (<strong>${level}</strong> available)</li>
        <li>Wild Magic Surge — cooldown reset</li>
        <li>Mage Armor — deactivated</li>
        <li>Wild Magic Table — all entries reset</li>
      </ul>`;

    let settled = false;
    function settle(confirmed) {
      if (settled) return;
      settled = true;
      confirmBtn.removeEventListener("click", onConfirm);
      cancelBtn.removeEventListener("click", onCancel);
      dialog.removeEventListener("click", onBackdropClick);
      document.removeEventListener("keydown", onEscape);
      dialog.classList.remove("is-open");
      document.body.style.overflow = "";
      resolve(confirmed);
    }

    const onConfirm       = () => settle(true);
    const onCancel        = () => settle(false);
    const onBackdropClick = (e) => { if (e.target === dialog) settle(false); };
    const onEscape        = (e) => { if (e.key === "Escape") settle(false); };

    confirmBtn.addEventListener("click", onConfirm);
    cancelBtn.addEventListener("click", onCancel);
    dialog.addEventListener("click", onBackdropClick);
    document.addEventListener("keydown", onEscape);

    dialog.classList.add("is-open");
    document.body.style.overflow = "hidden";
  });
}
