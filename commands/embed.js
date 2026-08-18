const { SlashCommandBuilder } = require('discord.js');
const { isStaff } = require('../utils/isStaff');
const { parseMessageLink } = require('../utils/messageLink');
const { buildEditorPrompt } = require('../components/embedEditorButton');
const { errorEmbed, staffEmbed } = require('../utils/embedReplies');

module.exports = {
  name: 'embed',
  description: 'Opens an interactive editor to create or edit a bot embed.',
  usage: '!embed create #channel  OR  !embed edit <message_link>',
  access: 'Staff',
  category: 'Embed Tools',

  async execute(message, args) {
    if (!isStaff(message.member)) {
      await message.reply({ embeds: [staffEmbed("You don't have permission to use this command.")] });
      return;
    }

    const sub = args[0]?.toLowerCase();

    if (sub === 'create') {
      const channel = message.mentions.channels?.first() || message.channel;
      const prompt = buildEditorPrompt('create', channel.id);
      await message.reply(prompt);
      return;
    }

    if (sub === 'edit') {
      const link = args[1];
      const parsed = link ? parseMessageLink(link) : null;
      if (!parsed) {
        await message.reply({ embeds: [errorEmbed('Usage: `!embed edit <message_link>`')] });
        return;
      }
      const target = `${parsed.channelId}_${parsed.messageId}`;
      const prompt = buildEditorPrompt('edit', target);
      await message.reply(prompt);
      return;
    }

    await message.reply({ embeds: [errorEmbed('Usage: `!embed create #channel` or `!embed edit <message_link>`')] });
  },

  slashData: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create or edit a bot embed (staff only)')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a new embed in a channel')
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to post in').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('edit')
        .setDescription('Edit an existing embed the bot posted')
        .addStringOption((opt) =>
          opt.setName('message_link').setDescription('Link to the message with the embed').setRequired(true)
        )
    ),

  async executeSlash(interaction) {
    if (!isStaff(interaction.member)) {
      await interaction.reply({ embeds: [staffEmbed("You don't have permission to use this command.")], ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      const channel = interaction.options.getChannel('channel');
      const prompt = buildEditorPrompt('create', channel.id);
      await interaction.reply({ ...prompt, ephemeral: true });
      return;
    }

    if (sub === 'edit') {
      const link = interaction.options.getString('message_link');
      const parsed = parseMessageLink(link);
      if (!parsed) {
        await interaction.reply({ embeds: [errorEmbed('That does not look like a valid message link.')], ephemeral: true });
        return;
      }
      const target = `${parsed.channelId}_${parsed.messageId}`;
      const prompt = buildEditorPrompt('edit', target);
      await interaction.reply({ ...prompt, ephemeral: true });
      return;
    }
  },
};
