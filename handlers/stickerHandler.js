const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Sticker = require('../db/models/Sticker');
const config = require('../config/stickers');
const { isStaff } = require('../utils/isStaff');
const { isValidStickerName, isReservedName, isAllowedAttachment } = require('../utils/stickerValidation');
const { checkStickerCooldown, markStickerUsed } = require('../utils/stickerCooldown');
const { resolveStickerAttachment } = require('../utils/stickerSource');
const { buildArchivePost } = require('../utils/stickerImage');
const { extractStickerSource } = require('../utils/stickerSourceExtract');
const { getStickerCap, setStickerCap } = require('../utils/stickerCap');
const { scheduleArchiveBotMessageSweep } = require('../utils/archiveCleanup');
const { brandColor: BRAND_COLOR } = require('../config/theme');
const { errorEmbed, staffEmbed } = require('../utils/embedReplies');

function nameError(name) {
  if (!name) return 'Give this sticker a name: `!st add {name}`.';
  if (isReservedName(name)) return `\`${name}\` is a reserved word and can't be used as a sticker name.`;
  if (!isValidStickerName(name)) {
    return 'Sticker names must be a single word: letters, numbers, `_` or `-` only, up to 32 characters.';
  }
  return null;
}

// --- !st add {name} ------------------------------------------------------
// Stickers are usable by anyone in the guild, so this can be run from
// anywhere — the bot always ends up posting its own permanent copy into
// the archive channel regardless of where the command was invoked.
async function handleAdd(msg, args) {
  const inArchiveChannel = msg.channel.id === config.archiveChannelId;

  const name = args[1];
  const err = nameError(name);
  if (err) {
    const sent = await msg.reply({ embeds: [errorEmbed(err)] });
    scheduleArchiveBotMessageSweep(sent);
    return;
  }

  // Checks (in order): an attachment on this message, a direct image/gif
  // link in the message text, a Tenor/Giphy share link in the message
  // text, or — as a fallback — an attachment on whatever was replied to.
  const source = await extractStickerSource(msg);
  if (!source) {
    const sent = await msg.reply({
      embeds: [
        errorEmbed(
          'No image found. Attach one, paste a direct image/gif link or a Tenor/Giphy link, or reply to a message that has one — with `!st add {name}`.'
        ),
      ],
    });
    scheduleArchiveBotMessageSweep(sent);
    return;
  }

  const { attachment } = source;

  if (!isAllowedAttachment(attachment)) {
    const sent = await msg.reply({
      embeds: [
        errorEmbed(
          `That file isn't usable as a sticker. Allowed types: ${config.allowedExtensions.join(', ')}, max ${
            config.maxFileSizeBytes / (1024 * 1024)
          }MB.`
        ),
      ],
    });
    scheduleArchiveBotMessageSweep(sent);
    return;
  }

  const cap = await getStickerCap(msg.guild.id);
  const count = await Sticker.countDocuments({ ownerId: msg.author.id, guildId: msg.guild.id });
  if (count >= cap) {
    const sent = await msg.reply({
      embeds: [errorEmbed(`You've hit the ${cap}-sticker limit. Delete one first with \`!st delete {name}\`.`)],
    });
    scheduleArchiveBotMessageSweep(sent);
    return;
  }

  // Download + (for static images) resize the source now, once, and
  // post the bot's own permanent copy into the archive channel. The
  // sticker's stored reference points at THIS post from here on, not
  // wherever the user originally attached/linked the image — so it
  // survives independently of the original message.
  let archiveFile;
  try {
    archiveFile = await buildArchivePost(attachment);
  } catch (e) {
    const sent = await msg.reply({ embeds: [errorEmbed("Couldn't download that image — check the link/attachment and try again.")] });
    scheduleArchiveBotMessageSweep(sent);
    return;
  }

  const archiveChannel = await msg.client.channels.fetch(config.archiveChannelId).catch(() => null);
  if (!archiveChannel) {
    const sent = await msg.reply({ embeds: [errorEmbed('The sticker archive channel is missing or inaccessible — let staff know.')] });
    scheduleArchiveBotMessageSweep(sent);
    return;
  }

  const archivePost = await archiveChannel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setDescription(`🏷️ \`${name}\` — added by ${msg.author}`)
        .setImage(`attachment://${archiveFile.name}`),
    ],
    files: [archiveFile],
  });

  let sticker;
  try {
    sticker = await Sticker.create({
      ownerId: msg.author.id,
      guildId: msg.guild.id,
      nameDisplay: name,
      nameLower: name.toLowerCase(),
      sourceChannelId: archivePost.channel.id,
      sourceMessageId: archivePost.id,
      attachmentIndex: 0,
    });
  } catch (e) {
    // Roll back the archive post so a failed add doesn't leave an
    // orphaned image behind with nothing pointing at it.
    await archivePost.delete().catch(() => {});
    if (e.code === 11000) {
      const sent = await msg.reply({ embeds: [errorEmbed(`\`${name}\` is already taken by another sticker in this server. Try a different name.`)] });
      scheduleArchiveBotMessageSweep(sent);
      return;
    }
    throw e;
  }

  const confirmation = await msg.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setDescription(`✅ Saved as \`${sticker.nameDisplay}\`. Anyone can use it with \`!st ${sticker.nameDisplay}\`.`),
    ],
  });

  // Only relevant if the command happened to be invoked in the archive
  // channel itself — sweep our own confirmation out so it doesn't sit
  // next to the permanent archive post.
  if (inArchiveChannel) scheduleArchiveBotMessageSweep(confirmation);
}

