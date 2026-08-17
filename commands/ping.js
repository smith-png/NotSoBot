module.exports = {
  name: 'ping',
  description: 'Checks whether the bot is online and responsive.',
  usage: '!ping',
  access: 'Everyone',
  category: 'General',
  execute(msg) {
    msg.reply('Pong!');
  }
};
