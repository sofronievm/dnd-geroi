# dnd-geroi — Divna Character Sheet

A static **D&D 5.5e character sheet** for Divna the Samodiva, built with vanilla HTML, CSS, and ES modules. No build step required — just push and GitHub Pages serves it.

## Live site

Deployed at: `https://<your-username>.github.io/dnd-geroi/`

## Project structure

```
├── index.html          Page shell and tab layout
├── style.css           All styling (D&D Beyond–inspired dark theme)
├── data/
│   ├── spells.json     Known spells seed data
│   ├── inventory.json  Inventory seed data
│   ├── traits.json     Traits & features seed data
│   ├── metamagic.json  Metamagic options seed data
│   └── wildmagic.json  Wild Magic table seed data
└── js/
    ├── constants.js    Game tables, skill/condition definitions, default character
    ├── state.js        LocalStorage persistence and deep-merge loader
    ├── mechanics.js    Ability math, AC, spell slots, normalization
    ├── render.js       HTML generation for all tabs
    ├── prompts.js      Browser-prompt CRUD for lists
    ├── events.js       DOM event handlers and saveAndRender coordinator
    ├── utils.js        Pure helper functions (clamp, format, escape…)
    └── main.js         Bootstrap (DOMContentLoaded) and debug API
```

## Editing character data

- **Starting character** — change values in `js/constants.js` → `baseState`.
- **Spells, inventory, traits** — edit the JSON files in `data/`. These are fetched at startup and merged over the base state.
- **Spell slot table** — update `sorcererSpellSlots` in `js/constants.js` if the class or edition changes.

## Local preview

Requires an HTTP server (ES modules and `fetch()` won't work from `file://`):

```bash
# Python
python3 -m http.server 8123

# Node
npx serve .
```

Then open `http://localhost:8123`.

## Deploying to GitHub Pages

1. Push the repo to GitHub.
2. Go to **Settings → Pages → Source → Deploy from a branch**.
3. Select `main` (or whichever branch) and `/ (root)`.
4. The site will be live at `https://<username>.github.io/<repo-name>/`.

## Console debug API

Open DevTools and use `window.divnaSheet`:

```js
window.divnaSheet.getState()          // snapshot of current state
window.divnaSheet.setState({ hp: { current: 1 } })  // hot-replace partial state
```