// --- !st delete {name} ----------------------------------------------------
// Creator or staff only.
async function handleDelete(msg, args) {
  const name = args[1];

  if (!name) {
    await msg.reply({ embeds: [errorEmbed('Usage: `!st delete {name}`')] });
    return;
  }

  const sticker = await Sticker.findOne({ guildId: msg.guild.id, nameLower: name.toLowerCase() });
  if (!sticker) {
    await msg.reply({ embeds: [errorEmbed(`No sticker named \`${name}\` found.`)] });
    return;
  }

  if (sticker.ownerId !== msg.author.id && !isStaff(msg.member)) {
    await msg.reply({ embeds: [staffEmbed("You don't have permission to delete this sticker — only its creator or staff can.")] });
    return;
  }

  await Sticker.deleteOne({ _id: sticker._id });
  await msg.reply(`🗑️ Deleted \`${sticker.nameDisplay}\`.`);
}

// --- !st rename {old} {new} -----------------------------------------------
// Creator or staff only.
async function handleRename(msg, args) {
  const oldName = args[1];
  const newName = args[2];

  if (!oldName || !newName) {
    await msg.reply({ embeds: [errorEmbed('Usage: `!st rename {old_name} {new_name}`')] });
    return;
  }

  const err = nameError(newName);
  if (err) {
    await msg.reply({ embeds: [errorEmbed(err)] });
    return;
  }

  const sticker = await Sticker.findOne({ guildId: msg.guild.id, nameLower: oldName.toLowerCase() });
  if (!sticker) {
    await msg.reply({ embeds: [errorEmbed(`No sticker named \`${oldName}\` found.`)] });
    return;
  }

  if (sticker.ownerId !== msg.author.id && !isStaff(msg.member)) {
    await msg.reply({ embeds: [staffEmbed("You don't have permission to rename this sticker — only its creator or staff can.")] });
    return;
  }

  sticker.nameDisplay = newName;
  sticker.nameLower = newName.toLowerCase();

  try {
    await sticker.save();
  } catch (e) {
    if (e.code === 11000) {
      await msg.reply({ embeds: [errorEmbed(`\`${newName}\` is already taken by another sticker in this server.`)] });
      return;
    }
    throw e;
  }

  await msg.reply(`✏️ Renamed \`${oldName}\` to \`${newName}\`.`);
}

// --- !st collection [@user] -----------------------------------------------
// Shows the stickers a user has *created* — open to everyone, for any
// user, since usage is global and this is just attribution now.
const COLLECTION_PREV_ID = 'sticker_collection_prev';
const COLLECTION_NEXT_ID = 'sticker_collection_next';
const COLLECTION_LIFETIME_MS = 5 * 60 * 1000;

/**
 * Resolves each sticker on this page to a live image URL (the archive
 * post could theoretically be deleted out from under it) and renders it
 * as a masked markdown link on the sticker's name — clicking the name
 * opens the image directly. Stickers whose source can't be resolved
 * show a broken-link marker instead of a dead link.
 */
async function buildCollectionPage(user, stickers, pageIndex, client, cap) {
  const pageSize = config.collectionPageSize;
  const totalPages = Math.max(1, Math.ceil(stickers.length / pageSize));
  const pageStickers = stickers.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);

  const lines = await Promise.all(
    pageStickers.map(async (s) => {
      const attachment = await resolveStickerAttachment(client, s);
      if (!attachment) return `\`${s.nameDisplay}\` ⚠️ *(source missing)*`;
      return `[\`${s.nameDisplay}\`](${attachment.url})`;
    })
  );

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`Stickers created by ${user.username} (${stickers.length}/${cap})`)
    .setDescription(
      lines.length ? lines.join('\n') : 'No stickers created yet. Use `!st add {name}` to add one.'
    )
    .setFooter({ text: totalPages > 1 ? `Page ${pageIndex + 1} of ${totalPages}` : `${stickers.length} sticker${stickers.length === 1 ? '' : 's'}` });

  return { embed, totalPages };
}

