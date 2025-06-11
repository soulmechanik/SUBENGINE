const express = require('express');
const cors = require('cors');
const webhookRoutes = require('./routes/webhook');
const paymentRoutes = require('./routes/paymentRoutes');
const paystackRoutes = require('./routes/paystackRoutes');

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, 'https://your-production-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-bani-signature'],
  credentials: true
};

// Apply CORS to all routes except webhook
app.use(cors(corsOptions));

// Express JSON middleware for normal routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Special middleware for Bani webhook - must come before JSON middleware
app.use('/api/webhook/bani', 
  express.raw({ type: 'application/json' }), 
  (req, res, next) => {
    try {
      if (req.body) {
        req.rawBody = req.body.toString('utf8');
        req.body = JSON.parse(req.rawBody);
      }
      next();
    } catch (error) {
      console.error('Webhook body parsing error:', error);
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }
  }
);

// Routes
app.use('/api/payments', paymentRoutes);
app.use('/api', paystackRoutes);
app.use('/api/webhook', webhookRoutes);

// Health check endpoint
app.get('/', (req, res) => res.send('SubEngine API is live'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;