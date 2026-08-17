const ExcelJS = require('exceljs');
const { AttachmentBuilder } = require('discord.js');
const { isStaff } = require('../utils/isStaff');
const UserYear = require('../db/models/UserYear');

module.exports = {
  name: 'exportyears',
  description: 'Exports all registered users and their years to an Excel sheet.',
  usage: '!exportyears',
  access: 'Staff',
  category: 'Year System',
  async execute(message, args) {
    if (!isStaff(message.member)) {
      await message.reply("You don't have permission to use this command.");
      return;
    }

    const records = await UserYear.find({}).lean();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Year Roles');

    sheet.columns = [
      { header: 'Username', key: 'username', width: 25 },
      { header: 'User ID', key: 'userId', width: 22 },
      { header: 'Current Year', key: 'currentYear', width: 14 },
      { header: 'Last Changed', key: 'lastChanged', width: 22 },
      { header: 'Set By', key: 'setBy', width: 20 },
    ];

    for (const record of records) {
      let username = 'Unknown / left server';
      try {
        const member = await message.guild.members.fetch(record.userId);
        username = member.user.tag;
      } catch (_) {
        // member no longer in guild, keep fallback
      }

      let setByDisplay = record.setBy;
      if (record.setBy !== 'self') {
        try {
          const setByMember = await message.guild.members.fetch(record.setBy);
          setByDisplay = `admin: ${setByMember.user.tag}`;
        } catch (_) {
          setByDisplay = `admin: ${record.setBy}`;
        }
      }

      sheet.addRow({
        username,
        userId: record.userId,
        currentYear: record.currentYear,
        lastChanged: new Date(record.lastChanged).toLocaleString(),
        setBy: setByDisplay,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const attachment = new AttachmentBuilder(Buffer.from(buffer), { name: 'year-roles-export.xlsx' });

    await message.reply({ content: 'Here is the current year-role export:', files: [attachment] });
  },
};
