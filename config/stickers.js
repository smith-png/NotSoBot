// Central config for the personal sticker collection system.

module.exports = {
  // Channel where users must post the source image before running !st add.
  // Fill in the real #stickers-archive channel ID.
  archiveChannelId: process.env.STICKER_ARCHIVE_CHANNEL_ID || 'CHANNEL_ID_HERE',

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

  // How long to leave the confirmation embed up before cleaning up the
  // invocation + confirmation messages after a successful !st add.
  cleanupDelayMs: 30 * 1000,
};
