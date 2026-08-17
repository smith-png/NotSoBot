const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

function buildHelpEmbed(client) {
  const embed = new EmbedBuilder()
    .setTitle('NotSoBot — Command List')
    .setColor(0x395f3d)
    .setDescription('Prefix commands use `!`. Commands marked with `/name` also work as slash commands.');

  const sorted = [...client.commands.values()].sort((a, b) => a.name.localeCompare(b.name));

  for (const cmd of sorted) {
    const usage = cmd.usage || `!${cmd.name}`;
    const access = cmd.access || 'Unknown';
    const description = cmd.description || 'No description available.';
    const slashNote = cmd.slashData ? ` · also \`/${cmd.name}\`` : '';

    embed.addFields({
      name: usage,
      value: `${description}\n**Access:** ${access}${slashNote}`,
    });
  }

  embed.addFields({
    name: 'Year selection buttons',
    value:
      'Posted via `!postyearembed`. Anyone can click to self-assign their year, subject to a cooldown.\n**Access:** Everyone',
  });

  return embed;
}

module.exports = {
  name: 'help',
  description: 'Lists all available commands, who can use them, and their syntax.',
  usage: '!help',
  access: 'Everyone',

  async execute(message, args) {
    const embed = buildHelpEmbed(message.client);
    await message.reply({ embeds: [embed] });
  },

  slashData: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Lists all available commands, who can use them, and their syntax.'),

  async executeSlash(interaction) {
    const embed = buildHelpEmbed(interaction.client);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
