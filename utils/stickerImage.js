const { Jimp } = require('jimp');
const { AttachmentBuilder } = require('discord.js');
const { stickerImageSize } = require('../config/stickers');

const ANIMATED_EXTENSIONS = ['gif'];

function isAnimated(attachment) {
  const ext = (attachment?.name || '').split('.').pop().toLowerCase();
  return ANIMATED_EXTENSIONS.includes(ext) || (attachment?.contentType || '').includes('gif');
}

/**
 * Downloads a sticker's source and produces the file that should be
 * posted into the archive channel at !st add time.
 *
 * Static images are resized to Discord's standard sticker canvas width
 * (height scales proportionally, so nothing gets stretched/squished).
 * Animated GIFs are downloaded and reposted at their **original**
 * size/bytes — Jimp only reads a GIF's first frame, so resizing one
 * would silently kill the animation.
 *
 * Either way, the archive channel ends up with the bot's own permanent
 * copy of the media (not a link to wherever the user originally posted
 * it), which is the whole point: the sticker's stored reference points
 * at this post, so it survives independently of the original message.
 *
 * Throws if the download fails — callers should treat that as "this
 * source isn't usable" rather than silently falling back, since there's
 * nothing else here for the sticker to point at.
 */
async function buildArchivePost(attachment) {
  const res = await fetch(attachment.url);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  if (isAnimated(attachment)) {
    const filename = attachment.name?.toLowerCase().endsWith('.gif') ? attachment.name : 'sticker.gif';
    return new AttachmentBuilder(buffer, { name: filename });
  }

  const image = await Jimp.read(buffer);
  image.resize({ w: stickerImageSize });
  const resizedBuffer = await image.getBuffer('image/png');
  return new AttachmentBuilder(resizedBuffer, { name: 'sticker.png' });
}

module.exports = { buildArchivePost, isAnimated };
