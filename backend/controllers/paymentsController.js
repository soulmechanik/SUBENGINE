const Payment = require('../models/Payment');
const Group = require('../models/Group');

exports.recordPayment = async (req, res) => {
  try {
    const {
      reference,
      telegramId,
      group, // group ID
      amount,
      duration,
      email
    } = req.body;

    // Validate required fields
    if (!reference || !telegramId || !group || !amount || !duration) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check for duplicate reference
    const existing = await Payment.findOne({ reference });
    if (existing) {
      return res.status(409).json({ error: 'Payment already recorded' });
    }

    const commission = amount * 0.05;
    const netAmount = amount - commission;

    const payment = new Payment({
      reference,
      telegramId,
      group,
      amount,
      duration,
      email,
      status: 'pending',
      subscriptionStatus: 'active',
      commission,
      netAmount
    });

    await payment.save();

    return res.status(201).json({ message: 'Payment recorded', payment });
  } catch (err) {
    console.error('Error recording payment:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
