const config = require('../config/stickers');

// In-memory, not DB-backed. This is intentionally lightweight anti-spam
// protection, not a feature users configure — a bot restart clearing it
// is an acceptable tradeoff for avoiding a DB round trip on every send.
const lastUsedAt = new Map(); // userId -> timestamp (ms)

function checkStickerCooldown(userId) {
  const last = lastUsedAt.get(userId);
  if (!last) return { onCooldown: false, secondsRemaining: 0 };

  const elapsedSeconds = (Date.now() - last) / 1000;
  if (elapsedSeconds >= config.cooldownSeconds) {
    return { onCooldown: false, secondsRemaining: 0 };
  }

  return { onCooldown: true, secondsRemaining: Math.ceil(config.cooldownSeconds - elapsedSeconds) };
}

function markStickerUsed(userId) {
  lastUsedAt.set(userId, Date.now());
}

module.exports = { checkStickerCooldown, markStickerUsed };
