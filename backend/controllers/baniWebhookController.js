const express = require('express');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const router = express.Router();

const BANI_PRIVATE_KEY = process.env.BANI_PRIVATE_KEY;

// IMPORTANT: This middleware ensures you receive raw body for HMAC verification
router.post(
  '/bani',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const rawBody = req.body;
      const headers = req.headers;

      // HMAC Verification using BANI-HOOK-SIGNATURE
      const signature = Buffer.from(headers['bani-hook-signature'] || '', 'utf8');
      const computedHmac = crypto
        .createHmac('sha256', BANI_PRIVATE_KEY)
        .update(rawBody)
        .digest('hex');
      const digest = Buffer.from(computedHmac, 'utf8');

      const verified =
        signature.length === digest.length &&
        crypto.timingSafeEqual(digest, signature);

      if (!verified) {
        console.warn('Invalid webhook signature');
        return res.status(401).json({ message: 'Invalid signature' });
      }

      const eventData = JSON.parse(rawBody);
      const { event, data } = eventData;

      // Only handle successful payin events
      if (!event.startsWith('payin_') || data.pay_status !== 'paid') {
        return res.status(200).json({ message: 'Ignored event' });
      }

      const {
        pay_ref,
        transaction_ref,
        customer_ref,
        actual_amount_paid,
        pay_method,
      } = data;

      const payment = await Payment.findOne({ reference: customer_ref });

      if (!payment) {
        console.error('Payment not found for reference:', customer_ref);
        return res.status(404).json({ message: 'Payment not found' });
      }

      if (payment.status === 'successful') {
        return res.status(200).json({ message: 'Already processed' });
      }

      const commission = actual_amount_paid * 0.05;
      const netAmount = actual_amount_paid - commission;

      payment.status = 'successful';
      payment.subscriptionStatus = 'active';
      payment.paidAt = new Date();
      payment.transactionRef = transaction_ref;
      payment.amount = actual_amount_paid;
      payment.paymentMethod = pay_method;
      payment.commission = commission;
      payment.netAmount = netAmount;

      await payment.save();

      // TODO: Trigger Telegram group access logic here

      return res.status(200).json({ message: 'Payment updated' });
    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(500).json({ message: 'Webhook failed' });
    }
  }
);

module.exports = router;
