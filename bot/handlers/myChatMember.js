
const User = require('../../backend/models/User');
const Group = require('../../backend/models/Group');

module.exports = async (ctx) => {
  const update = ctx.update.my_chat_member;
  const chat = update.chat;

  // Only handle when added to a group
  if (chat.type.includes('group') && update.new_chat_member.status === 'administrator') {
    const groupId = String(chat.id);
    const groupTitle = chat.title;
    const userTelegramId = String(update.from.id);

    // Ensure user exists
    let user = await User.findOne({ telegramId: userTelegramId });
    if (!user) {
      user = await User.create({
        telegramId: userTelegramId,
        username: update.from.username,
        firstName: update.from.first_name,
        lastName: update.from.last_name,
        isGroupOwner: true,
      });
    }

    // Save group if new
    let group = await Group.findOne({ groupId });
    if (!group) {
      group = await Group.create({
        groupId,
        groupTitle,
        owner: user._id,
      });
    }

    await ctx.telegram.sendMessage(
      userTelegramId,
      `✅ Bot added to group "${groupTitle}". Now complete the setup with /configure`
    );
  }
};
