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

    // Log environment info
    console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
    console.log('🌐 Setting cookie with domain:', '.subchatpro.com');

    // ✅ Set cross-origin secure cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: true, // Always true in production
      sameSite: 'None', // Required for cross-origin cookies
      domain: '.subchatpro.com', // Needed for Render API <-> Vercel app
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    console.log('🍪 Cookie set successfully. Login complete.');
    res.status(200).json({ message: 'Login successful', email });
  } catch (err) {
    console.error('💥 Login Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
