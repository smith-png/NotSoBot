const { isStaff } = require('../utils/isStaff');
const { getCooldownMinutes, setCooldownMinutes, resetCooldown } = require('../utils/cooldown');

module.exports = {
  name: 'cooldown',
  description: '!cooldown status | !cooldown set <minutes> | !cooldown reset @user',
  async execute(message, args) {
    const sub = args[0]?.toLowerCase();

    if (sub === 'status') {
      const minutes = await getCooldownMinutes();
      await message.reply(`Current cooldown is ${minutes} minute(s).`);
      return;
    }

    // set and reset are staff-only
    if (!isStaff(message.member)) {
      await message.reply("You don't have permission to use this command.");
      return;
    }

    if (sub === 'set') {
      const minutes = parseInt(args[1], 10);
      if (!minutes || minutes <= 0) {
        await message.reply('Usage: `!cooldown set <minutes>` (must be a positive number)');
        return;
      }
      await setCooldownMinutes(minutes);
      await message.reply(`Cooldown updated to ${minutes} minute(s).`);
      return;
    }

    if (sub === 'reset') {
      const targetMember = message.mentions.members?.first();
      if (!targetMember) {
        await message.reply('Usage: `!cooldown reset @user`');
        return;
      }
      await resetCooldown(targetMember.id);
      await message.reply(`Cooldown cleared for ${targetMember}.`);
      return;
    }

    await message.reply('Usage: `!cooldown status` | `!cooldown set <minutes>` | `!cooldown reset @user`');
  },
};
