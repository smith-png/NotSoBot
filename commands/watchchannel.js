const isAdmin = require('../utils/isAdmin');
const watchedChannels = require('../utils/watchedChannels');
const { errorEmbed, staffEmbed } = require('../utils/embedReplies');

// Accepts a channel mention (<#123>), a raw ID, or nothing (defaults to
// the channel the command was run in).
function resolveChannelId(msg, arg) {
  if (!arg) return msg.channel.id;
  const mentionMatch = arg.match(/^<#(\d+)>$/);
  if (mentionMatch) return mentionMatch[1];
  if (/^\d+$/.test(arg)) return arg;
  return null;
}

module.exports = {
  name: 'watchchannel',
  description: 'Adds, removes, or lists channels the Instagram link watcher monitors.',
  usage: '!watchchannel add|remove|list [#channel]',
  access: 'Admin',
  category: 'Admin & Owner Tools',
  async execute(msg, args) {
    if (!isAdmin(msg)) return msg.reply({ embeds: [staffEmbed("You don't have permission to use this.")] });

    const sub = (args[0] || '').toLowerCase();

    if (sub === 'add') {
      const channelId = resolveChannelId(msg, args[1]);
      if (!channelId) {
        return msg.reply({ embeds: [errorEmbed('Give me a channel mention or ID, or run this in the channel you want to add.')] });
      }
      const added = watchedChannels.add(channelId);
      return msg.reply(
        added ? `✅ Now watching <#${channelId}> for Instagram links.` : `<#${channelId}> is already being watched.`
      );
    }

    if (sub === 'remove') {
      const channelId = resolveChannelId(msg, args[1]);
      if (!channelId) {
        return msg.reply({ embeds: [errorEmbed('Give me a channel mention or ID, or run this in the channel you want to remove.')] });
      }
      const removed = watchedChannels.remove(channelId);
      return msg.reply(removed ? `🛑 Stopped watching <#${channelId}>.` : `<#${channelId}> wasn't being watched.`);
    }

    if (sub === 'list') {
      const channels = watchedChannels.list();
      if (!channels.length) return msg.reply({ embeds: [errorEmbed('No channels are currently being watched.')] });
      return msg.reply(`**Watching:**\n${channels.map(id => `<#${id}>`).join('\n')}`);
    }

    return msg.reply({
      embeds: [
        errorEmbed(
          'Usage: `!watchchannel add [#channel]`, `!watchchannel remove [#channel]`, or `!watchchannel list`.\n' +
            'Omit the channel to default to the one you ran the command in.'
        ),
      ],
    });
  }
};
