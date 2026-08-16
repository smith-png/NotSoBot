const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  _id: { type: String, default: 'settings' },
  cooldownMinutes: { type: Number, required: true, default: 60 },
});

module.exports = mongoose.model('Settings', settingsSchema);
