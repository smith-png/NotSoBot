const isOwner = require('../utils/isOwner');
const { errorEmbed, staffEmbed } = require('../utils/embedReplies');

module.exports = {
  name: 'leave',
  description: 'Makes the bot leave a server by ID.',
  usage: '!leave <server_id>',
  access: 'Owner',
  category: 'Admin & Owner Tools',
  async execute(msg, args, client) {
    if (!isOwner(msg.author.id)) return msg.reply({ embeds: [staffEmbed("You don't have permission to use this.")] });
    const guild = client.guilds.cache.get(args[0]);
    if (!guild) return msg.reply({ embeds: [errorEmbed("No server found with that ID.")] });
    const name = guild.name;
    await guild.leave();
    msg.reply(`Left **${name}**.`);
  }
};
