const {
  handleAdd,
  handleDelete,
  handleRename,
  handleCollection,
  handleSetCap,
  handleSend,
} = require('../handlers/stickerHandler');
const { isValidStickerName, isReservedName } = require('../utils/stickerValidation');
const { errorEmbed } = require('../utils/embedReplies');

const SUBCOMMANDS = new Set(['add', 'delete', 'rename', 'collection', 'setcap']);

module.exports = {
  name: 'st',
  description: 'Server sticker library — anyone can add a sticker and anyone can use one.',
  usage: '!st add {name} | !st {name} | !st collection [@user] | !st delete {name} | !st rename {old} {new} | !st setcap {number}',
  access: 'Everyone (add/send/collection); delete/rename require the creator or Staff; setcap requires Staff',
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
      if (sub === 'collection') return await handleCollection(msg, args, client);
      if (sub === 'setcap') return await handleSetCap(msg, args);

      // Anything else is treated as "send this sticker by name".
      const name = args[0];
      if (!name) {
        await msg.reply({
          embeds: [
            errorEmbed(
              'Usage:\n' +
                '`!st add {name}` — attach an image/gif, paste a link, or reply to one\n' +
                '`!st {name}` — send any sticker in the server\n' +
                '`!st collection [@user]` — see who created what\n' +
                '`!st delete {name}` / `!st rename {old} {new}` — creator or Staff only'
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
