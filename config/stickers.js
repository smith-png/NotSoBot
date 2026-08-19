// Central config for the personal sticker collection system.

module.exports = {
  // Channel where users must post the source image before running !st add.
  // Fill in the real #stickers-archive channel ID.
  archiveChannelId: process.env.STICKER_ARCHIVE_CHANNEL_ID || '1538894115364671579',

  // Hard cap per user, enforced server-side (not just documented).
  maxStickersPerUser: 69,

  // Anti-spam cooldown between !st sends, per user. In-memory only (not
  // persisted) — resets on bot restart, which is an acceptable tradeoff
  // for a lightweight anti-spam measure.
  cooldownSeconds: 5,

  maxFileSizeBytes: 8 * 1024 * 1024, // 8 MB
  allowedExtensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'],

  // Subcommand words a sticker can never be named, to avoid ambiguity
  // with `!st {name}`.
  reservedNames: ['add', 'delete', 'rename', 'steal', 'collection', 'list', 'help'],

  // How many stickers to show per page in the paginated collection embed.
  collectionPageSize: 10,

  // Discord's standard sticker canvas size (px). Appended as a `size`
  // query param to every sticker image URL we post so previews render at
  // a consistent, predictable resolution regardless of the original
  // upload's dimensions.
  stickerImageSize: 320,

  // How long the bot's own replies (confirmations, errors, reminders)
  // stay visible in the archive channel before being swept — the archive
  // channel is kept clean of everything except valid command invocations
  // and image/gif sources, and the bot's own messages never qualify to
  // stay.
  archiveBotMessageLifetimeMs: 5 * 1000,
};
