const Payment = require('../models/Payment');
const Group = require('../models/Group');

exports.recordPayment = async (req, res) => {
  try {
    const {
      reference,
      telegramId,
      groupId,
      amount,
      duration,
      email,
      status, // Accept from frontend (e.g., 'successful')
    } = req.body;

    // Validate required fields
    const requiredFields = { reference, telegramId, groupId, amount, duration, email };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: 'Missing required fields',
        missingFields,
      });
    }

    // Find group using Telegram groupId string (not Mongo _id)
    const group = await Group.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const commissionRate = 0.05;
    const commission = amount * commissionRate;
    const netAmount = amount - commission;

    const payment = await Payment.create({
      reference,
      telegramId,
      group: group._id, // Store Mongo ObjectId
      amount,
      duration,
      email,
      commission,
      netAmount,
      status: status || 'pending',
      paidAt: status === 'successful' ? new Date() : null,
    });

    res.status(201).json({ message: 'Payment recorded', payment });
  } catch (err) {
    console.error('Error recording payment:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
