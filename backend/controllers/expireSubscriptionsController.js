const Payment = require('../models/payment');

async function expireSubscriptions() {
  const now = new Date();

  const paymentsToExpire = await Payment.find({
    subscriptionStatus: 'active',
    expiresAt: { $lte: now }
  });

  for (const payment of paymentsToExpire) {
    console.log(`🔁 Marking subscription expired for user ${payment.telegramId} in group ${payment.group}`);
    payment.subscriptionStatus = 'expired';
    await payment.save();
  }

  console.log(`✅ Subscription expiry check complete at ${now.toISOString()}`);
}

module.exports = expireSubscriptions;
