const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Builds a message with an "Open Editor" button.
 * The customId encodes everything the modal handler needs later:
 *   create -> embedopen_create_<channelId>
 *   edit   -> embedopen_edit_<channelId>_<messageId>
 *
 * Clicking the button is what actually opens the modal — Discord only allows
 * showModal() to be called in direct response to an interaction (button click,
 * slash command), never from a prefix command directly.
 */
function buildEditorPrompt(mode, target) {
  const customId = `embedopen_${mode}_${target}`;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customId).setLabel('Open Editor').setStyle(ButtonStyle.Primary)
  );

  const content =
    mode === 'create'
      ? 'Click below to build the embed.'
      : 'Click below to edit this embed.';

  return { content, components: [row] };
}

module.exports = { buildEditorPrompt };
