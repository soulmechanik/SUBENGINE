const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true },
  telegramId: { type: String, required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  amount: Number,
  duration: String,
  email: { type: String, required: true },  // new field
  status: { type: String, enum: ['pending', 'successful', 'failed'], default: 'pending' },
  paidAt: Date,
  transactionRef: { type: String },
  
  subscriptionStatus: {
  type: String,
  enum: ['active', 'expired'],
  default: 'active',
},
  

  commission: Number, // e.g. 5% of amount
  netAmount: Number, // amount - commission
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
