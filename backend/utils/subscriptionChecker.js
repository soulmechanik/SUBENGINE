// utils/subscriptionChecker.js
const Payment = require('../models/Payment');
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
    status: 'successful',
  }).populate('group');

  const expiredUsers = [];

  for (const payment of payments) {
    const { paidAt, duration, group, telegramId } = payment;
    if (!paidAt || !durationToDays[duration] || !group || !group.groupId || !telegramId) continue;

    const expiryDate = new Date(paidAt);
    expiryDate.setDate(expiryDate.getDate() + durationToDays[duration]);

    if (now > expiryDate) {
      payment.subscriptionStatus = 'expired';
      await payment.save();

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
