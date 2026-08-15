const isOwner = require('../utils/isOwner');

module.exports = {
  name: 'leave',
  async execute(msg, args, client) {
    if (!isOwner(msg.author.id)) return msg.reply("You don't have permission to use this.");
    const guild = client.guilds.cache.get(args[0]);
    if (!guild) return msg.reply("No server found with that ID.");
    const name = guild.name;
    await guild.leave();
    msg.reply(`Left **${name}**.`);
  }
};
