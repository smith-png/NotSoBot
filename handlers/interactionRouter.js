const { handleYearButton } = require('./buttonHandler');
const { openEditorModal, handleEditorSubmit } = require('./embedInteractionHandler');
const { errorEmbed } = require('../utils/embedReplies');

async function handleInteraction(interaction) {
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command || !command.executeSlash) return;

    try {
      await command.executeSlash(interaction);
    } catch (err) {
      console.error(`[slash:${interaction.commandName}] Error:`, err);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [errorEmbed('Something went wrong running that command.')], ephemeral: true }).catch(() => {});
      }
    }
    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId.startsWith('yearselect_')) {
      await handleYearButton(interaction);
      return;
    }
    if (interaction.customId.startsWith('embedopen_')) {
      await openEditorModal(interaction);
      return;
    }
    return;
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('embedsubmit_')) {
      await handleEditorSubmit(interaction);
      return;
    }
    return;
  }
}

module.exports = { handleInteraction };
