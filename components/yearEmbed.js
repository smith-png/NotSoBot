const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { brandColor } = require('../config/theme');

// custom_id format: "yearselect_<year>" e.g. "yearselect_1st"
// This lets the button handler map directly to a role without any lookup table,
// and survives bot restarts since it's not tied to a single interaction session.

function buildYearEmbed() {
  const embed = new EmbedBuilder()
    .setTitle('Select Your Current Year')
    .setDescription(
      'Click the button matching your current academic year to get access to your batch channels.\n\nYou can change this again after the cooldown period if needed.'
    )
    .setColor(brandColor);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('yearselect_1st')
      .setLabel('1st Year')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji({ id: '1538514039385358376', name: 'one' }),
    new ButtonBuilder()
      .setCustomId('yearselect_2nd')
      .setLabel('2nd Year')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji({ id: '1538513902223237140', name: 'two' }),
    new ButtonBuilder()
      .setCustomId('yearselect_3rd')
      .setLabel('3rd Year')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji({ id: '1538513759478358139', name: 'three' }),
    new ButtonBuilder()
      .setCustomId('yearselect_4th')
      .setLabel('4th Year')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji({ id: '1538513603081281649', name: 'four' })
  );

  return { embeds: [embed], components: [row] };
}

module.exports = { buildYearEmbed };
