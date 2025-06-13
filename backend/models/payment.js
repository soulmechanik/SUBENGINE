const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true },
  telegramId: { type: String, required: true },
  group: { type: String, ref: 'Group', required: true },

  amount: { type: Number, required: true },
  duration: {
    type: String,
    required: true,
    enum: ['monthly', 'quarterly', 'biannually', 'annually']
  },

  email: { type: String, required: true },
  phone: { type: String }, // Optional, helpful for support

  status: {
    type: String,
    enum: ['pending', 'initiated', 'successful', 'paid', 'failed'],
    default: 'pending'
  },

  paidAt: { type: Date },
  expiresAt: { type: Date }, // ✅ Auto-calculated on save

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

// ✅ Automatically calculate `expiresAt` from `paidAt` and `duration`
paymentSchema.pre('save', function (next) {
  if ((this.isModified('paidAt') || this.isModified('duration')) && this.paidAt && this.duration) {
    const expires = new Date(this.paidAt);

    switch (this.duration) {
      case 'monthly':
        expires.setDate(expires.getDate() + 30); break;
      case 'quarterly':
        expires.setDate(expires.getDate() + 90); break;
      case 'biannually':
        expires.setDate(expires.getDate() + 180); break;
      case 'annually':
        expires.setFullYear(expires.getFullYear() + 1); break;
      default:
        expires.setDate(expires.getDate() + 30);
    }

    this.expiresAt = expires;
  }

  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
