const Group = require('../../backend/models/Group');

module.exports = async (ctx) => {
  const telegramId = String(ctx.from.id);

  const groups = await Group.find({}).populate('owner');
  const userGroups = groups.filter(
    (g) => g.owner && String(g.owner.telegramId) === telegramId
  );

  if (userGroups.length === 0) {
    return ctx.reply("⚠️ You haven't added me to any groups yet. Please add me to a group as admin first.");
  }

  const buttons = userGroups.map((group) => [
    {
      text: group.groupTitle,
      callback_data: `settings_group_${group.groupId}`,
    },
  ]);

  ctx.session.step = 'awaiting_group_selection';

  return ctx.reply('🔧 Please select a group to configure settings for:', {
    reply_markup: {
      inline_keyboard: buttons,
    },
  });
};
