const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true },
  telegramId: { type: String, required: true },
group: {
  type: String,
  ref: 'Group', // ✅ Still works
  required: true
},


  amount: { type: Number, required: true },
  duration: { type: String, required: true },

  email: { type: String, required: true },
  phone: { type: String }, // Optional, helpful for support

  status: {
    type: String,
    enum: ['pending', 'initiated', 'successful', 'failed'],
    default: 'pending'
  },
  paidAt: { type: Date },

  transactionRef: { type: String },
  paymentMethod: {
    type: String,
    enum: ['card', 'bank_transfer', 'crypto'],
  },

  subscriptionStatus: {
    type: String,
    enum: ['active', 'expired'],
    default: 'active',
  },

  commission: { type: Number, default: 0 },
  netAmount: { type: Number, default: 0 },

  metadata: { type: Object }, // store full Bani response if needed
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
