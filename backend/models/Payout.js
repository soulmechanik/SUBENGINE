const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bankCode: String,          // e.g. "090441"
  listCode: String,          // e.g. "01"
  accountNumber: String,     // e.g. "0011492583"
  accountName: String        // e.g. "John Doe"
}, { timestamps: true });

module.exports = mongoose.model('Payout', payoutSchema);
