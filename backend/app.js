const express = require('express');
const cors = require('cors');
const webhookRoutes = require('./routes/webhook');
const paymentRoutes = require('./routes/paymentRoutes');
const paystackRoutes = require('./routes/paystackRoutes');

const app = express();

// Step 1: Raw body middleware for Bani Webhook
app.use('/api/webhook/bani', express.raw({ type: '*/*' }));

// Step 2: Normal middleware after webhook
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/payments', paymentRoutes);
app.use('/api', paystackRoutes);
app.use('/api/webhook', webhookRoutes);

app.get('/', (req, res) => res.send('SubEngine API is live'));

module.exports = app;
