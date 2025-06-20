// backend/controllers/authController.js

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const JWT_SECRET = process.env.JWT_SECRET;

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('📥 Incoming login request');
    console.log('→ Provided email:', email);

    if (email !== ADMIN_EMAIL) {
      console.warn('❌ Email does not match ADMIN_EMAIL');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('🔐 Comparing password with stored hash...');
    const isMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

    if (!isMatch) {
      console.warn('❌ Password mismatch');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('✅ Credentials verified. Creating JWT...');
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });
    console.log('🔑 Token generated:', token);

    // 🚫 No cookie needed — token will be stored in localStorage on frontend
    console.log('📦 Sending token in response body (for localStorage use)');
    res.status(200).json({ message: 'Login successful', email, token });
  } catch (err) {
    console.error('💥 Login Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
