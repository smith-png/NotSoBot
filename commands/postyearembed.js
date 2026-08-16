const { isStaff } = require('../utils/isStaff');
const { buildYearEmbed } = require('../components/yearEmbed');

module.exports = {
  name: 'postyearembed',
  description: 'Posts the persistent year-select embed with buttons in the current channel. Staff only.',
  async execute(message, args) {
    if (!isStaff(message.member)) {
      await message.reply("You don't have permission to use this command.");
      return;
    }

    await message.channel.send(buildYearEmbed());
    await message.delete().catch(() => {}); // clean up the invoking command message
  },
};
