// backend/app.js

const express = require('express');
const cors = require('cors');
const webhookRoutes = require('./routes/webhook');
const paymentRoutes = require('./routes/paymentRoutes');
const paystackRoutes = require('./routes/paystackRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const authRoutes = require('./routes/auth')
require('dotenv').config();

const app = express();

// Allowed origins for CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
];

// CORS options
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error('❌ Blocked CORS origin:', origin);
      callback(new Error('CORS not allowed from this origin: ' + origin));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-bani-signature'],
  credentials: true,
};

app.use(cors(corsOptions));

// Apply JSON body parser (must come **after** raw parser for webhooks)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Bani Webhook Route: Use raw body for signature verification (optional)
app.post(
  '/api/webhook/bani',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    try {
      if (Buffer.isBuffer(req.body)) {
        req.rawBody = req.body.toString('utf8');
        req.body = JSON.parse(req.rawBody);
      }
      next();
    } catch (error) {
      console.error('❌ Webhook body parsing error:', error);
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }
  },
  require('./controllers/baniWebhookController').handleBaniWebhook
);

// Standard routes
app.use('/api/payments', paymentRoutes);
app.use('/api', paystackRoutes);
app.use('/api/webhook', webhookRoutes); 
app.use('/api/auth', authRoutes); 
app.use('/api/admin', dashboardRoutes);





// Health check
app.get('/', (req, res) => res.send('SubEngine API is live ✅'));

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
