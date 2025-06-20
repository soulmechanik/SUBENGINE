const express = require('express');
const router = express.Router();
const { handleBaniWebhook } = require('../controllers/baniWebhookController');
const crypto = require('crypto');

// Middleware to verify Bani webhook signature
const verifyBaniSignature = (req, res, next) => {
  const signature = req.headers['x-bani-signature'];
  const secret = process.env.BANI_PRIVATE_KEY;
  
  if (!signature) {
    console.error('⚠️ Missing Bani signature header');
    return res.status(401).json({ error: 'Missing signature header' });
  }

  if (!req.rawBody) {
    console.error('⚠️ Missing raw body for verification');
    return res.status(400).json({ error: 'Missing request body' });
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(req.rawBody).digest('hex');

  if (signature !== digest) {
    console.error('⚠️ Invalid Bani signature', {
      received: signature,
      computed: digest
    });
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
};

// Bani webhook route
router.post('/bani', verifyBaniSignature, handleBaniWebhook);

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Webhook route is working' });
});

module.exports = router;