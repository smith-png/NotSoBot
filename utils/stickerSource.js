/**
 * Re-fetches a sticker's source message from the API and returns its
 * attachment fresh. Returns null (never throws) if the channel,
 * message, or attachment no longer exists — callers should treat null
 * as "this sticker's source is gone" rather than crash.
 */
async function resolveStickerAttachment(client, sticker) {
  const channel = await client.channels.fetch(sticker.sourceChannelId).catch(() => null);
  if (!channel) return null;

  const message = await channel.messages.fetch(sticker.sourceMessageId).catch(() => null);
  if (!message) return null;

  const attachments = [...message.attachments.values()];
  return attachments[sticker.attachmentIndex] || null;
}

module.exports = { resolveStickerAttachment };
