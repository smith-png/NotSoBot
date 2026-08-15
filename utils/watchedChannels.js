// Persists the list of channel IDs the Instagram-link watcher should act
// in. Stored as a flat JSON file on disk so it survives bot restarts.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'watchedChannels.json');

// Seeds the original hardcoded channel so behavior doesn't change for
// existing servers until an admin explicitly edits the list.
const DEFAULT_CHANNELS = ['832881742251032576'];

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_CHANNELS, null, 2));
  }
}

function load() {
  ensureFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : DEFAULT_CHANNELS;
  } catch (err) {
    console.error('watchedChannels: failed to read data file, falling back to defaults:', err.message);
    return DEFAULT_CHANNELS;
  }
}

function save(channels) {
  ensureFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(channels, null, 2));
}

module.exports = {
  list() {
    return load();
  },
  isWatched(channelId) {
    return load().includes(channelId);
  },
  add(channelId) {
    const channels = load();
    if (channels.includes(channelId)) return false;
    channels.push(channelId);
    save(channels);
    return true;
  },
  remove(channelId) {
    const channels = load();
    if (!channels.includes(channelId)) return false;
    save(channels.filter(id => id !== channelId));
    return true;
  }
};
