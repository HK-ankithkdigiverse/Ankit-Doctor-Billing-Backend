import mongoose from 'mongoose';
import 'dotenv/config';
import { ensureCategoryCollectionIndexes } from '../models/category';

const DB_URL = process.env.DB_URL;

if (!DB_URL) {
  throw new Error('DB_URL missing');
}

mongoose.set('strictQuery', false);

let cachedConnection: Promise<typeof mongoose> | null = null;

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!cachedConnection) {
    cachedConnection = mongoose
      .connect(DB_URL, { serverSelectionTimeoutMS: 10000 })
      .then(async (connection) => {
        await ensureCategoryCollectionIndexes();
        console.log('MongoDB connected');
        return connection;
      })
      .catch((err) => {
        cachedConnection = null;
        console.error('MongoDB error:', err);
        throw err;
      });
  }

  return cachedConnection;
};
