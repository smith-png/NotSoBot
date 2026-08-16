// Central config for the year-role system.
// Fill in real role IDs and staff role IDs once you've created the roles on Discord.

module.exports = {
  prefix: process.env.PREFIX || '!',

  // Map of year label -> Discord role ID
  yearRoles: {
    '1st': 'ROLE_ID_1ST_YEAR',
    '2nd': 'ROLE_ID_2ND_YEAR',
    '3rd': 'ROLE_ID_3RD_YEAR',
    '4th': 'ROLE_ID_4TH_YEAR',
  },

  // Discord role IDs allowed to run admin commands (setyear, cooldown set/reset, exportyears)
  staffRoleIds: [
    'ROLE_ID_GS',
    'ROLE_ID_IT_DEPT',
    'ROLE_ID_MODERATOR',
  ],

  // Default cooldown in minutes, used only if not yet set in DB
  defaultCooldownMinutes: 60,

  // Channel where the persistent year-select embed will be posted (optional, used by postyearembed)
  verifyChannelId: 'CHANNEL_ID_HERE',
};
