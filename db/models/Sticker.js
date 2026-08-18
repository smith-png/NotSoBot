const mongoose = require('mongoose');

// Deliberately does NOT store the raw attachment URL. Discord CDN links
// carry signed expiry params and go stale after a while — storing the
// (channel, message, attachment index) triple instead lets us re-fetch a
// fresh URL from the API every time the sticker is used.
const stickerSchema = new mongoose.Schema({
  ownerId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },

  nameDisplay: { type: String, required: true }, // as the user typed it
  nameLower: { type: String, required: true }, // lowercased, used for lookups/uniqueness

  sourceChannelId: { type: String, required: true },
  sourceMessageId: { type: String, required: true },
  attachmentIndex: { type: Number, required: true, default: 0 },

  // Set true if a fetch of the source message/attachment fails. Surfaced
  // in !st collection so the owner knows to re-add it, instead of the
  // sticker silently failing every time it's used.
  broken: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
});

// One name per user per guild (case-insensitive via nameLower).
stickerSchema.index({ ownerId: 1, guildId: 1, nameLower: 1 }, { unique: true });

module.exports = mongoose.model('Sticker', stickerSchema);
