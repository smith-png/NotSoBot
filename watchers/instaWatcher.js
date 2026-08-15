const { EmbedBuilder } = require('discord.js');
const fetchInstaEmbed = require('../utils/fetchInstaEmbed');

const INSTA_CHANNEL_ID = '832881742251032576';

// Matches instagram.com/p/, /reel/, and /tv/ links.
const INSTA_LINK_REGEX = /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[^\s]+/g;

// Mirror domains of the InstaFix embed-fix service, tried in order.
// ddinstagram.com is the main one; the others are known fallback mirrors
// used when the primary is rate-limited or flaky.
const EMBED_MIRRORS = ['ddinstagram.com', 'kkinstagram.com', 'instagramez.com'];

// Source(s) we scrape OG tags from server-side — never posted as visible text.
function toEmbedSourceLinks(url) {
  return EMBED_MIRRORS.map(mirror => url.replace(/(?:www\.)?instagram\.com/i, mirror));
}

// Builds the embed(s) for one post. Photos/carousels use Discord's
// same-URL grouping trick to render as a single gallery; videos get a
// thumbnail plus a masked watch link since bots can't post playable
// inline video the way Discord's own crawler can.
function buildEmbeds(data, originalLink) {
  const embeds = [];

  if (data.video) {
    const embed = new EmbedBuilder().setColor(0x5865F2).setURL(originalLink);
    if (data.images[0]) embed.setImage(data.images[0]);
    embed.setDescription(`[▶ Watch video](${data.video})`);
    embeds.push(embed);
    return embeds;
  }

  const images = data.images.slice(0, 10);
  images.forEach((img, i) => {
    // Same .setURL on every embed groups them into one gallery view.
    const embed = new EmbedBuilder().setColor(0x5865F2).setURL(originalLink).setImage(img);
    embeds.push(embed);
  });

  return embeds;
}

module.exports = {
  async execute(msg) {
    if (msg.channel.id !== INSTA_CHANNEL_ID) return;

    const matches = msg.content.match(INSTA_LINK_REGEX);
    if (!matches || !matches.length) return;

    const uniqueLinks = [...new Set(matches)];

    for (const link of uniqueLinks) {
      try {
        let data = null;
        for (const sourceUrl of toEmbedSourceLinks(link)) {
          try {
            data = await fetchInstaEmbed(sourceUrl);
          } catch (mirrorErr) {
            console.error(`insta watcher mirror failed (${sourceUrl}):`, mirrorErr.message);
          }
          if (data) break;
        }

        if (!data) {
          console.error(`insta watcher: no OG data found for ${link} across all mirrors`);
          continue;
        }

        const embeds = buildEmbeds(data, link);
        if (embeds.length) {
          await msg.reply({ embeds, allowedMentions: { repliedUser: false } });
        }
      } catch (err) {
        console.error('insta watcher error:', err);
      }
    }
  }
};
