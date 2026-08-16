const config = require('../config/yearSystem');
const UserYear = require('../db/models/UserYear');

/**
 * Swaps a member's year role: removes any existing year role(s), adds the new one,
 * and upserts the DB record.
 *
 * @param {GuildMember} member - the Discord member to update
 * @param {string} year - one of '1st' | '2nd' | '3rd' | '4th'
 * @param {string} setBy - 'self' or the admin's user ID who triggered this
 */
async function swapYearRole(member, year, setBy = 'self') {
  const targetRoleId = config.yearRoles[year];
  if (!targetRoleId) {
    throw new Error(`Unknown year "${year}" — check config.yearRoles`);
  }

  const allYearRoleIds = Object.values(config.yearRoles);

  // Remove any existing year role(s) the member currently holds (sequential, not parallel)
  const rolesToRemove = member.roles.cache.filter((role) => allYearRoleIds.includes(role.id));
  for (const role of rolesToRemove.values()) {
    await member.roles.remove(role.id);
  }

  // Add the new role
  await member.roles.add(targetRoleId);

  // Upsert DB record
  const record = await UserYear.findOneAndUpdate(
    { userId: member.id },
    {
      userId: member.id,
      guildId: member.guild.id,
      currentYear: year,
      lastChanged: new Date(),
      setBy,
    },
    { upsert: true, new: true }
  );

  return record;
}

module.exports = { swapYearRole };
