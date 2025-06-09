const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  groupId: { type: String, required: true, unique: true },
  groupTitle: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  subscriptionAmount: Number,
  subscriptionDuration: { type: String, enum: ['monthly', 'quarterly', 'biannual', 'annual'] },
  bankName: String,
  bankCode: String,
  accountNumber: String,

  accountName: String,
    subLink: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);