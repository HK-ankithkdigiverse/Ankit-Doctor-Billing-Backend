import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';
import { ensureCategoryCollectionIndexes } from '../models/category';

const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../.env'),
];

const envPath = envCandidates.find((candidate) => existsSync(candidate));
if (envPath) {
  dotenv.config({ path: envPath });
}

const DB_URL = process.env.DB_URL;

if (!DB_URL) {
  throw new Error('DB_URL missing');
}

mongoose.set('strictQuery', false);

declare global {
  // eslint-disable-next-line no-var
  var __mongooseConnectionPromise__: Promise<typeof mongoose> | undefined;
}

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!global.__mongooseConnectionPromise__) {
    global.__mongooseConnectionPromise__ = mongoose
      .connect(DB_URL, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 20000,
        family: 4,
      })
      .then(async (connection) => {
        await ensureCategoryCollectionIndexes();

        console.log('MongoDB connected');
        return connection;
      })
      .catch((err) => {
        global.__mongooseConnectionPromise__ = undefined;
        console.error('MongoDB error:', err);
        throw err;
      });
  }

  return global.__mongooseConnectionPromise__;
};
