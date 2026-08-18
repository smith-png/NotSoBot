const { EmbedBuilder } = require('discord.js');
const { brandColor: BRAND_COLOR } = require('../config/theme');

// Controls category order; anything not listed falls in at the end in
// discovery order.
const CATEGORY_ORDER = ['Year System', 'Stickers', 'Embed Tools', 'Admin & Owner Tools', 'General'];

// Small visual anchor per category so pages are easy to tell apart while
// paging on mobile. Falls back to a generic icon for unlisted categories.
const CATEGORY_ICONS = {
  'Year System': '📅',
  Stickers: '🏷️',
  'Embed Tools': '🧩',
  'Admin & Owner Tools': '🛠️',
  General: '📖',
};
const DEFAULT_ICON = '📌';

const DIVIDER = '┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈';

// Discord embed descriptions cap at 4096 chars. Command lists are small
// enough this should never realistically trip, but this keeps a page from
// silently getting truncated by Discord if the list grows a lot.
const MAX_DESCRIPTION_LENGTH = 4096;

/**
 * Renders one command as a compact 2-line block instead of a 3-column
 * field row: `name · access` on one line, description (+ usage, if any)
 * on the next. This avoids Discord's per-field padding, which is what
 * made the old field-based table unreadable on mobile (inline fields
 * collapse to full width and stack, each with its own header + spacing).
 */
function renderEntry(entry) {
  const isRealCommand = !entry.name.includes(' ');
  const nameCell = isRealCommand
    ? entry.hasSlash
      ? `\`!${entry.name}\` / \`/${entry.name}\``
      : `\`!${entry.name}\``
    : `*${entry.name}*`;

  const lines = [`${nameCell}  ·  ${entry.access}`, entry.description];
  if (entry.usage) lines.push(`\`${entry.usage}\``);

  return lines.join('\n');
}

/**
 * Builds one embed "page" for a category. All commands render into a
 * single dense description block (divided by thin separators) instead of
 * one Discord field per command — fields carry fixed padding Discord
 * applies regardless of content, which is what caused the old table to
 * turn into a wall of sparse cards on mobile.
 */
function buildCategoryEmbed(categoryLabel, entries, pageIndex, totalPages) {
  const icon = CATEGORY_ICONS[categoryLabel] || DEFAULT_ICON;

  const intro =
    `${icon} **${categoryLabel}**\n` +
    'Prefix commands use `!`. Commands marked with `/name` also work as slash commands.';

  const body = entries.map(renderEntry).join(`\n${DIVIDER}\n`);

  let description = `${intro}\n\n${body}`;
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    description = `${description.slice(0, MAX_DESCRIPTION_LENGTH - 1)}…`;
  }

  return new EmbedBuilder()
    .setTitle('NotSoBot — Command List')
    .setColor(BRAND_COLOR)
    .setDescription(description)
    .setFooter({ text: `Page ${pageIndex + 1} of ${totalPages} · Buttons expire in 5 min` });
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
