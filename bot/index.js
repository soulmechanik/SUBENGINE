const connectDB = require('../shared/db');
const bot = require('./bot');

(async () => {
  await connectDB();

  bot.launch();
  console.log('🤖 SubEngine bot is running');
})();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
