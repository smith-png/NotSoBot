const mongoose = require('mongoose');

const userYearSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  guildId: { type: String, required: true },
  currentYear: { type: String, required: true, enum: ['1st', '2nd', '3rd', '4th'] },
  lastChanged: { type: Date, required: true, default: Date.now },
  setBy: { type: String, required: true, default: 'self' }, // 'self' or admin's user ID
});

module.exports = mongoose.model('UserYear', userYearSchema);
