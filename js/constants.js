// Static game data: tables, definitions, and the default character template.
// Edit baseState here to change the starting character, or change any game table.

export const STORAGE_KEY = "divna-character-sheet-v2";

export const DATA_FILES = {
  spells: "data/spells.json",
  inventory: "data/inventory.json",
  traits: "data/traits.json",
  metamagic: "data/metamagic.json",
  wildmagic: "data/wildmagic.json",
};

// Sorcerer spell slots per character level (PHB 2024).
export const sorcererSpellSlots = {
  1:  { 1: 2 },
  2:  { 1: 3 },
  3:  { 1: 4, 2: 2 },
  4:  { 1: 4, 2: 3 },
  5:  { 1: 4, 2: 3, 3: 2 },
  6:  { 1: 4, 2: 3, 3: 3 },
  7:  { 1: 4, 2: 3, 3: 3, 4: 1 },
  8:  { 1: 4, 2: 3, 3: 3, 4: 2 },
  9:  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
  18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
  20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
};

// Sorcery point cost to create a spell slot via Flexible Casting (max level 5).
export const flexibleCastingCost = { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7 };

// Static SRD action reference — rendered as read-only cards in the Combat tab.
// link: tab key to navigate to when the card is clicked.
export const actionReference = {
  actions: [
    {
      name: "Attack",
      description: "Make one melee or ranged weapon attack. You can replace one attack with a grapple or shove attempt. Extra Attack features grant additional attacks on the same action.",
      link: "inventory",
    },
    {
      name: "Cast a Spell",
      description: "Cast a spell with a casting time of 1 action. Consult your spell list for options and slot costs.",
      link: "spells",
    },
    {
      name: "Dash",
      description: "Gain extra movement equal to your speed for the current turn. Difficult terrain still costs double.",
    },
    {
      name: "Disengage",
      description: "Your movement doesn't provoke opportunity attacks for the rest of this turn.",
    },
    {
      name: "Dodge",
      description: "Until the start of your next turn, attack rolls against you have disadvantage (if you can see the attacker) and you make Dexterity saving throws with advantage. Requires you not to be incapacitated.",
    },
    {
      name: "Help",
      description: "Give a creature advantage on its next ability check, or distract a creature within 5 ft so an ally gains advantage on their next attack roll against it.",
    },
    {
      name: "Hide",
      description: "Make a Dexterity (Stealth) check against observers' Passive Perception. On success, you are hidden until you attack, cast a noticeable spell, or are spotted.",
    },
    {
      name: "Ready",
      description: "Declare a trigger and a response action or movement. When the trigger occurs before your next turn, use your reaction to execute it. Readied spells expend their slot immediately.",
    },
    {
      name: "Search",
      description: "Devote your attention to finding something hidden. The GM calls for a Perception or Investigation check.",
    },
    {
      name: "Use an Object",
      description: "Use a magic item or object that requires an action to operate. Simple object interactions (drawing a weapon) are free; anything more complex costs this action.",
      link: "inventory",
    },
  ],
  bonusActions: [
    {
      name: "Custom Trait",
      description: "Activate a class feature, subclass ability, racial trait, or feat that requires a bonus action. See your Traits & Features for what applies.",
      link: "traits",
    },
    {
      name: "Off-Hand Attack",
      description: "When you take the Attack action with a Light melee weapon, attack with a different Light melee weapon in your other hand. No ability modifier is added to the damage unless it is negative.",
      link: "inventory",
    },
    {
      name: "Cast a Spell",
      description: "Cast a spell with a casting time of 1 bonus action. You cannot cast another non-cantrip spell on the same turn.",
      link: "spells",
    },
    {
      name: "Poison Weapon",
      description: "Apply a vial of poison to one weapon or up to three pieces of ammunition. Potency lasts 1 minute or until a hit is made.",
      link: "inventory",
    },
    {
      name: "Potion of Healing",
      description: "Drink a healing potion to regain 2d4 + 2 HP (bonus action for yourself). Administering it to another creature costs a full action.",
      link: "inventory",
    },
  ],
  reactions: [
    {
      name: "Custom Trait",
      description: "Trigger a class feature, subclass ability, racial trait, or feat that requires a reaction. See your Traits & Features for what applies.",
      link: "traits",
    },
    {
      name: "Opportunity Attack",
      description: "When a hostile creature you can see voluntarily moves out of your reach, make one melee weapon attack against it as a reaction.",
    },
    {
      name: "Cast a Spell",
      description: "Cast a spell with a casting time of 1 reaction when its specific trigger condition is met, as described in the spell.",
      link: "spells",
    },
  ],
  movement: [
    {
      name: "Move",
      description: "Spend up to your speed in feet of movement on your turn. You can break it up — move before your action, after it, or in between attacks.",
    },
    {
      name: "Climbing",
      description: "Costs 1 extra foot of movement per foot climbed (double cost). A difficult surface may require a Strength (Athletics) check.",
    },
    {
      name: "Crawling",
      description: "While prone, you can only crawl, which costs 1 extra foot of movement per foot (double cost).",
    },
    {
      name: "Drop Prone",
      description: "Falling prone costs no movement. You gain no benefit from going prone voluntarily in most situations — but it can help you avoid ranged attacks.",
    },
    {
      name: "Stand Up",
      description: "Standing up from prone costs movement equal to half your speed. If you don't have enough movement remaining, you cannot stand.",
    },
    {
      name: "High Jump",
      description: "With a running start (at least 10 ft), you leap a number of feet equal to 3 + your Strength modifier. A standing jump covers half that. You can extend your arms to reach up to 1.5× your height.",
    },
    {
      name: "Long Jump",
      description: "With a running start (at least 10 ft), you leap a number of feet up to your Strength score. A standing jump covers half that distance. Each foot of the jump costs 1 foot of movement.",
    },
    {
      name: "Swimming",
      description: "Costs 1 extra foot of movement per foot swum (double cost) unless you have a swim speed. Rough water may require a Strength (Athletics) check.",
    },
    {
      name: "Difficult Terrain",
      description: "Moving through difficult terrain (rubble, shallow water, heavy snow, etc.) costs 1 extra foot per foot of movement, effectively halving your speed through it.",
    },
  ],
};

