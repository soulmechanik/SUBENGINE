const Payment = require('../models/Payment');
const Group = require('../models/Group');

const durationToDays = {
  monthly: 30,
  quarterly: 90,
  biannual: 180,
  annual: 365,
};

async function checkSubscriptions() {
  console.log('🔍 Checking for expired subscriptions...');
  const now = new Date();

  const payments = await Payment.find({
    subscriptionStatus: 'active',
    status: 'paid', // ✅ Make sure this matches your actual "paid" status
  });

  const expiredUsers = [];

  for (const payment of payments) {
    const { paidAt, duration, group: groupId, telegramId } = payment;

    if (!paidAt || !durationToDays[duration] || !groupId || !telegramId) continue;

    const expiryDate = new Date(paidAt);
    expiryDate.setDate(expiryDate.getDate() + durationToDays[duration]);

    if (now > expiryDate) {
      // Mark subscription as expired
      payment.subscriptionStatus = 'expired';
      await payment.save();

      // Manually get the group
      const group = await Group.findOne({ groupId: groupId });
      if (!group) {
        console.warn(`⚠️ Group with groupId ${groupId} not found`);
        continue;
      }

      expiredUsers.push({
        telegramId,
        groupId: group.groupId,
      });
    }
  }

  console.log(`✅ Expired users found: ${expiredUsers.length}`);
  return expiredUsers;
}

module.exports = checkSubscriptions;
