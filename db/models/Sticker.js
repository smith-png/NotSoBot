const mongoose = require('mongoose');

// Deliberately does NOT store the raw attachment URL. Discord CDN links
// carry signed expiry params and go stale after a while — storing the
// (channel, message, attachment index) triple instead lets us re-fetch a
// fresh URL from the API every time the sticker is used.
const stickerSchema = new mongoose.Schema({
  // Kept as `ownerId` (not renamed to `creatorId`) so existing documents
  // in Atlas don't need a migration — but its meaning has shifted:
  // stickers are usable by anyone in the guild now, so this field just
  // tracks who created it (for attribution + the per-creator cap), not
  // who's allowed to use it.
  ownerId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },

  nameDisplay: { type: String, required: true }, // as the user typed it
  nameLower: { type: String, required: true }, // lowercased, used for lookups/uniqueness

  sourceChannelId: { type: String, required: true },
  sourceMessageId: { type: String, required: true },
  attachmentIndex: { type: Number, required: true, default: 0 },

  // Set true if a fetch of the source message/attachment fails. Surfaced
  // in !st collection so the creator knows to re-add it, instead of the
  // sticker silently failing every time it's used.
  broken: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
});

// One name per guild (case-insensitive via nameLower) — names are now
// guild-wide unique, not per-user, since any member can use any sticker
// by name. IMPORTANT MIGRATION NOTE: if two different users already
// have a sticker with the same name under the old per-user index, this
// new index will fail to build until one is renamed. Check for
// collisions before deploying this change (see delivery notes).
stickerSchema.index({ guildId: 1, nameLower: 1 }, { unique: true });

module.exports = mongoose.model('Sticker', stickerSchema);
