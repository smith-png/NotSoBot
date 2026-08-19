const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Sticker = require('../db/models/Sticker');
const StickerLog = require('../db/models/StickerLog');
const config = require('../config/stickers');
const { isStaff } = require('../utils/isStaff');
const { isValidStickerName, isReservedName, isAllowedAttachment } = require('../utils/stickerValidation');
const { checkStickerCooldown, markStickerUsed } = require('../utils/stickerCooldown');
const { resolveStickerAttachment, withStickerSize } = require('../utils/stickerSource');
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

// --- !st add {name} ---------------------------------------------------
async function handleAdd(msg, args) {
  const inArchiveChannel = msg.channel.id === config.archiveChannelId;

  // Command still runs anywhere — this is just a nudge, not a gate. The
  // reminder is sent in the invocation channel and is never swept, so
  // it stays visible (unlike the archive-channel cleanup below, which
  // only ever applies inside the archive channel itself).
  if (!inArchiveChannel) {
    await msg.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(BRAND_COLOR)
          .setDescription(`💡 Tip: run \`!st add\` in <#${config.archiveChannelId}> so the source image sticks around long-term.`),
      ],
    });
  }

  const name = args[1];
  const err = nameError(name);
  if (err) {
    const sent = await msg.reply({ embeds: [errorEmbed(err)] });
    scheduleArchiveBotMessageSweep(sent);
    return;
  }

  // Prefer an image attached directly to this message. Falls back to
  // replying to a message that has one, so both flows work:
  //   !st add {name}          (image attached right here)
  //   [reply to an image] !st add {name}
  let sourceMessage = msg;
  let attachment = msg.attachments.first();

  if (!attachment) {
    if (!msg.reference) {
      const sent = await msg.reply({
        embeds: [errorEmbed('Attach the image to this message, or reply to a message that has one, with `!st add {name}`.')],
      });
      scheduleArchiveBotMessageSweep(sent);
      return;
    }

    sourceMessage = await msg.channel.messages.fetch(msg.reference.messageId).catch(() => null);
    if (!sourceMessage) {
      const sent = await msg.reply({ embeds: [errorEmbed("Couldn't find the message you replied to — it may have been deleted.")] });
      scheduleArchiveBotMessageSweep(sent);
      return;
    }

    attachment = sourceMessage.attachments.first();
    if (!attachment) {
      const sent = await msg.reply({ embeds: [errorEmbed('That message has no image attached.')] });
      scheduleArchiveBotMessageSweep(sent);
      return;
    }
  }

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

  const count = await Sticker.countDocuments({ ownerId: msg.author.id, guildId: msg.guild.id });
  if (count >= config.maxStickersPerUser) {
    const sent = await msg.reply({
      embeds: [errorEmbed(`You've hit the ${config.maxStickersPerUser}-sticker limit. Delete one first with \`!st delete {name}\`.`)],
    });
    scheduleArchiveBotMessageSweep(sent);
    return;
  }

  let sticker;
  try {
    sticker = await Sticker.create({
      ownerId: msg.author.id,
      guildId: msg.guild.id,
      nameDisplay: name,
      nameLower: name.toLowerCase(),
      sourceChannelId: sourceMessage.channel.id,
      sourceMessageId: sourceMessage.id,
      // Keyed off the attachment's own snowflake ID rather than object
      // reference/array position — more robust if attachments are ever
      // re-ordered or re-fetched.
      attachmentIndex: [...sourceMessage.attachments.keys()].indexOf(attachment.id),
    });
  } catch (e) {
    if (e.code === 11000) {
      const sent = await msg.reply({
        embeds: [errorEmbed(`You already have a sticker named \`${name}\`. Pick a different name or \`!st rename\` the old one.`)],
      });
      scheduleArchiveBotMessageSweep(sent);
      return;
    }
    throw e;
  }

  const confirmation = await msg.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setDescription(`✅ Saved as \`${sticker.nameDisplay}\`. Use it with \`!st ${sticker.nameDisplay}\`.`),
    ],
  });

  // We never delete the invocation message ourselves — the archive-
  // channel sweep (index.js) already keeps it if it's a valid command
  // or carries an image, and outside the archive channel there's
  // nothing to clean up. We do, however, always sweep our own
  // confirmation out of the archive channel — it doesn't carry an
  // image/gif itself, so it never earns a permanent place there.
  scheduleArchiveBotMessageSweep(confirmation);
}

