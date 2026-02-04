const jwt = require('jsonwebtoken');
require('dotenv').config();

// Generate a token for the test user with correct payload
const payload = {
  userId: 'e6ccd542-0a2b-43c8-9336-feeaa0c2b7d3',
  email: 'j@modernizegames.com',
  hasPurchased: true
};
const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

console.log(token);
