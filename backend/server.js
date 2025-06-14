require('dotenv').config();
const app = require('./app');
const connectDB = require('../shared/db');


const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
