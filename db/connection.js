const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set in environment variables.');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri);
  console.log('[db] Connected to MongoDB');

  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected, mongoose will attempt to reconnect');
  });
}

module.exports = connectDB;
