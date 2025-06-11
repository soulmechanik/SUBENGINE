const crypto = require('crypto');
const Payment = require('../models/Payment');

const merchantPrivateKey = process.env.BANI_PRIVATE_KEY;

exports.handleBaniWebhook = async (req, res) => {
  try {
    // 1. Verify webhook signature
    const signature = req.headers['bani-hook-signature'];
    const rawBody = req.rawBody;

    if (!rawBody || !signature) {
      console.warn('Missing raw body or signature');
      return res.status(400).json({ error: 'Missing authentication data' });
    }

    const computedSignature = crypto
      .createHmac('sha256', merchantPrivateKey)
      .update(rawBody)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature))) {
      console.warn('Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 2. Process verified webhook
    const event = req.body.event;
    const data = req.body.data;
    const eventId = req.headers['bani-event-id'];

    console.log(`Processing ${event} (ID: ${eventId})`);

    if (event.startsWith('payin_')) {
      return await handlePaymentEvent(data, res);
    }

    res.status(200).json({ message: 'Non-payment event ignored' });

  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

async function handlePaymentEvent(data, res) {
  const baniReference = data.pay_ref;
  const paymentStatus = data.pay_status;
  const metadata = data.custom_data || {};
  const paymentId = metadata.paymentId;

  if (!baniReference) {
    return res.status(400).json({ error: 'Missing payment reference' });
  }

  // 1. Try to find payment by Bani reference first
  let payment = await Payment.findOne({ reference: baniReference });

  // 2. If not found, try by payment ID from metadata
  if (!payment && paymentId) {
    payment = await Payment.findById(paymentId);
  }

  // 3. If still not found, try by metadata matching
  if (!payment) {
    payment = await Payment.findOne({
      telegramId: metadata.telegramId,
      groupId: metadata.groupId,
      amount: data.pay_amount,
      status: { $in: ['initiated', 'pending'] }
    });
  }

  // Handle different payment statuses
  switch (paymentStatus) {
    case 'paid':
      return await handlePaidPayment(payment, data, baniReference, res);
    case 'failed':
      return await handleFailedPayment(payment, data, res);
    default:
      return res.status(200).json({ message: 'Status not processed' });
  }
}

async function handlePaidPayment(payment, data, baniReference, res) {
  // If no existing record found, create new one
  if (!payment) {
    payment = new Payment({
      reference: baniReference,
      telegramId: data.custom_data?.telegramId,
      groupId: data.custom_data?.groupId,
      amount: data.pay_amount,
      duration: data.custom_data?.duration,
   email: data.holder_email || data.customer_email || data.custom_data?.email,

      phone: data.holder_phone,
      firstName: data.holder_first_name,
      lastName: data.holder_last_name,
      status: 'successful',
      paidAt: new Date(data.pub_date || Date.now()),
      paymentMethod: data.pay_method,
      rawData: data
    });

    await payment.save();
    return res.status(200).json({ message: 'New payment created' });
  }

  // Update existing record
  payment.reference = baniReference;
  payment.status = 'successful';
  payment.paidAt = new Date(data.pub_date || Date.now());
  payment.paymentMethod = data.pay_method;
  payment.rawData = data;

  await payment.save();
  return res.status(200).json({ message: 'Payment updated' });
}

async function handleFailedPayment(payment, data, res) {
  if (payment) {
    payment.status = 'failed';
    payment.failureReason = data.failure_reason || 'Unknown';
    await payment.save();
  }
  return res.status(200).json({ message: 'Payment failure recorded' });
}