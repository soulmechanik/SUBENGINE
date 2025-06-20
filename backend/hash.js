// hash.js
const bcrypt = require('bcrypt');

async function hashPassword() {
  const password = 'JesusIsLord2025'; 
  const hash = await bcrypt.hash(password, 10);
  console.log('Hash:', hash);
}

hashPassword();
