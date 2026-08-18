const { EmbedBuilder } = require('discord.js');
const isOwner = require('../utils/isOwner');
const { staffEmbed } = require('../utils/embedReplies');
const { alertColor } = require('../config/theme');

module.exports = {
  name: 'servers',
  description: 'Lists every server the bot is currently in.',
  usage: '!servers',
  access: 'Owner',
  category: 'Admin & Owner Tools',
  execute(msg, args, client) {
    if (!isOwner(msg.author.id)) return msg.reply({ embeds: [staffEmbed("You don't have permission to use this.")] });
    const guilds = client.guilds.cache;
    const embed = new EmbedBuilder()
      .setTitle(`In ${guilds.size} server(s)`)
      .setColor(alertColor) // owner-only info panel — uses the staff/error color
      .setDescription(guilds.map(g => `**${g.name}** — ${g.memberCount} members — ID: \`${g.id}\``).join('\n') || 'None');
    msg.reply({ embeds: [embed] });
  }
};
