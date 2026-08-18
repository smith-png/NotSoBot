const { EmbedBuilder } = require('discord.js');
const { brandColor, alertColor } = require('../config/theme');

// General-purpose brand-colored embed (success messages, informational
// content, anything that isn't an error or staff-only notice).
function brandEmbed(description) {
  return new EmbedBuilder().setColor(brandColor).setDescription(description);
}

// Validation failures, "not found", cooldowns, usage hints — anything
// telling the user something went wrong with their input or the request.
function errorEmbed(description) {
  return new EmbedBuilder().setColor(alertColor).setDescription(description);
}

// Permission-denied notices and staff/owner-only info panels. Same color
// as errorEmbed today (both map to the brand blue) but kept as a separate
// helper so the two concepts can diverge later without touching call sites.
function staffEmbed(description) {
  return new EmbedBuilder().setColor(alertColor).setDescription(description);
}

module.exports = { brandEmbed, errorEmbed, staffEmbed };
