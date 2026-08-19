const config = require('../config/stickers');

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
const IMAGE_URL_REGEX = new RegExp(`https?://\\S+\\.(${IMAGE_EXTENSIONS.join('|')})(\\?\\S*)?`, 'i');
// Known gif-hosting links that unfurl as an image/gif even though the
// URL itself doesn't end in an image extension.
const GIF_HOST_REGEX = /https?:\/\/(www\.)?(tenor\.com|giphy\.com)\/\S+/i;

function hasImageAttachment(msg) {
  return msg.attachments.some((attachment) => {
    const ext = (attachment.name || '').split('.').pop().toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext) || (attachment.contentType || '').startsWith('image/');
  });
}

function hasImageLink(msg) {
  return IMAGE_URL_REGEX.test(msg.content) || GIF_HOST_REGEX.test(msg.content);
}

function isRecognizedCommand(msg, client) {
  if (!msg.content.startsWith('!')) return false;
  const commandName = msg.content.slice(1).trim().split(/\s+/)[0];
  return client.commands.has(commandName);
}

/**
 * A message in the archive channel earns its place only if it's a
 * recognized bot command invocation, or it carries an image/gif —
 * either as an attachment or a link. Everything else (stray chat,
 * typos, the bot's own confirmations/errors/reminders) gets swept so
 * the channel stays a clean image source, nothing more.
 */
function shouldKeepArchiveMessage(msg, client) {
  return isRecognizedCommand(msg, client) || hasImageAttachment(msg) || hasImageLink(msg);
}

/**
 * Deletes a message from the archive channel if it doesn't meet the
 * keep criteria above. No-ops (and never throws) for messages outside
 * the archive channel, or if the delete fails (already gone, missing
 * permission, etc.) — this is best-effort housekeeping, not something
 * that should ever interrupt command handling.
 */
async function sweepArchiveMessage(msg, client) {
  if (msg.channel.id !== config.archiveChannelId) return;
  if (shouldKeepArchiveMessage(msg, client)) return;
  await msg.delete().catch(() => {});
}

/**
 * Always deletes a message after a short delay if it's in the archive
 * channel — used for the bot's own replies there (confirmations,
 * errors), which never qualify to stay under the keep criteria but get
 * a brief moment of visibility before being cleaned up.
 */
function scheduleArchiveBotMessageSweep(msg) {
  if (msg.channel.id !== config.archiveChannelId) return;
  setTimeout(() => msg.delete().catch(() => {}), config.archiveBotMessageLifetimeMs);
}

module.exports = { shouldKeepArchiveMessage, sweepArchiveMessage, scheduleArchiveBotMessageSweep };
