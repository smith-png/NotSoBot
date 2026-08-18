const config = require('../config/stickers');

// Single-token names only (no spaces). This is a deliberate constraint:
// it keeps `!st rename {old} {new}` and `!st add {name}` unambiguous to
// parse without needing quote-handling. Underscores/hyphens cover the
// multi-word use case (e.g. "bear_hug").
const NAME_REGEX = /^[a-zA-Z0-9_-]{1,32}$/;

function isValidStickerName(name) {
  return typeof name === 'string' && NAME_REGEX.test(name);
}

function isReservedName(name) {
  return typeof name === 'string' && config.reservedNames.includes(name.toLowerCase());
}

function getExtension(url) {
  try {
    const clean = url.split('?')[0];
    const parts = clean.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Validates a Discord.js Attachment object (or any {url, size} shaped
 * object) against allowed extensions and the size cap.
 */
function isAllowedAttachment(attachment) {
  if (!attachment || !attachment.url) return false;
  const ext = getExtension(attachment.url);
  if (!ext || !config.allowedExtensions.includes(ext)) return false;
  if (typeof attachment.size === 'number' && attachment.size > config.maxFileSizeBytes) return false;
  return true;
}

module.exports = { isValidStickerName, isReservedName, isAllowedAttachment, getExtension, NAME_REGEX };
