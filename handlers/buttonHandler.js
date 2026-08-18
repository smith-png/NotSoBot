const { checkCooldown } = require('../utils/cooldown');
const { swapYearRole } = require('../utils/roleSwap');
const { errorEmbed } = require('../utils/embedReplies');

const YEAR_LABELS = { '1st': '1st Year', '2nd': '2nd Year', '3rd': '3rd Year', '4th': '4th Year' };

async function handleYearButton(interaction) {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith('yearselect_')) return;

  const year = interaction.customId.replace('yearselect_', ''); // '1st' | '2nd' | '3rd' | '4th'

  const { onCooldown, minutesRemaining } = await checkCooldown(interaction.user.id);
  if (onCooldown) {
    await interaction.reply({
      embeds: [errorEmbed(`You can change your year again in ${minutesRemaining} minute(s).`)],
      ephemeral: true,
    });
    return;
  }

  const member = interaction.member;
  await swapYearRole(member, year, 'self');

  await interaction.reply({
    content: `You've been set to ${YEAR_LABELS[year]}.`,
    ephemeral: true,
  });
}

module.exports = { handleYearButton };