function buildCollectionNavRow(pageIndex, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(COLLECTION_PREV_ID)
      .setLabel('◀ Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(pageIndex === 0),
    new ButtonBuilder()
      .setCustomId(COLLECTION_NEXT_ID)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(pageIndex >= totalPages - 1)
  );
}

/**
 * Sends the initial collection page and attaches a Previous/Next
 * collector, mirroring the pattern used for !help — invoker-locked,
 * buttons self-disable after 5 minutes idle.
 */
async function sendCollection(msg, user, stickers, client, cap) {
  let pageIndex = 0;
  const { embed, totalPages } = await buildCollectionPage(user, stickers, pageIndex, client, cap);

  const sent = await msg.reply({
    embeds: [embed],
    components: totalPages > 1 ? [buildCollectionNavRow(pageIndex, totalPages)] : [],
  });

  if (totalPages <= 1) return;

  const collector = sent.createMessageComponentCollector({ time: COLLECTION_LIFETIME_MS });

  collector.on('collect', async (interaction) => {
    if (interaction.user.id !== msg.author.id) {
      await interaction.reply({ content: "This isn't your menu.", ephemeral: true });
      return;
    }

    pageIndex += interaction.customId === COLLECTION_NEXT_ID ? 1 : -1;
    pageIndex = Math.max(0, Math.min(pageIndex, totalPages - 1));

    const page = await buildCollectionPage(user, stickers, pageIndex, client, cap);
    await interaction.update({ embeds: [page.embed], components: [buildCollectionNavRow(pageIndex, totalPages)] });
  });

  collector.on('end', () => {
    sent.edit({ components: [] }).catch(() => {});
  });
}

async function handleCollection(msg, args, client) {
  const target = msg.mentions.users.first() || msg.author;
  const cap = await getStickerCap(msg.guild.id);
  const stickers = await Sticker.find({ ownerId: target.id, guildId: msg.guild.id }).sort({ nameLower: 1 });
  await sendCollection(msg, target, stickers, client, cap);
}

// --- !st setcap {number} --------------------------------------------------
// Staff only — overrides the per-creator sticker cap for this guild.
async function handleSetCap(msg, args) {
  if (!isStaff(msg.member)) {
    await msg.reply({ embeds: [staffEmbed("You don't have permission to use this command.")] });
    return;
  }

  const raw = args[1];
  const cap = Number(raw);
  if (!raw || !Number.isInteger(cap) || cap < 1 || cap > 1000) {
    await msg.reply({ embeds: [errorEmbed('Usage: `!st setcap {number}` — an integer between 1 and 1000.')] });
    return;
  }

  await setStickerCap(msg.guild.id, cap);
  await msg.reply({
    embeds: [new EmbedBuilder().setColor(BRAND_COLOR).setDescription(`✅ Per-creator sticker cap set to **${cap}**.`)],
  });
}

// --- !st {name} — send a sticker ------------------------------------------
// Any sticker in the guild, sent by anyone — usage is global.
async function handleSend(msg, name, client) {
  const cooldown = checkStickerCooldown(msg.author.id);
  if (cooldown.onCooldown) {
    await msg.reply({ embeds: [errorEmbed(`Slow down — try again in ${cooldown.secondsRemaining}s.`)] }).then((m) => {
      setTimeout(() => m.delete().catch(() => {}), 5000);
    });
    return;
  }

  const sticker = await Sticker.findOne({ guildId: msg.guild.id, nameLower: name.toLowerCase() });
  if (!sticker) {
    await msg.reply({ embeds: [errorEmbed(`No sticker named \`${name}\` found. Check \`!st collection\`.`)] });
    return;
  }

  const attachment = await resolveStickerAttachment(client, sticker);
  if (!attachment) {
    sticker.broken = true;
    await sticker.save().catch(() => {});
    await msg.reply({ embeds: [errorEmbed(`⚠️ The archive copy of \`${sticker.nameDisplay}\` is missing. Ask its creator to \`!st add\` it again.`)] });
    return;
  }

  // No resizing here — the archive post already holds the right-sized
  // (or, for gifs, original) bytes from add-time. Just link straight to
  // it.
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setImage(attachment.url)
    .setFooter({ text: `Sent by ${msg.author.username}` });

  // If the invocation itself was a reply, forward that context so the
  // sticker appears to reply to the original message rather than the
  // (often deleted-later) invocation.
  const replyTarget = msg.reference?.messageId;

  await msg.channel.send({
    embeds: [embed],
    ...(replyTarget ? { reply: { messageReference: replyTarget, failIfNotExists: false } } : {}),
  });

  markStickerUsed(msg.author.id);

  if (sticker.broken) {
    sticker.broken = false;
    await sticker.save().catch(() => {});
  }
}

module.exports = {
  handleAdd,
  handleDelete,
  handleRename,
  handleCollection,
  handleSetCap,
  handleSend,
};