// --- !st delete {name} [!st delete @user {name}] -----------------------
// Open to everyone — anyone can delete anyone's sticker, not just staff.
async function handleDelete(msg, args) {
  let ownerId = msg.author.id;
  let name = args[1];

  const mentioned = msg.mentions.users.first();
  if (mentioned) {
    ownerId = mentioned.id;
    name = args[2];
  }

  if (!name) {
    await msg.reply({ embeds: [errorEmbed('Usage: `!st delete {name}`')] });
    return;
  }

  const deleted = await Sticker.findOneAndDelete({
    ownerId,
    guildId: msg.guild.id,
    nameLower: name.toLowerCase(),
  });

  if (!deleted) {
    await msg.reply({ embeds: [errorEmbed(`No sticker named \`${name}\` found.`)] });
    return;
  }

  await msg.reply(`🗑️ Deleted \`${deleted.nameDisplay}\`.`);
}

// --- !st rename {old} {new} --------------------------------------------
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

  const sticker = await Sticker.findOne({ ownerId: msg.author.id, guildId: msg.guild.id, nameLower: oldName.toLowerCase() });
  if (!sticker) {
    await msg.reply({ embeds: [errorEmbed(`No sticker named \`${oldName}\` found.`)] });
    return;
  }

  sticker.nameDisplay = newName;
  sticker.nameLower = newName.toLowerCase();

  try {
    await sticker.save();
  } catch (e) {
    if (e.code === 11000) {
      await msg.reply({ embeds: [errorEmbed(`You already have a sticker named \`${newName}\`.`)] });
      return;
    }
    throw e;
  }

  await msg.reply(`✏️ Renamed \`${oldName}\` to \`${newName}\`.`);
}

// --- !st steal [name] ---------------------------------------------------
async function handleSteal(msg, args) {
  if (!msg.reference) {
    await msg.reply({ embeds: [errorEmbed('Reply to a message the bot sent containing a sticker to steal it.')] });
    return;
  }

  const targetMessage = await msg.channel.messages.fetch(msg.reference.messageId).catch(() => null);
  if (!targetMessage || targetMessage.author.id !== msg.client.user.id) {
    await msg.reply({ embeds: [errorEmbed('That message was not a sticker sent by this bot.')] });
    return;
  }

  const log = await StickerLog.findOne({ messageId: targetMessage.id });
  if (!log) {
    await msg.reply({ embeds: [errorEmbed("Couldn't identify a sticker on that message.")] });
    return;
  }

  const source = await Sticker.findById(log.stickerId);
  if (!source) {
    await msg.reply({ embeds: [errorEmbed('The original sticker no longer exists.')] });
    return;
  }

  const requestedName = args[1];
  const name = requestedName || source.nameDisplay;

  const err = nameError(name);
  if (err) {
    await msg.reply({ embeds: [errorEmbed(err)] });
    return;
  }

  const count = await Sticker.countDocuments({ ownerId: msg.author.id, guildId: msg.guild.id });
  if (count >= config.maxStickersPerUser) {
    await msg.reply({ embeds: [errorEmbed(`You've hit the ${config.maxStickersPerUser}-sticker limit. Delete one first with \`!st delete {name}\`.`)] });
    return;
  }

  try {
    const stolen = await Sticker.create({
      ownerId: msg.author.id,
      guildId: msg.guild.id,
      nameDisplay: name,
      nameLower: name.toLowerCase(),
      sourceChannelId: source.sourceChannelId,
      sourceMessageId: source.sourceMessageId,
      attachmentIndex: source.attachmentIndex,
    });
    await msg.reply(`✅ Added \`${stolen.nameDisplay}\` to your collection.`);
  } catch (e) {
    if (e.code === 11000) {
      await msg.reply({ embeds: [errorEmbed(`You already have a sticker named \`${name}\`. Try \`!st steal {new_name}\` to pick a different one.`)] });
      return;
    }
    throw e;
  }
}

// --- !st collection [staff: !st list @user] -----------------------------
const COLLECTION_PREV_ID = 'sticker_collection_prev';
const COLLECTION_NEXT_ID = 'sticker_collection_next';
const COLLECTION_LIFETIME_MS = 5 * 60 * 1000;

