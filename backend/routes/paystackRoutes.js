const express = require('express');
const router = express.Router();
const { getBankList, resolveAccount } = require('../utils/paystack');

// GET /api/paystack/banks
router.get('/paystack/banks', async (req, res) => {
  try {
    const banks = await getBankList();
    res.status(200).json({ status: 'success', data: banks });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch banks' });
  }
});

// POST /api/paystack/verify-account
router.post('/paystack/verify-account', async (req, res) => {
  const { account_number, bank_code } = req.body;

  if (!account_number || !bank_code) {
    return res.status(400).json({ status: 'error', message: 'account_number and bank_code are required' });
  }

  try {
    const result = await resolveAccount({ account_number, bank_code });
    res.status(200).json({ status: 'success', account_name: result.account_name });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Account verification failed' });
  }
});

module.exports = router;
