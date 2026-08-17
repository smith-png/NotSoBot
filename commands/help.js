const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { buildHelpPages } = require('../utils/helpPages');

const BUTTON_LIFETIME_MS = 5 * 60 * 1000; // 5 minutes

function buildNavRow(page, totalPages, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('help_prev')
      .setLabel('◀ Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page === 0),
    new ButtonBuilder()
      .setCustomId('help_pageindicator')
      .setLabel(`${page + 1} / ${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('help_next')
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page === totalPages - 1)
  );
}

/**
 * Wires up a Previous/Next collector on a sent help message. Shared between
 * the prefix and slash versions. `getMessage` re-fetches the underlying
 * Message object (differs slightly between reply types).
 */
function attachPaginationCollector({ message, pages, ownerId }) {
  let page = 0;
  const totalPages = pages.length;
  if (totalPages <= 1) return;

  const collector = message.createMessageComponentCollector({ time: BUTTON_LIFETIME_MS });

  collector.on('collect', async (interaction) => {
    if (interaction.user.id !== ownerId) {
      await interaction.reply({ content: "This isn't your help menu — run `!help` to get your own.", ephemeral: true });
      return;
    }

    if (interaction.customId === 'help_prev') page = Math.max(0, page - 1);
    if (interaction.customId === 'help_next') page = Math.min(totalPages - 1, page + 1);

    await interaction.update({ embeds: [pages[page]], components: [buildNavRow(page, totalPages)] });
  });

  collector.on('end', async () => {
    await message.edit({ components: [buildNavRow(page, totalPages, true)] }).catch(() => {});
  });
}

module.exports = {
  name: 'help',
  description: 'Lists all available commands, who can use them, and their syntax.',
  usage: '!help',
  access: 'Everyone',
  category: 'General',

  async execute(message) {
    const pages = buildHelpPages(message.client);
    const components = pages.length > 1 ? [buildNavRow(0, pages.length)] : [];

    const sent = await message.reply({ embeds: [pages[0]], components });
    attachPaginationCollector({ message: sent, pages, ownerId: message.author.id });
  },

  slashData: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Lists all available commands, who can use them, and their syntax.'),

  async executeSlash(interaction) {
    const pages = buildHelpPages(interaction.client);
    const components = pages.length > 1 ? [buildNavRow(0, pages.length)] : [];

    await interaction.reply({ embeds: [pages[0]], components, ephemeral: true });
    const sent = await interaction.fetchReply();
    attachPaginationCollector({ message: sent, pages, ownerId: interaction.user.id });
  },
};