export const skillDefinitions = [
  { key: "athletics",     label: "Athletics",      ability: "str" },
  { key: "acrobatics",    label: "Acrobatics",     ability: "dex" },
  { key: "sleightOfHand", label: "Sleight of Hand", ability: "dex" },
  { key: "stealth",       label: "Stealth",        ability: "dex" },
  { key: "arcana",        label: "Arcana",         ability: "int" },
  { key: "history",       label: "History",        ability: "int" },
  { key: "investigation", label: "Investigation",  ability: "int" },
  { key: "nature",        label: "Nature",         ability: "int" },
  { key: "religion",      label: "Religion",       ability: "int" },
  { key: "animalHandling",label: "Animal Handling",ability: "wis" },
  { key: "insight",       label: "Insight",        ability: "wis" },
  { key: "medicine",      label: "Medicine",       ability: "wis" },
  { key: "perception",    label: "Perception",     ability: "wis" },
  { key: "survival",      label: "Survival",       ability: "wis" },
  { key: "deception",     label: "Deception",      ability: "cha" },
  { key: "intimidation",  label: "Intimidation",   ability: "cha" },
  { key: "performance",   label: "Performance",    ability: "cha" },
  { key: "persuasion",    label: "Persuasion",     ability: "cha" },
];

export const exhaustionEffects = [
  "No exhaustion.",
  "Disadvantage on ability checks.",
  "Speed halved.",
  "Disadvantage on attack rolls and saving throws.",
  "Hit point maximum halved.",
  "Speed reduced to 0.",
  "Death.",
];

export const conditionDefinitions = [
  {
    key: "blinded",
    label: "Blinded",
    description:
      "A blinded creature cannot see and automatically fails any ability check that requires sight. Attack rolls against it have advantage, and its own attack rolls have disadvantage.",
  },
  {
    key: "charmed",
    label: "Charmed",
    description:
      "A charmed creature cannot attack the charmer or target the charmer with harmful abilities or magical effects. The charmer has advantage on social checks to interact with it.",
  },
  {
    key: "deafened",
    label: "Deafened",
    description:
      "A deafened creature cannot hear and automatically fails any ability check that requires hearing.",
  },
  {
    key: "frightened",
    label: "Frightened",
    description:
      "A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is in line of sight, and it cannot willingly move closer to that source.",
  },
  {
    key: "grappled",
    label: "Grappled",
    description:
      "A grappled creature's speed becomes 0 and it cannot benefit from bonuses to speed until the grapple ends.",
  },
  {
    key: "incapacitated",
    label: "Incapacitated",
    description:
      "An incapacitated creature cannot take actions, bonus actions, or reactions.",
  },
  {
    key: "invisible",
    label: "Invisible",
    description:
      "An invisible creature cannot be seen without special senses or magic. Attack rolls against it have disadvantage, and its own attack rolls have advantage.",
  },
  {
    key: "paralyzed",
    label: "Paralyzed",
    description:
      "A paralyzed creature is incapacitated and cannot move or speak. It automatically fails Strength and Dexterity saves, attack rolls against it have advantage, and hits from within 5 feet are criticals.",
  },
  {
    key: "petrified",
    label: "Petrified",
    description:
      "A petrified creature is transformed into inanimate stone, is incapacitated, cannot move or speak, automatically fails Strength and Dexterity saves, and has resistance to all damage.",
  },
  {
    key: "poisoned",
    label: "Poisoned",
    description: "A poisoned creature has disadvantage on attack rolls and ability checks.",
  },
  {
    key: "prone",
    label: "Prone",
    description:
      "A prone creature's only movement option is to crawl unless it stands. It has disadvantage on attack rolls, attacks against it from within 5 feet have advantage, and ranged attacks against it have disadvantage.",
  },
  {
    key: "restrained",
    label: "Restrained",
    description:
      "A restrained creature's speed is 0, it has disadvantage on attack rolls and Dexterity saves, and attack rolls against it have advantage.",
  },
  {
    key: "stunned",
    label: "Stunned",
    description:
      "A stunned creature is incapacitated, cannot move, can speak only falteringly, automatically fails Strength and Dexterity saves, and attack rolls against it have advantage.",
  },
  {
    key: "unconscious",
    label: "Unconscious",
    description:
      "An unconscious creature is incapacitated, cannot move or speak, is unaware of its surroundings, drops what it is holding, falls prone, automatically fails Strength and Dexterity saves, and attacks against it have advantage with close-range critical hits.",
  },
];

