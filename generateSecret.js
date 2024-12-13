const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const secret = crypto.randomBytes(64).toString('hex');
console.log(`Generated secret: ${secret}`);

// Write the secret to the .env file
const envPath = path.resolve(__dirname, '.env');
fs.appendFileSync(envPath, `SESSION_SECRET=${secret}\n`);
console.log(`Secret saved to ${envPath}`);
