const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const statusConfig = require('./config/status.js');
const connectDB = require('./db/connection');
const { handleYearButton } = require('./handlers/buttonHandler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// --- Load commands ---
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.name, command);
  }
}

// --- Load watchers ---
client.watchers = [];
const watchersPath = path.join(__dirname, 'watchers');
if (fs.existsSync(watchersPath)) {
  for (const file of fs.readdirSync(watchersPath).filter(f => f.endsWith('.js'))) {
    client.watchers.push(require(path.join(watchersPath, file)));
  }
}

const activityTypeMap = {
  PLAYING: ActivityType.Playing,
  WATCHING: ActivityType.Watching,
  LISTENING: ActivityType.Listening,
  COMPETING: ActivityType.Competing
};

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setActivity(statusConfig.text, {
    type: activityTypeMap[statusConfig.type] || ActivityType.Playing
  });
});

client.on('messageCreate', async msg => {
  if (msg.author.bot) return;

  for (const watcher of client.watchers) watcher.execute(msg, client);

  if (!msg.content.startsWith('!')) return;
  const args = msg.content.slice(1).split(' ');
  const commandName = args.shift();
  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command.execute(msg, args, client);
  } catch (err) {
    console.error(err);
    msg.reply('Something went wrong running that command.');
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    await handleYearButton(interaction);
  } catch (err) {
    console.error('[button] Error:', err);
  }
});

(async () => {
  await connectDB();
  await client.login(process.env.DISCORD_TOKEN);
})();
