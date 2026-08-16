const config = require('../config/yearSystem');

function isStaff(member) {
  return member.roles.cache.some((role) => config.staffRoleIds.includes(role.id));
}

module.exports = { isStaff };
