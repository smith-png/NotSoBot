const { EmbedBuilder } = require('discord.js');

const BRAND_COLOR = 0x395f3d;

// Controls category order; anything not listed falls in at the end in
// discovery order.
const CATEGORY_ORDER = ['Year System', 'Stickers', 'Embed Tools', 'Admin & Owner Tools', 'General'];

/**
 * Builds one embed "page" for a category. Each command becomes a 3-column
 * table row (Command / Access / Description) using Discord's inline-field
 * trick: 3 fields marked inline in a row render side by side on desktop.
 * The header labels are only set on the first row (zero-width space name
 * on the rest) so it reads like one continuous table instead of repeating
 * "Command / Access / Description" for every entry.
 *
 * Note: Discord mobile clients stack inline fields into a single column
 * regardless — this is a Discord rendering limitation, not something
 * fixable from the embed side.
 */
function buildCategoryEmbed(categoryLabel, entries, pageIndex, totalPages) {
  const embed = new EmbedBuilder()
    .setTitle('NotSoBot — Command List')
    .setColor(BRAND_COLOR)
    .setDescription(
      `**${categoryLabel}**\n` +
        'Prefix commands use `!`. Commands marked with `/name` also work as slash commands.'
    )
    .setFooter({ text: `Page ${pageIndex + 1} of ${totalPages} · Buttons expire in 5 min` });

  entries.forEach((entry, idx) => {
    const isFirst = idx === 0;
    const isRealCommand = !entry.name.includes(' ');
    const commandCell = !isRealCommand
      ? `*${entry.name}*`
      : entry.hasSlash
      ? `\`!${entry.name}\`\n\`/${entry.name}\``
      : `\`!${entry.name}\``;
    const descriptionCell = entry.usage ? `${entry.description}\n\`${entry.usage}\`` : entry.description;

    embed.addFields(
      { name: isFirst ? 'Command' : '\u200b', value: commandCell, inline: true },
      { name: isFirst ? 'Access' : '\u200b', value: entry.access, inline: true },
      { name: isFirst ? 'Description' : '\u200b', value: descriptionCell, inline: true }
    );
  });

  return embed;
}

/**
 * Builds the full set of paginated help embeds, one per category, grouping
 * commands by their `category` field (falls back to "General").
 */
function buildHelpPages(client) {
  const commands = [...client.commands.values()];

  const byCategory = {};
  for (const cmd of commands) {
    const cat = cmd.category || 'General';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push({
      name: cmd.name,
      description: cmd.description || 'No description available.',
      usage: cmd.usage && cmd.usage !== `!${cmd.name}` ? cmd.usage : null,
      access: cmd.access || 'Unknown',
      hasSlash: Boolean(cmd.slashData),
    });
  }

  // Pseudo-entry: the year-select buttons aren't a command but belong on
  // the Year System page.
  if (byCategory['Year System']) {
    byCategory['Year System'].push({
      name: 'year-select buttons',
      description: 'Click a button on the posted embed to self-assign your year.',
      usage: 'Posted via !postyearembed',
      access: 'Everyone',
      hasSlash: false,
    });
  }

  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => byCategory[c]?.length),
    ...Object.keys(byCategory).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  const pages = orderedCategories.map((cat) =>
    [...byCategory[cat]].sort((a, b) => a.name.localeCompare(b.name))
  );

  return pages.map((entries, i) => buildCategoryEmbed(orderedCategories[i], entries, i, pages.length));
}

module.exports = { buildHelpPages };
