const Payment = require('../models/Payment');
const Group = require('../models/Group');
const User = require('../models/User');

exports.handleBaniWebhook = async (req, res) => {
  try {
    // Full webhook log
    console.log('📦 Raw Bani webhook body:', JSON.stringify(req.body, null, 2));

    const event = req.body.event;
    const paymentData = req.body.data;
    const activity = req.body.activity;

    console.log(`🔄 Processing Bani webhook event: ${event}`);
    console.log(`ℹ️ Activity Type: ${activity?.act_type}`);
    console.log(`ℹ️ Activity Description: ${activity?.act_description}`);
    console.log(`ℹ️ Payment Status: ${paymentData?.pay_status}`);

    // Determine if this is a successful payment
    const isSuccessful =
      event === 'payment.successful' ||
      activity?.act_description?.toLowerCase().includes('payment succesful') ||
      activity?.act_type?.toLowerCase().includes('successful') ||
      paymentData?.pay_status === 'paid';

    if (!isSuccessful) {
      console.log(`ℹ️ Skipping non-success event: ${event}`);
      return res.status(200).json({ message: 'Event not processed (not successful)' });
    }

    if (!paymentData?.pay_ext_ref || !paymentData?.actual_amount_paid) {
      console.error('⚠️ Missing required payment data:', paymentData);
      return res.status(400).json({ error: 'Missing required payment data' });
    }

    const reference = paymentData.pay_ext_ref;

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ reference });

    if (existingPayment) {
      if (existingPayment.status !== 'successful') {
        existingPayment.status = 'successful';
        existingPayment.paidAt = new Date();
        existingPayment.transactionRef = paymentData.transaction_ref;
        existingPayment.paymentMethod = paymentData.pay_method;
        existingPayment.metadata = paymentData;

        await existingPayment.save();
        console.log(`✅ Updated existing payment to successful: ${reference}`);
      } else {
        console.log(`ℹ️ Payment already marked successful: ${reference}`);
      }
      return res.status(200).json({ message: 'Payment updated' });
    }

    // Metadata from custom_data
    const metadata = paymentData.custom_data || {};
    const { telegramId, groupId, duration } = metadata;

    if (!telegramId || !groupId || !duration) {
      console.error('⚠️ Missing metadata fields:', metadata);
      return res.status(400).json({ error: 'Missing required metadata fields' });
    }

    // Calculate commission and net
    const amount = parseFloat(paymentData.actual_amount_paid);
    const commission = amount * 0.05;
    const netAmount = amount - commission;

    const newPayment = new Payment({
      reference,
      telegramId,
      group: groupId,
      amount,
      duration,
      email: paymentData.holder_email || '',
      phone: paymentData.holder_phone || '',
      status: 'successful',
      paidAt: new Date(),
      transactionRef: paymentData.transaction_ref,
      paymentMethod: paymentData.pay_method,
      subscriptionStatus: 'active',
      commission,
      netAmount,
      metadata: paymentData
    });

    await newPayment.save();
    console.log(`💰 New payment saved: ${reference}`);

    await updateUserSubscription(telegramId, groupId, duration);

    return res.status(200).json({ message: 'Webhook processed successfully' });

  } catch (err) {
    console.error('❌ Webhook processing error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

async function updateUserSubscription(telegramId, groupId, duration) {
  try {
    const durationInMonths = parseInt(duration) || 1;
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + durationInMonths);

    await User.findOneAndUpdate(
      { telegramId },
      {
        $addToSet: { subscribedGroups: groupId },
        $set: { subscriptionExpiresAt: expirationDate }
      },
      { new: true, upsert: true }
    );

    console.log(`🔄 User ${telegramId} subscription updated for group ${groupId}`);
  } catch (error) {
    console.error('❌ Failed to update user subscription:', error);
    throw error;
  }
}
