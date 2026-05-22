// Pure utility helpers — no imports, no side effects.

export function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function coerceInputValue(target) {
  return target.type === "number" ? Number(target.value) : target.value;
}

export function formatModifier(value) {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function findById(collection, id) {
  return collection.find((entry) => entry.id === id);
}

export function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
