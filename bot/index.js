const connectDB = require('../shared/db');
const bot = require('./bot');
const expireSubscriptions = require('../backend/controllers/expireSubscriptionsController'); // 👈 import

(async () => {
  await connectDB();

  bot.launch();
  console.log('🤖 SubEngine bot is running');

  // 🔁 Start subscription expiry check every hour
  await expireSubscriptions(); // Run once on startup

  
setInterval(expireSubscriptions, 60 * 60 * 1000); // 1 hour

 // Then run every hour
})();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
