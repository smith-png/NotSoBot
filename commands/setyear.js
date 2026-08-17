const { isStaff } = require('../utils/isStaff');
const { swapYearRole } = require('../utils/roleSwap');

const VALID_YEARS = ['1st', '2nd', '3rd', '4th'];
const YEAR_LABELS = { '1st': '1st Year', '2nd': '2nd Year', '3rd': '3rd Year', '4th': '4th Year' };

module.exports = {
  name: 'setyear',
  description: 'Admin override — sets a member\'s year directly, bypassing cooldown.',
  usage: '!setyear @user <1st|2nd|3rd|4th>',
  access: 'Staff',
  async execute(message, args) {
    if (!isStaff(message.member)) {
      await message.reply("You don't have permission to use this command.");
      return;
    }

    const targetMember = message.mentions.members?.first();
    const year = args[1]?.toLowerCase();

    if (!targetMember || !VALID_YEARS.includes(year)) {
      await message.reply('Usage: `!setyear @user <1st|2nd|3rd|4th>`');
      return;
    }

    await swapYearRole(targetMember, year, message.author.id);

    // Confirmation is NOT ephemeral and does not mention the admin, per spec.
    await message.channel.send(`${targetMember} has been set to ${YEAR_LABELS[year]}.`);
  },
};
