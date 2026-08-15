const INSTA_CHANNEL_ID = '832881742251032576';

// Matches instagram.com/p/, /reel/, and /tv/ links.
const INSTA_LINK_REGEX = /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[^\s]+/g;

// ddinstagram.com is InstaFix's documented working domain — Discord's own
// crawler is trusted by it, so posting the link as plain text lets Discord
// generate the real embed itself instead of the bot trying to fetch it.
function toEmbedLink(url) {
  return url.replace(/(?:www\.)?instagram\.com/i, 'ddinstagram.com');
}

module.exports = {
  async execute(msg) {
    if (msg.channel.id !== INSTA_CHANNEL_ID) return;

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