// ---------------------------------------------------------------------------
// Default character state — the seed that is merged with any saved data.
// Change values here to update the starting character template.
// ---------------------------------------------------------------------------
export const baseState = {
  activeTab: "overview",

  basics: {
    name: "Divna",
    race: "Changeling",
    background: "Folk Hero",
    className: "Sorcerer",
    subclass: "Wild Magic",
    level: 5,
    speed: 30,
  },

  inspiration: false,

  abilities: { str: 10, dex: 12, con: 14, int: 16, wis: 12, cha: 18 },

  savingThrows: {
    str: { proficient: false },
    dex: { proficient: false },
    con: { proficient: true  },
    int: { proficient: false },
    wis: { proficient: false },
    cha: { proficient: true  },
  },

  skills: {
    athletics:     { proficient: false },
    acrobatics:    { proficient: false },
    sleightOfHand: { proficient: false },
    stealth:       { proficient: false },
    arcana:        { proficient: false },
    history:       { proficient: false },
    investigation: { proficient: false },
    nature:        { proficient: false },
    religion:      { proficient: false },
    animalHandling:{ proficient: true  },
    insight:       { proficient: true  },
    medicine:      { proficient: true  },
    perception:    { proficient: false },
    survival:      { proficient: true  },
    deception:     { proficient: false },
    intimidation:  { proficient: false },
    performance:   { proficient: false },
    persuasion:    { proficient: true  },
  },

  hp: { current: 32, max: 32, temp: 0 },

  hitDice: { used: 0 },

  combat: {
    sorceryPointsCurrent: 5,
    mageArmorActive: false,
    wildMagicTableUsed: false,
    secondFaceUsed: false,
    conditions: Object.fromEntries(conditionDefinitions.map((c) => [c.key, false])),
    exhaustionLevel: 0,
  },

  spellSlotsUsed: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },

  actions: [
    {
      id: crypto.randomUUID(),
      name: "Fire Bolt",
      attack: "Spell attack: proficiency + Charisma",
      damage: "1d10 fire",
      save: "None",
      description:
        "A ranged cantrip attack. Uses your spell attack bonus and ignores cover only if a feature says so. Reliable default ranged offense.",
    },
    {
      id: crypto.randomUUID(),
      name: "Chaos Bolt",
      attack: "Spell attack: proficiency + Charisma",
      damage: "2d8 + 1d6 mixed energy",
      save: "None",
      description:
        "Unstable magic that can leap to another target when the d8s match. Great single-target burst when you want a little chaos in the fight.",
    },
    {
      id: crypto.randomUUID(),
      name: "Dagger",
      attack: "Weapon attack: proficiency + Dexterity",
      damage: "1d4 + Dexterity piercing",
      save: "None",
      description:
        "Finesse lets you use Strength or Dexterity. Light supports two-weapon fighting. Thrown means you can attack at 20 feet normally or 60 feet with disadvantage.",
    },
  ],

  bonusActions: [
    {
      id: crypto.randomUUID(),
      name: "Misty Step",
      attack: "None",
      damage: "None",
      save: "None",
      description:
        "Teleport up to 30 feet to a visible space. Ideal for escaping melee pressure or taking high ground.",
    },
    {
      id: crypto.randomUUID(),
      name: "Flexible Casting",
      attack: "None",
      damage: "None",
      save: "None",
      description:
        "Convert spell slots into sorcery points or create spell slots from sorcery points when you need endurance or a clutch extra cast.",
    },
  ],

  reactions: [
    {
      id: crypto.randomUUID(),
      name: "Shield",
      attack: "None",
      damage: "None",
      save: "None",
      description:
        "When hit, raise your AC by 5 until the start of your next turn and stop magic missile. This often turns a hit into a miss.",
    },
    {
      id: crypto.randomUUID(),
      name: "Opportunity Attack",
      attack: "Weapon attack: proficiency + Dexterity",
      damage: "1d4 + Dexterity piercing",
      save: "None",
      description:
        "Use your reaction when a creature leaves your reach without disengaging. Best with a dagger already in hand.",
    },
  ],

  spells: [],

  coins: { copper: 0, silver: 0, gold: 0 },
  inventory: [],
  traits: [],
};
