const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

const parseGoogleCredential = (credential, email) => {
  if (email && typeof email === 'string' && email.includes('@')) {
    return email.trim().toLowerCase();
  }
  if (credential && typeof credential === 'string') {
    try {
      const parts = credential.split('.');
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
        const parsed = JSON.parse(payloadJson);
        if (parsed.email) {
          return parsed.email.trim().toLowerCase();
        }
      }
    } catch (e) {
      console.warn('Could not parse Google credential JWT:', e.message);
    }
  }
  return null;
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required' });
  }

  const user = db.prepare('SELECT * FROM admins WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '8h' });

  res.json({ success: true, data: { token, role: user.role, email: user.email } });
};

// Admin Google Auth Login
const googleLogin = async (req, res) => {
  const { credential, email } = req.body;
  const targetEmail = parseGoogleCredential(credential, email);

  if (!targetEmail) {
    return res.status(400).json({ success: false, message: 'Valid Google email is required.' });
  }

  const user = db.prepare('SELECT * FROM admins WHERE LOWER(email) = LOWER(?)').get(targetEmail);
  if (!user) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Email "${targetEmail}" is not registered as an Admin.`
    });
  }

  const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '12h' });

  res.json({ success: true, data: { token, role: user.role, email: user.email } });
};

const logout = (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

module.exports = { login, googleLogin, logout };
