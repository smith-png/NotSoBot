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
 * Builds a resized image URL for a sticker attachment, standardized to
 * Discord's sticker canvas size.
 *
 * Important: the `size` query param only works on Discord's *asset*
 * CDN endpoints (avatars, emojis, guild icons) — raw message-attachment
 * links under cdn.discordapp.com don't support it at all; Discord just
 * ignores/strips it, which is why links posted this way never showed a
 * `size` param. Resizing an arbitrary attachment requires going through
 * Discord's image proxy instead (media.discordapp.net), using width/
 * height query params. discord.js exposes that proxy URL directly as
 * `attachment.proxyURL`, so we use that as the base rather than
 * `attachment.url`.
 *
 * We only constrain `width`, not both width and height — Discord's
 * proxy scales the other dimension proportionally when only one is
 * given. Setting both forces a hard square crop/stretch, which would
 * distort any sticker that isn't already square. This matches how
 * Discord's own native stickers behave too: a 320x320 canvas, but the
 * artwork itself keeps its aspect ratio rather than being stretched to
 * fill it.
 */
function withStickerSize(attachment) {
  const base = attachment?.proxyURL || attachment?.url;
  try {
    const parsed = new URL(base);
    parsed.searchParams.set('width', String(stickerImageSize));
    return parsed.toString();
  } catch {
    return attachment?.url;
  }
}

module.exports = { resolveStickerAttachment, withStickerSize };
