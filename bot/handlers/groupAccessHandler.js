const Payment = require('../../backend/models/Payment');
const Group = require('../../backend/models/Group');

// ⏳ Used to calculate when a subscription expires
function calculateExpiration(duration, startDate = new Date()) {
  const result = { expiresAt: new Date(startDate) };

  switch (duration) {
    case 'monthly': result.expiresAt.setMonth(result.expiresAt.getMonth() + 1); break;
    case 'quarterly': result.expiresAt.setMonth(result.expiresAt.getMonth() + 3); break;
    case 'biannually': result.expiresAt.setMonth(result.expiresAt.getMonth() + 6); break;
    case 'annually': result.expiresAt.setFullYear(result.expiresAt.getFullYear() + 1); break;
    default: result.expiresAt.setMonth(result.expiresAt.getMonth() + 1);
  }

  return result;
}

// 🔐 Enforces access control for any new user
async function enforceAccess(telegram, userId, chatId) {
  console.log(`🔍 Checking access for user ${userId} in group ${chatId}`);

  try {
    const activePayment = await Payment.findOne({
      telegramId: userId,
      group: chatId,
      status: 'paid',
      subscriptionStatus: 'active',
      expiresAt: { $gt: new Date() }
    });

    if (activePayment) {
      console.log(`✅ Access allowed: user ${userId} has an active subscription`);
    } else {
      console.log(`🚫 No valid subscription found for ${userId}, kicking...`);
      await telegram.banChatMember(chatId, userId);

      const group = await Group.findOne({ groupId: chatId });
      const subLink = group?.subLink || `https://subchatpro.com/subscribe?group=${chatId}`;

      try {
        await telegram.sendMessage(
          userId,
          `⛔ Access Denied\n\nYou need an active subscription to join this group.\n\nPlease subscribe here: ${subLink}`,
          { disable_web_page_preview: true }
        );
      } catch (err) {
        console.error(`❌ Failed to notify user ${userId}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`❌ Error checking access for ${userId}:`, err.message);
  }
}

// 📥 Triggered when user sends a join request (button click)
async function handleJoinRequest(ctx) {
  const userId = String(ctx.from.id);
  const chatId = String(ctx.chat.id);
  console.log(`📥 Join request from user ${userId} to group ${chatId}`);

  try {
    const activePayment = await Payment.findOne({
      telegramId: userId,
      group: chatId,
      status: 'paid',
      subscriptionStatus: 'active',
      expiresAt: { $gt: new Date() }
    });

    if (activePayment) {
      await ctx.approveChatJoinRequest();
      console.log(`✅ Approved join request for user ${userId} in group ${chatId}`);
    } else {
      await ctx.declineChatJoinRequest();
      console.log(`🚫 Declined join request for user ${userId}`);

      const group = await Group.findOne({ groupId: chatId });
      const subLink = group?.subLink || `https://subchatpro.com/subscribe?group=${chatId}`;

      try {
        await ctx.telegram.sendMessage(
          userId,
          `⛔ Access Denied\n\nYou need an active subscription to join this group.\n\nPlease subscribe here: ${subLink}`,
          { disable_web_page_preview: true }
        );
      } catch (err) {
        console.error(`❌ Failed to notify user ${userId}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`❌ Error handling join request:`, err.message);
  }
}

// 🧹 Periodic task that checks for expired subscriptions
async function checkSubscriptions(bot) {
  console.log('⏱️ Running scheduled subscription check...');
  const now = new Date();

  const expiredPayments = await Payment.find({
    $or: [
      { status: { $ne: 'paid' } },
      { subscriptionStatus: { $ne: 'active' } },
      { expiresAt: { $lte: now } }
    ]
  });

  for (const payment of expiredPayments) {
    try {
      const member = await bot.telegram.getChatMember(payment.group, payment.telegramId);

      if (member.status !== 'left' && member.status !== 'kicked') {
        await bot.telegram.banChatMember(payment.group, payment.telegramId);
        console.log(`🚫 Banned user ${payment.telegramId} from group ${payment.group}`);

        try {
          await bot.telegram.sendMessage(
            payment.telegramId,
            `⛔ Your access to the group has been revoked\n\nReason: Subscription expired\n\nPlease renew your subscription.`
          );
        } catch (err) {
          console.error('❌ Could not notify user:', err.message);
        }
      }

      payment.subscriptionStatus = 'expired';
      await payment.save();
    } catch (error) {
      console.error(`❌ Error processing user ${payment.telegramId}: ${error.message}`);
    }
  }
}

// 📦 Registers all bot access control handlers
function setupGroupAccessHandlers(bot) {
  // 1. Handle join requests
  bot.on('chat_join_request', handleJoinRequest);

  // 2. Handle users added manually or by invite link
  bot.on('message', async (ctx) => {
    if (ctx.message?.new_chat_members?.length > 0) {
      for (const member of ctx.message.new_chat_members) {
        const userId = String(member.id);
        const chatId = String(ctx.chat.id);
        console.log(`👋 User ${userId} joined group ${chatId}`);
        await enforceAccess(ctx.telegram, userId, chatId);
      }
    }
  });

  // 3. Periodic cleanup
  setInterval(() => checkSubscriptions(bot), 1000 * 60 * 10);

  return {
    handleJoinRequest,
    checkSubscriptions,
    calculateExpiration,
    enforceAccess
  };
}

module.exports = {
  setupGroupAccessHandlers,
  handleJoinRequest,
  checkSubscriptions,
  calculateExpiration,
  enforceAccess
};
