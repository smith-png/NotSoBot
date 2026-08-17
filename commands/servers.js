const { EmbedBuilder } = require('discord.js');
const isOwner = require('../utils/isOwner');

module.exports = {
  name: 'servers',
  description: 'Lists every server the bot is currently in.',
  usage: '!servers',
  access: 'Owner',
  category: 'Admin & Owner Tools',
  execute(msg, args, client) {
    if (!isOwner(msg.author.id)) return msg.reply("You don't have permission to use this.");
    const guilds = client.guilds.cache;
    const embed = new EmbedBuilder()
      .setTitle(`In ${guilds.size} server(s)`)
      .setColor(0x5865F2)
      .setDescription(guilds.map(g => `**${g.name}** — ${g.memberCount} members — ID: \`${g.id}\``).join('\n') || 'None');
    msg.reply({ embeds: [embed] });
  }
};
