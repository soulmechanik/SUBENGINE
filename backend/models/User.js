const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  username: String,
  firstName: String,
  lastName: String,
  isGroupOwner: { type: Boolean, default: false },
  email: { type: String, lowercase: true, trim: true }, // ✅ Added field
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
