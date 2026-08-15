const watchedChannels = require('../utils/watchedChannels');

// Matches instagram.com/p/, /reel/, and /tv/ links.
const INSTA_LINK_REGEX = /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[^\s]+/g;

// zzinstagram.com is a separately-maintained Instagram embedding proxy
// (credited to Knoppiix) — confirmed live via its own status page as of
// this writing. ddinstagram.com is intentionally NOT used here: its WHOIS
// shows a clientHold (registrar suspension) and it was observed redirecting
// to unrelated, unsafe content.
function toEmbedLink(url) {
  return url.replace(/(?:www\.)?instagram\.com/i, 'zzinstagram.com');
}

module.exports = {
  async execute(msg) {
    if (!watchedChannels.isWatched(msg.channel.id)) return;

    const matches = msg.content.match(INSTA_LINK_REGEX);
    if (!matches || !matches.length) return;

    const uniqueLinks = [...new Set(matches)];
    const multiple = uniqueLinks.length > 1;

    try {
      const body = uniqueLinks
        .map((link, i) => {
          const label = multiple ? `📸 **Instagram Post ${i + 1}/${uniqueLinks.length}**` : '📸 **Instagram Post**';
          return `${label}\n${toEmbedLink(link)}`;
        })
        .join('\n\n');

      await msg.reply({ content: body, allowedMentions: { repliedUser: false } });
    } catch (err) {
      console.error('insta watcher error:', err);
    }
  }
};
