const StickerSettings = require('../db/models/StickerSettings');
const config = require('../config/stickers');

/**
 * Returns the effective per-creator sticker cap for a guild — the
 * staff-set override if one exists, otherwise the config default.
 */
async function getStickerCap(guildId) {
  const settings = await StickerSettings.findOne({ guildId });
  return settings?.maxStickersPerCreator ?? config.maxStickersPerCreator;
}

/**
 * Sets (or updates) a guild's sticker cap override.
 */
async function setStickerCap(guildId, cap) {
  await StickerSettings.findOneAndUpdate(
    { guildId },
    { maxStickersPerCreator: cap },
    { upsert: true }
  );
}

module.exports = { getStickerCap, setStickerCap };
