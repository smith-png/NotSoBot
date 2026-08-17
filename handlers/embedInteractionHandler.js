const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require('discord.js');
const { isStaff } = require('../utils/isStaff');
const { parseColor } = require('../utils/embedColor');

const DEFAULT_COLOR = 0x395f3d; // brand sage, used when no color is provided

/**
 * Triggered by clicking the "Open Editor" button (customId starts with 'embedopen_').
 * For edit mode, fetches the target message and prefills the modal with its current
 * embed content if one exists.
 */
async function openEditorModal(interaction) {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith('embedopen_')) return;

  if (!isStaff(interaction.member)) {
    await interaction.reply({ content: "You don't have permission to use this.", ephemeral: true });
    return;
  }

  const rest = interaction.customId.replace('embedopen_', ''); // "create_<channelId>" or "edit_<channelId>_<messageId>"
  const [mode, ...targetParts] = rest.split('_');
  const target = targetParts.join('_');

  const prefill = { title: '', description: '', color: '', footer: '', image: '' };

  if (mode === 'edit') {
    const [channelId, messageId] = target.split('_');
    try {
      const channel = await interaction.client.channels.fetch(channelId);
      const msg = await channel.messages.fetch(messageId);

      if (msg.author.id !== interaction.client.user.id) {
        await interaction.reply({
          content: 'That message was not posted by this bot, so it cannot be edited here.',
          ephemeral: true,
        });
        return;
      }

      const existing = msg.embeds[0];
      if (existing) {
        prefill.title = existing.title || '';
        prefill.description = existing.description || '';
        prefill.color = existing.color != null ? `#${existing.color.toString(16).padStart(6, '0')}` : '';
        prefill.footer = existing.footer?.text || '';
        prefill.image = existing.image?.url || '';
      }
    } catch (err) {
      await interaction.reply({ content: 'Could not find that message. Check the link and try again.', ephemeral: true });
      return;
    }
  }

  const modal = new ModalBuilder()
    .setCustomId(`embedsubmit_${mode}_${target}`)
    .setTitle(mode === 'create' ? 'Create Embed' : 'Edit Embed');

  const titleInput = new TextInputBuilder()
    .setCustomId('title').setLabel('Title').setStyle(TextInputStyle.Short)
    .setRequired(false).setMaxLength(256).setValue(prefill.title);

  const descInput = new TextInputBuilder()
    .setCustomId('description').setLabel('Description').setStyle(TextInputStyle.Paragraph)
    .setRequired(false).setMaxLength(4000).setValue(prefill.description);

  const colorInput = new TextInputBuilder()
    .setCustomId('color').setLabel('Color (hex, e.g. 395F3D)').setStyle(TextInputStyle.Short)
    .setRequired(false).setMaxLength(7).setValue(prefill.color);

  const footerInput = new TextInputBuilder()
    .setCustomId('footer').setLabel('Footer text').setStyle(TextInputStyle.Short)
    .setRequired(false).setMaxLength(2048).setValue(prefill.footer);

  const imageInput = new TextInputBuilder()
    .setCustomId('image').setLabel('Image URL').setStyle(TextInputStyle.Short)
    .setRequired(false).setMaxLength(500).setValue(prefill.image);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(descInput),
    new ActionRowBuilder().addComponents(colorInput),
    new ActionRowBuilder().addComponents(footerInput),
    new ActionRowBuilder().addComponents(imageInput)
  );

  await interaction.showModal(modal);
}

/**
 * Triggered when the modal is submitted (customId starts with 'embedsubmit_').
 * Builds the embed from the form fields, then either posts it fresh (create)
 * or edits the existing message (edit).
 */
async function handleEditorSubmit(interaction) {
  if (!interaction.isModalSubmit()) return;
  if (!interaction.customId.startsWith('embedsubmit_')) return;

  if (!isStaff(interaction.member)) {
    await interaction.reply({ content: "You don't have permission to use this.", ephemeral: true });
    return;
  }

  const rest = interaction.customId.replace('embedsubmit_', '');
  const [mode, ...targetParts] = rest.split('_');
  const target = targetParts.join('_');

  const title = interaction.fields.getTextInputValue('title');
  const description = interaction.fields.getTextInputValue('description');
  const colorRaw = interaction.fields.getTextInputValue('color');
  const footer = interaction.fields.getTextInputValue('footer');
  const image = interaction.fields.getTextInputValue('image');

  const color = parseColor(colorRaw, DEFAULT_COLOR);
  if (color === null) {
    await interaction.reply({
      content: 'Invalid color format. Use a 6-digit hex code, e.g. 395F3D or #395F3D.',
      ephemeral: true,
    });
    return;
  }

  if (!title && !description && !image) {
    await interaction.reply({ content: 'Embed needs at least a title, description, or image.', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder().setColor(color);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (footer) embed.setFooter({ text: footer });
  if (image) embed.setImage(image);

  try {
    if (mode === 'create') {
      const channelId = target;
      const channel = await interaction.client.channels.fetch(channelId);
      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: `Embed posted in <#${channelId}>.`, ephemeral: true });
    } else if (mode === 'edit') {
      const [channelId, messageId] = target.split('_');
      const channel = await interaction.client.channels.fetch(channelId);
      const msg = await channel.messages.fetch(messageId);
      await msg.edit({ embeds: [embed] });
      await interaction.reply({ content: 'Embed updated.', ephemeral: true });
    }
  } catch (err) {
    console.error('[embed editor] Error:', err);
    await interaction.reply({
      content: 'Something went wrong saving that embed. Check the bot has permission to post/edit in that channel.',
      ephemeral: true,
    });
  }
}

module.exports = { openEditorModal, handleEditorSubmit };
