const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  groupId: { type: String, required: true, unique: true },
  groupTitle: { type: String },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  subscriptionAmount: { type: Number },
  subscriptionDuration: {
    type: String,
    enum: ['monthly', 'quarterly', 'biannual', 'annual'],
  },
  bankName: { type: String },
  bankCode: { type: String },
  accountNumber: { type: String },
  accountName: { type: String },
  inviteLink: { type: String }, // ✅ Fixed definition
  subLink: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
