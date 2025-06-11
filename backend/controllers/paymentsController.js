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
      email,
      phoneNumber
    } = req.body;

    // Validate required fields
    if (!reference || !telegramId || !group || !amount || !duration || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check for duplicate reference
    const existing = await Payment.findOne({ reference });
    if (existing) {
      return res.status(409).json({ error: 'Payment already recorded' });
    }

    // Create payment record with pending status
    // This will be updated when the webhook is received
    const commission = amount * 0.05;
    const netAmount = amount - commission;

    const payment = new Payment({
      reference,
      telegramId,
      group,
      amount,
      duration,
      email,
      phone: phoneNumber,
      status: 'pending',
      subscriptionStatus: 'active',
      commission,
      netAmount
    });

    await payment.save();

    return res.status(201).json({ 
      message: 'Payment initiated', 
      payment,
      // Include Bani public key for frontend
      baniPublicKey: process.env.BANI_PUBLIC_KEY 
    });
  } catch (err) {
    console.error('Error recording payment:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.getPaymentStatus = async (req, res) => {
  const reference = req.query.reference;

  if (!reference) {
    return res.status(400).json({ error: 'Missing reference' });
  }

  try {
    // Look for match in either internal reference or baniReference
    const payment = await Payment.findOne({
      $or: [
        { reference: reference },
        { baniReference: reference }
      ]
    });

    if (!payment) {
      console.warn(`⚠️ Payment not found for reference: ${reference}`);
      return res.status(404).json({ error: 'Payment not found' });
    }

    console.log(`ℹ️ Payment status check for ${reference}: ${payment.status}`);

    return res.status(200).json({
      reference,
      status: payment.status
    });
  } catch (err) {
    console.error('❌ Error fetching payment status:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


