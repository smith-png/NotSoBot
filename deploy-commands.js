// Run this once whenever slash commands are added or changed:
//   DISCORD_TOKEN=... CLIENT_ID=... GUILD_ID=... node deploy-commands.js
//
// CLIENT_ID = your application's ID (Discord Developer Portal → General Information)
// GUILD_ID  = your server's ID (right-click server icon with Developer Mode on → Copy Server ID)
//
// This is NOT part of the bot's normal startup — it only needs to run again if you
// add a new slash command or change an existing one's options.

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commandsPath = path.join(__dirname, 'commands');
const slashCommands = [];

for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  if (command.slashData) {
    slashCommands.push(command.slashData.toJSON());
  }
}

if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
  console.error('Missing DISCORD_TOKEN, CLIENT_ID, or GUILD_ID environment variable.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Registering ${slashCommands.length} slash command(s): ${slashCommands.map((c) => c.name).join(', ')}`);
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: slashCommands }
    );
    console.log('Slash commands registered successfully.');
  } catch (err) {
    console.error('Failed to register slash commands:', err);
  }
})();
