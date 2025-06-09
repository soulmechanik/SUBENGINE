const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  groupId: { type: String, required: true },
  telegramId: { type: Number, required: true }, // permanent identifier
  username: String, // optional, for display only
  email: { type: String, lowercase: true, trim: true },
  amount: Number,
  duration: { type: String, enum: ['monthly', 'quarterly', 'biannual', 'annual'] },
  subscriptionStart: Date,
  subscriptionEnd: Date,
  status: { type: String, enum: ['active', 'expired'], default: 'active' }
}, { timestamps: true });

// Fix OverwriteModelError by checking if model exists
module.exports = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);
