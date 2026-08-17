/**
 * Parses a hex color string (with or without '#') into an integer.
 * Returns the fallback if input is empty, or null if input is present but invalid
 * (so the caller can distinguish "not provided" from "provided but malformed").
 */
function parseColor(input, fallback) {
  if (!input || !input.trim()) return fallback;

  const hex = input.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;

  return parseInt(hex, 16);
}

module.exports = { parseColor };
