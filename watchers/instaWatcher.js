const { EmbedBuilder } = require('discord.js');
const fetchInstaMedia = require('../utils/fetchMedia');
const INSTA_CHANNEL_ID = '832881742251032576';

module.exports = {
  async execute(msg) {
    if (msg.channel.id !== INSTA_CHANNEL_ID) return;
    const match = msg.content.match(/https?:\/\/(www\.)?instagram\.com\/(reel|p)\/[^\s]+/);
    if (!match) return;

    const loading = await msg.reply('Fetching...');

    try {
      const mediaUrl = await fetchInstaMedia(match[0]);
      if (!mediaUrl) return loading.edit("Couldn't fetch that — might be private or the link's broken.");

      try {
        await loading.delete();
        await msg.reply({ files: [{ attachment: mediaUrl, name: 'reel.mp4' }] });
      } catch {
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('Reel too large to upload directly')
          .setDescription(`[Click here to view](${mediaUrl})`)
          .setFooter({ text: 'Instagram Reel' });
        msg.channel.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error('fetch error:', err);
      loading.edit('Something went wrong fetching that.');
    }
  }
};
