const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentsController');
const verifyPayment = require('../controllers/verifyPaymentController')
const getPaymentStatus = require('../controllers/paymentsController')



// POST /api/payments/record
router.post('/record', paymentController.recordPayment);
router.post('/verify', verifyPayment)
router.get('/status', paymentController.getPaymentStatus);

module.exports = router;
