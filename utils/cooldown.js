const Settings = require('../db/models/Settings');
const UserYear = require('../db/models/UserYear');
const config = require('../config/yearSystem');

async function getCooldownMinutes() {
  let settings = await Settings.findById('settings');
  if (!settings) {
    settings = await Settings.create({ _id: 'settings', cooldownMinutes: config.defaultCooldownMinutes });
  }
  return settings.cooldownMinutes;
}

async function setCooldownMinutes(minutes) {
  return Settings.findByIdAndUpdate(
    'settings',
    { cooldownMinutes: minutes },
    { upsert: true, new: true }
  );
}

/**
 * Checks whether a user is currently on cooldown.
 * Returns { onCooldown: boolean, minutesRemaining: number }
 */
async function checkCooldown(userId) {
  const record = await UserYear.findOne({ userId });
  if (!record) {
    return { onCooldown: false, minutesRemaining: 0 };
  }

  const cooldownMinutes = await getCooldownMinutes();
  const elapsedMs = Date.now() - new Date(record.lastChanged).getTime();
  const elapsedMinutes = elapsedMs / 1000 / 60;

  if (elapsedMinutes >= cooldownMinutes) {
    return { onCooldown: false, minutesRemaining: 0 };
  }

  return {
    onCooldown: true,
    minutesRemaining: Math.ceil(cooldownMinutes - elapsedMinutes),
  };
}

/** Clears a user's cooldown by resetting lastChanged far enough in the past. */
async function resetCooldown(userId) {
  return UserYear.findOneAndUpdate(
    { userId },
    { lastChanged: new Date(0) },
    { new: true }
  );
}

module.exports = {
  getCooldownMinutes,
  setCooldownMinutes,
  checkCooldown,
  resetCooldown,
};
