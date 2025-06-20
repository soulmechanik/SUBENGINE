const Payment = require('../models/payment');
const Group = require('../models/Group');

module.exports = async (req, res) => {
  try {
    const { reference, status, transactionRef } = req.body;

    if (!status || status !== 'successful') {
      return res.status(400).json({ message: 'Invalid verification data' });
    }

    let payment = null;

    if (reference) {
      payment = await Payment.findOne({ reference });
    }

    if (!payment && transactionRef) {
      payment = await Payment.findOne({ transactionRef });
    }

    if (!payment && transactionRef) {
      payment = await Payment.findOne({ 'metadata.pay_ref': transactionRef });
    }

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Update payment status
    payment.status = 'paid';
    if (transactionRef) payment.transactionRef = transactionRef;
    payment.paidAt = new Date();
    await payment.save();

    // Update group subscribed users
    if (payment.telegramId && payment.group) {
      await Group.updateOne(
        { groupId: payment.group },
        { $addToSet: { subscribedUsers: payment.telegramId } }
      );
    }

    // 🔗 Get group invite link
    const group = await Group.findOne({ groupId: payment.group });
    const inviteLink = group?.inviteLink || null;

    return res.status(200).json({
      message: 'Payment verified and recorded',
      payment,
      inviteLink, // ✅ Include this in response
    });
  } catch (err) {
    console.error('Error verifying payment:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
