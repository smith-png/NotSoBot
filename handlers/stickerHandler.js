const { EmbedBuilder } = require('discord.js');
const Sticker = require('../db/models/Sticker');
const StickerLog = require('../db/models/StickerLog');
const config = require('../config/stickers');
const { isStaff } = require('../utils/isStaff');
const { isValidStickerName, isReservedName, isAllowedAttachment } = require('../utils/stickerValidation');
const { checkStickerCooldown, markStickerUsed } = require('../utils/stickerCooldown');
const { resolveStickerAttachment } = require('../utils/stickerSource');
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
  if (msg.channel.id !== config.archiveChannelId) {
    await msg.reply({ embeds: [errorEmbed(`Post the image and run this in <#${config.archiveChannelId}>.`)] });
    return;
  }

  const name = args[1];
  const err = nameError(name);
  if (err) {
    await msg.reply({ embeds: [errorEmbed(err)] });
    return;
  }

  if (!msg.reference) {
    await msg.reply({ embeds: [errorEmbed('Reply to the message containing the image you want to save, with `!st add {name}`.')] });
    return;
  }

  const sourceMessage = await msg.channel.messages.fetch(msg.reference.messageId).catch(() => null);
  if (!sourceMessage) {
    await msg.reply({ embeds: [errorEmbed("Couldn't find the message you replied to — it may have been deleted.")] });
    return;
  }

  const attachment = sourceMessage.attachments.first();
  if (!attachment) {
    await msg.reply({ embeds: [errorEmbed('That message has no image attached.')] });
    return;
  }

  if (!isAllowedAttachment(attachment)) {
    await msg.reply({
      embeds: [
        errorEmbed(
          `That file isn't usable as a sticker. Allowed types: ${config.allowedExtensions.join(', ')}, max ${
            config.maxFileSizeBytes / (1024 * 1024)
          }MB.`
        ),
      ],
    });
    return;
  }

  const count = await Sticker.countDocuments({ ownerId: msg.author.id, guildId: msg.guild.id });
  if (count >= config.maxStickersPerUser) {
    await msg.reply({ embeds: [errorEmbed(`You've hit the ${config.maxStickersPerUser}-sticker limit. Delete one first with \`!st delete {name}\`.`)] });
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
      await msg.reply({ embeds: [errorEmbed(`You already have a sticker named \`${name}\`. Pick a different name or \`!st rename\` the old one.`)] });
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

  // Clean up the invocation + our own confirmation after a delay. We
  // deliberately do NOT delete the original source message — that's the
  // archive copy the sticker's stored reference points to, so deleting
  // it would break the sticker.
  setTimeout(() => {
    msg.delete().catch(() => {});
    confirmation.delete().catch(() => {});
  }, config.cleanupDelayMs);
}

// --- !st delete {name} [staff: !st delete @user {name}] ---------------
async function handleDelete(msg, args) {
  let ownerId = msg.author.id;
  let name = args[1];

  const mentioned = msg.mentions.users.first();
  if (mentioned) {
    if (!isStaff(msg.member)) {
      await msg.reply({ embeds: [staffEmbed("You don't have permission to delete another user's sticker.")] });
      return;
    }
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
async function buildCollectionEmbed(user, stickers) {
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`${user.username}'s Stickers (${stickers.length}/${config.maxStickersPerUser})`);

  if (!stickers.length) {
    embed.setDescription('No stickers saved yet. Use `!st add {name}` in the archive channel to add one.');
    return embed;
  }

  const lines = stickers
    .sort((a, b) => a.nameDisplay.localeCompare(b.nameDisplay))
    .map((s) => `\`${s.nameDisplay}\`${s.broken ? ' ⚠️ *(source missing)*' : ''}`);

  // Discord field value cap is 1024 chars — chunk if the list is long.
  const chunks = [];
  let current = '';
  for (const line of lines) {
    if ((current + '\n' + line).length > 1000) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);

  chunks.forEach((chunk, i) => embed.addFields({ name: i === 0 ? 'Stickers' : '\u200b', value: chunk }));

  return embed;
}

async function handleCollection(msg) {
  const stickers = await Sticker.find({ ownerId: msg.author.id, guildId: msg.guild.id });
  const embed = await buildCollectionEmbed(msg.author, stickers);
  await msg.reply({ embeds: [embed] });
}

async function handleList(msg) {
  if (!isStaff(msg.member)) {
    await msg.reply({ embeds: [staffEmbed("You don't have permission to use this command.")] });
    return;
  }

  const mentioned = msg.mentions.users.first();
  if (!mentioned) {
    await msg.reply({ embeds: [errorEmbed('Usage: `!st list @user`')] });
    return;
  }

  const stickers = await Sticker.find({ ownerId: mentioned.id, guildId: msg.guild.id });
  const embed = await buildCollectionEmbed(mentioned, stickers);
  await msg.reply({ embeds: [embed] });
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
    .setImage(attachment.url)
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
