const crypto = require('crypto');
const Payment = require('../models/Payment');

const merchantPrivateKey = process.env.BANI_PRIVATE_KEY;

exports.handleBaniWebhook = async (req, res) => {
  try {
    const signature = req.headers['bani-hook-signature'];
    const rawBody = req.rawBody; // must be set up by Express middleware
    const computedSignature = crypto
      .createHmac('sha256', merchantPrivateKey)
      .update(rawBody)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature))) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body.event;
    const data = req.body.data;

    if (
      event.startsWith('payin_') &&
      data.pay_status === 'paid' &&
      data.pay_ref
    ) {
      const payment = await Payment.findOne({ reference: data.pay_ref });

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      if (payment.status === 'successful') {
        return res.status(200).json({ message: 'Already processed' });
      }

      payment.status = 'successful';
      payment.paidAt = new Date(data.pub_date || Date.now());
      await payment.save();

      return res.status(200).json({ message: 'Payment updated successfully' });
    }

    res.status(200).json({ message: 'Event ignored or not relevant' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
