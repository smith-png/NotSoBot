// True for the hardcoded bot owner OR any member with Manage Server
// permission in the guild the message was sent in.
const { PermissionFlagsBits } = require('discord.js');
const isOwner = require('./isOwner');

module.exports = function isAdmin(msg) {
  if (isOwner(msg.author.id)) return true;
  if (!msg.member) return false;
  return msg.member.permissions.has(PermissionFlagsBits.ManageGuild);
};
