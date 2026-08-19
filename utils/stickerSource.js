const { stickerImageSize } = require('../config/stickers');

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

/**
 * Appends (or overwrites) Discord's `size` query param on a CDN
 * attachment URL so every sticker link we post resizes to Discord's
 * standard sticker canvas, regardless of the original upload's actual
 * dimensions. Uses the URL API rather than string concatenation so it
 * doesn't break on attachment URLs that already carry signed query
 * params (Discord's newer CDN links include `ex`/`is`/`hm` signature
 * params that must be preserved).
 */
function withStickerSize(url) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('size', String(stickerImageSize));
    return parsed.toString();
  } catch {
    return url;
  }
}

module.exports = { resolveStickerAttachment, withStickerSize };
