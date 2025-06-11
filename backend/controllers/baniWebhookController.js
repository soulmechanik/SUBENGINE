const Payment = require('../models/Payment');
const Group = require('../models/Group');
const User = require('../models/User');


exports.handleBaniWebhook = async (req, res) => {
  try {
    const event = req.body.event;
    const paymentData = req.body.data;
    
    console.log(`🔄 Processing Bani webhook event: ${event}`);

    // Only process successful payments
    if (event !== 'payment.successful') {
      console.log(`ℹ️ Skipping non-payment event: ${event}`);
      return res.status(200).json({ message: 'Event not processed' });
    }

    // Validate required payment data
    if (!paymentData?.reference || !paymentData?.amount) {
      console.error('⚠️ Missing required payment data');
      return res.status(400).json({ error: 'Missing required payment data' });
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ reference: paymentData.reference });
    
    if (existingPayment) {
      // Update existing payment if not already marked successful
      if (existingPayment.status !== 'successful') {
        existingPayment.status = 'successful';
        existingPayment.paidAt = new Date();
        existingPayment.transactionRef = paymentData.transactionRef;
        existingPayment.paymentMethod = paymentData.paymentMethod;
        existingPayment.metadata = paymentData;
        
        await existingPayment.save();
        console.log(`✅ Updated existing payment: ${paymentData.reference}`);
      }
      return res.status(200).json({ message: 'Payment updated' });
    }

    // Extract metadata from payment
    const metadata = paymentData.metadata || {};
    const { telegramId, groupId, duration } = metadata;
    
    if (!telegramId || !groupId || !duration) {
      console.error('⚠️ Missing required metadata', metadata);
      return res.status(400).json({ error: 'Missing required metadata' });
    }

    // Calculate commission and net amount
    const commission = paymentData.amount * 0.05;
    const netAmount = paymentData.amount - commission;

    // Create new payment record
    const newPayment = new Payment({
      reference: paymentData.reference,
      telegramId,
      group: groupId,
      amount: paymentData.amount,
      duration,
      email: paymentData.email,
      phone: paymentData.phoneNumber,
      status: 'successful',
      paidAt: new Date(),
      transactionRef: paymentData.transactionRef,
      paymentMethod: paymentData.paymentMethod,
      subscriptionStatus: 'active',
      commission,
      netAmount,
      metadata: paymentData
    });

    await newPayment.save();
    console.log(`💰 New payment recorded: ${paymentData.reference}`);

    // Update user subscription
    await updateUserSubscription(telegramId, groupId, duration);
    


    return res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (err) {
    console.error('❌ Webhook processing error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

async function updateUserSubscription(telegramId, groupId, duration) {
  try {
    // Calculate expiration date based on duration
    const durationInMonths = parseInt(duration);
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + durationInMonths);

    // Update user's subscription
    await User.findOneAndUpdate(
      { telegramId },
      { 
        $addToSet: { subscribedGroups: groupId },
        $set: { subscriptionExpiresAt: expirationDate }
      },
      { new: true, upsert: true }
    );

    console.log(`🔄 Updated subscription for user ${telegramId} in group ${groupId}`);
  } catch (error) {
    console.error('Failed to update user subscription:', error);
    throw error;
  }
}