/**
 * Resolves each sticker on this page to a live image URL (source
 * messages can move/get deleted, so we re-fetch rather than trust a
 * stored link) and renders it as a masked markdown link on the
 * sticker's name — clicking the name opens the image directly.
 * Stickers whose source can't be resolved show a broken-link marker
 * instead of a dead link.
 */
async function buildCollectionPage(user, stickers, pageIndex, client) {
  const pageSize = config.collectionPageSize;
  const totalPages = Math.max(1, Math.ceil(stickers.length / pageSize));
  const pageStickers = stickers.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);

  const lines = await Promise.all(
    pageStickers.map(async (s) => {
      const attachment = await resolveStickerAttachment(client, s);
      if (!attachment) return `\`${s.nameDisplay}\` ⚠️ *(source missing)*`;
      return `[\`${s.nameDisplay}\`](${withStickerSize(attachment.url)})`;
    })
  );

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`${user.username}'s Stickers (${stickers.length}/${config.maxStickersPerUser})`)
    .setDescription(
      lines.length ? lines.join('\n') : 'No stickers saved yet. Use `!st add {name}` to add one.'
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
async function sendCollection(msg, user, stickers, client) {
  let pageIndex = 0;
  const { embed, totalPages } = await buildCollectionPage(user, stickers, pageIndex, client);

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

    const page = await buildCollectionPage(user, stickers, pageIndex, client);
    await interaction.update({ embeds: [page.embed], components: [buildCollectionNavRow(pageIndex, totalPages)] });
  });

  collector.on('end', () => {
    sent.edit({ components: [] }).catch(() => {});
  });
}

async function handleCollection(msg, args, client) {
  const stickers = await Sticker.find({ ownerId: msg.author.id, guildId: msg.guild.id }).sort({ nameLower: 1 });
  await sendCollection(msg, msg.author, stickers, client);
}

async function handleList(msg, args, client) {
  if (!isStaff(msg.member)) {
    await msg.reply({ embeds: [staffEmbed("You don't have permission to use this command.")] });
    return;
  }

  const mentioned = msg.mentions.users.first();
  if (!mentioned) {
    await msg.reply({ embeds: [errorEmbed('Usage: `!st list @user`')] });
    return;
  }

  const stickers = await Sticker.find({ ownerId: mentioned.id, guildId: msg.guild.id }).sort({ nameLower: 1 });
  await sendCollection(msg, mentioned, stickers, client);
}

// --- !st {name} — send a sticker ----------------------------------------
async function handleSend(msg, name, client) {
  const cooldown = checkStickerCooldown(msg.author.id);
  if (cooldown.onCooldown) {
    await msg.reply({ embeds: [errorEmbed(`Slow down — try again in ${cooldown.secondsRemaining}s.`)] }).then((m) => {
      setTimeout(() => m.delete().catch(() => {}), 5000);
    });
    return;
  }

  const sticker = await Sticker.findOne({ ownerId: msg.author.id, guildId: msg.guild.id, nameLower: name.toLowerCase() });
  if (!sticker) {
    await msg.reply({ embeds: [errorEmbed(`No sticker named \`${name}\` found. Check \`!st collection\`.`)] });
    return;
  }

  const attachment = await resolveStickerAttachment(client, sticker);
  if (!attachment) {
    sticker.broken = true;
    await sticker.save().catch(() => {});
    await msg.reply({ embeds: [errorEmbed(`⚠️ The source image for \`${sticker.nameDisplay}\` is missing. Please re-add it with \`!st add\`.`)] });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setImage(withStickerSize(attachment.url))
    .setFooter({ text: `Sent by ${msg.author.username}` });

  // If the invocation itself was a reply, forward that context so the
  // sticker appears to reply to the original message rather than the
  // (often deleted-later) invocation.
  const replyTarget = msg.reference?.messageId;

  const sent = await msg.channel.send({
    embeds: [embed],
    ...(replyTarget ? { reply: { messageReference: replyTarget, failIfNotExists: false } } : {}),
  });

  markStickerUsed(msg.author.id);

  await StickerLog.create({ messageId: sent.id, stickerId: sticker._id, guildId: msg.guild.id }).catch(() => {});

  if (sticker.broken) {
    sticker.broken = false;
    await sticker.save().catch(() => {});
  }
}

module.exports = {
  handleAdd,
  handleDelete,
  handleRename,
  handleSteal,
  handleCollection,
  handleList,
  handleSend,
};
