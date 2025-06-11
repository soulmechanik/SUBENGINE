const express = require('express');
const cors = require('cors');
const webhookRoutes = require('./routes/webhook');
const paymentRoutes = require('./routes/paymentRoutes');
const paystackRoutes = require('./routes/paystackRoutes');

const app = express();

// === Replace this with your ngrok URL during testing ===
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://www.subchatpro.com';

// ✅ Proper CORS config to allow credentials and origin
app.use(cors({
  origin: allowedOrigin,
  credentials: true,
}));

// ✅ Bani Webhook raw body parser (must come before express.json)


// ✅ Normal body parsers after raw body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Routes
app.use('/api/payments', paymentRoutes);
app.use('/api', paystackRoutes);
app.use('/api/webhook', webhookRoutes);

app.get('/', (req, res) => res.send('SubEngine API is live'));

module.exports = app;
