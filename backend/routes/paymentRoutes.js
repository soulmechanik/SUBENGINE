const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentsController');

// POST /api/payments/record
router.post('/record', paymentController.recordPayment);

module.exports = router;
