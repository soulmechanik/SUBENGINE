const express = require('express');
const router = express.Router();
const { handleBaniWebhook } = require('../controllers/baniWebhookController');

router.post('/bani', handleBaniWebhook);

module.exports = router;
