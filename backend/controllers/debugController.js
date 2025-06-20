const mongoose = require('mongoose');

exports.getDBStatus = async (req, res) => {
  try {
    const db = mongoose.connection.db;

    // Get database name
    const dbName = db.databaseName;

    // Get list of collections
    const collections = await db.listCollections().toArray();

    // Build info about each collection
    const details = await Promise.all(
      collections.map(async (col) => {
        const count = await db.collection(col.name).countDocuments();
        const sample = await db.collection(col.name).findOne();
        return {
          name: col.name,
          count,
          sample,
        };
      })
    );

    res.json({
      database: dbName,
      collections: details,
    });
  } catch (err) {
    console.error('❌ Debug controller error:', err);
    res.status(500).json({ message: 'Failed to fetch DB info' });
  }
};
