const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
const IMAGE_URL_REGEX = new RegExp(`https?://\\S+\\.(${IMAGE_EXTENSIONS.join('|')})(\\?\\S*)?`, 'i');
const GIF_HOST_REGEX = /https?:\/\/(www\.)?(tenor\.com|giphy\.com)\/\S+/i;

/**
 * Pulls the direct media URL out of a Tenor/Giphy share page. Share
 * links (tenor.com/view/..., giphy.com/gifs/...) are HTML pages, not
 * the gif itself — the actual media lives in the page's `og:image` (or
 * `og:video` as a fallback) meta tag, which both sites populate for
 * link-preview purposes. Best-effort: if either site changes their
 * markup this stops working, so callers should treat a null result as
 * "couldn't resolve" rather than an error.
 */
async function resolveGifHostLink(pageUrl) {
  try {
    const res = await fetch(pageUrl);
    if (!res.ok) return null;
    const html = await res.text();

    const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    if (ogImage) return ogImage[1];

    const ogVideo = html.match(/<meta\s+property="og:video"\s+content="([^"]+)"/i);
    if (ogVideo) return ogVideo[1];

    return null;
  } catch {
    return null;
  }
}

function guessContentType(url) {
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  if (ext === 'gif') return 'image/gif';
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  return null;
}

/**
 * A minimal attachment-shaped object for sources that aren't a real
 * Discord attachment (a pasted link) — carries just enough (`url`,
 * `name`, `contentType`) for the rest of the sticker pipeline
 * (isAllowedAttachment, buildArchivePost) to treat it the same way.
 */
function syntheticAttachment(url) {
  return {
    url,
    name: url.split('?')[0].split('/').pop() || 'image',
    contentType: guessContentType(url),
  };
}

/**
 * Resolves the image source for an `!st add` invocation, trying in
 * order:
 *   1. An attachment on the invocation message itself
 *   2. A direct image/gif URL in the message content
 *   3. A Tenor/Giphy share link in the message content
 *   4. An attachment on the message being replied to (the original
 *      reply-based flow)
 *
 * Returns { attachment } on success, or null if nothing usable was
 * found. `attachment` is always at least {url, name, contentType} —
 * either a real discord.js Attachment or a synthetic one built from a
 * resolved link.
 */
async function extractStickerSource(msg) {
  const direct = msg.attachments.first();
  if (direct) return { attachment: direct };

  const imageMatch = msg.content.match(IMAGE_URL_REGEX);
  if (imageMatch) return { attachment: syntheticAttachment(imageMatch[0]) };

  const gifHostMatch = msg.content.match(GIF_HOST_REGEX);
  if (gifHostMatch) {
    const resolved = await resolveGifHostLink(gifHostMatch[0]);
    if (resolved) return { attachment: syntheticAttachment(resolved) };
  }

  if (msg.reference) {
    const replied = await msg.channel.messages.fetch(msg.reference.messageId).catch(() => null);
    const repliedAttachment = replied?.attachments.first();
    if (repliedAttachment) return { attachment: repliedAttachment };
  }

  return null;
}

module.exports = { extractStickerSource };
