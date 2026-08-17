/**
 * Parses a Discord message link like:
 * https://discord.com/channels/<guildId>/<channelId>/<messageId>
 * https://discordapp.com/channels/<guildId>/<channelId>/<messageId>
 *
 * Returns { guildId, channelId, messageId } or null if the link doesn't match.
 */
function parseMessageLink(link) {
  if (!link) return null;
  const match = link.match(/discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)/);
  if (!match) return null;

  const [, guildId, channelId, messageId] = match;
  return { guildId, channelId, messageId };
}

module.exports = { parseMessageLink };
