const crypto = require('crypto');
const Payment = require('../models/Payment');

const merchantPrivateKey = process.env.BANI_PRIVATE_KEY;

exports.handleBaniWebhook = async (req, res) => {
  try {
    console.log('📩 Webhook called');
    console.log('👉 Headers:', req.headers);
    console.log('👉 Raw body:', req.rawBody?.toString());

    const signature = req.headers['bani-hook-signature'];
    const rawBody = req.rawBody;

    if (!rawBody || !signature) {
      console.warn('❌ Missing raw body or signature');
      return res.status(400).json({ error: 'Missing raw body or signature' });
    }

    const computedSignature = crypto
      .createHmac('sha256', merchantPrivateKey)
      .update(rawBody)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature))) {
      console.warn('❌ Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('✅ Signature verified');

    const event = req.body.event;
    const data = req.body.data;

    console.log('📦 Event:', event);
    console.log('📦 Data:', data);

    if (
      event.startsWith('payin_') &&
      data.pay_status === 'paid' &&
      data.pay_ref
    ) {
      const sanitizedRef = String(data.pay_ref).trim();
      console.log(`🔍 Looking for payment with sanitized reference: ${sanitizedRef}`);

      // 🔍 Debug: show all references currently in DB
      const allPayments = await Payment.find({}, 'reference status createdAt');
      console.log('📋 All payment references in DB:');
      allPayments.forEach(p => {
        console.log(`- ${p.reference} | ${p.status} | ${p.createdAt}`);
      });

      const payment = await Payment.findOne({ reference: sanitizedRef });

      if (!payment) {
        console.warn('❌ Payment not found');
        return res.status(404).json({ error: 'Payment not found' });
      }

      if (payment.status === 'successful') {
        console.log('ℹ️ Payment already processed');
        return res.status(200).json({ message: 'Already processed' });
      }

      payment.status = 'successful';
      payment.paidAt = new Date(data.pub_date || Date.now());
      await payment.save();

      console.log('✅ Payment updated successfully');
      return res.status(200).json({ message: 'Payment updated successfully' });
    }

    console.log('ℹ️ Event ignored or not relevant');
    res.status(200).json({ message: 'Event ignored or not relevant' });
  } catch (err) {
    console.error('💥 Webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
