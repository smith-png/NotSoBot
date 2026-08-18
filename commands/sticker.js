const {
  handleAdd,
  handleDelete,
  handleRename,
  handleSteal,
  handleCollection,
  handleList,
  handleSend,
} = require('../handlers/stickerHandler');
const { isValidStickerName, isReservedName } = require('../utils/stickerValidation');
const { errorEmbed } = require('../utils/embedReplies');

const SUBCOMMANDS = new Set(['add', 'delete', 'rename', 'steal', 'collection', 'list']);

module.exports = {
  name: 'st',
  description: 'Personal sticker collection — save images and reuse them anywhere in the server.',
  usage: '!st add {name} | !st {name} | !st collection | !st delete {name} | !st rename {old} {new} | !st steal {name}',
  access: 'Everyone (add/steal require the archive channel; delete/list for others requires Staff)',
  category: 'Stickers',

  async execute(msg, args, client) {
    if (!msg.guild) {
      await msg.reply({ embeds: [errorEmbed("This command only works in a server, not DMs.")] });
      return;
    }

    const sub = (args[0] || '').toLowerCase();

    try {
      if (sub === 'add') return await handleAdd(msg, args);
      if (sub === 'delete') return await handleDelete(msg, args);
      if (sub === 'rename') return await handleRename(msg, args);
      if (sub === 'steal') return await handleSteal(msg, args);
      if (sub === 'collection') return await handleCollection(msg);
      if (sub === 'list') return await handleList(msg);

      // Anything else is treated as "send this sticker by name".
      const name = args[0];
      if (!name) {
        await msg.reply({
          embeds: [
            errorEmbed(
              'Usage:\n' +
                '`!st add {name}` — reply to an image in the archive channel\n' +
                '`!st {name}` — send a saved sticker\n' +
                '`!st collection` — list your stickers\n' +
                '`!st delete {name}` / `!st rename {old} {new}` / `!st steal {name}`'
            ),
          ],
        });
        return;
      }
      if (isReservedName(name) || !isValidStickerName(name)) {
        await msg.reply({
          embeds: [errorEmbed(`\`${name}\` isn't a valid sticker name or command. Run \`!help st\` for usage.`)],
        });
        return;
      }

      await handleSend(msg, name, client);
    } catch (err) {
      console.error('[st] Error:', err);
      await msg.reply({ embeds: [errorEmbed('Something went wrong with that sticker command.')] }).catch(() => {});
    }
  },
};
