const mongoose = require('mongoose');

// One document per guild. If none exists, the cap falls back to
// config.stickers.maxStickersPerCreator — this collection only holds
// guilds where staff have overridden the default via !st setcap.
const stickerSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  maxStickersPerCreator: { type: Number, required: true },
});

module.exports = mongoose.model('StickerSettings', stickerSettingsSchema);
