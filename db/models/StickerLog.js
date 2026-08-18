const mongoose = require('mongoose');

// Every time the bot sends a sticker via `!st {name}`, we log
// messageId -> stickerId here. `!st steal` looks up the replied-to
// message in this collection instead of parsing the embed footer text,
// which would be spoofable and brittle to reformat.
const stickerLogSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true, index: true },
  stickerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Sticker' },
  guildId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('StickerLog', stickerLogSchema);
