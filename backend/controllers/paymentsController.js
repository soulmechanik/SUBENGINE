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
    } = req.body;

    if (!reference || !telegramId || !groupId || !amount || !duration || !email) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Optional: Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const commissionRate = 0.05;
    const commission = amount * commissionRate;
    const netAmount = amount - commission;

    const payment = await Payment.create({
      reference,
      telegramId,
      group: groupId,
      amount,
      duration,
      email,
      commission,
      netAmount,
      status: 'pending',
    });

    res.status(201).json({ message: 'Payment recorded', payment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
