const INSTA_CHANNEL_ID = '832881742251032576';

const INSTA_LINK_REGEX = /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[^\s]+/g;

function toEmbeddableLink(url) {
  return url.replace(/(?:www\.)?instagram\.com/i, 'zzinstagram.com');
}

module.exports = {
  async execute(msg) {
    if (msg.channel.id !== INSTA_CHANNEL_ID) return;

    const matches = msg.content.match(INSTA_LINK_REGEX);
    if (!matches || !matches.length) return;

    const uniqueLinks = [...new Set(matches)];
    const fixedLinks = uniqueLinks.map(toEmbeddableLink);

    try {
      await msg.reply(fixedLinks.join('\n'));
    } catch (err) {
      console.error('insta watcher error:', err);
    }
  }
};
