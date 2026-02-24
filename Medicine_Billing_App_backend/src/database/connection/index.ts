import mongoose from 'mongoose';
import { ensureCategoryCollectionIndexes } from '../models/category';
import { logger } from '../../helper';

const dbUrl = process.env.DB_URL;

export const connectDatabase = async (): Promise<void> => {
    if (!dbUrl) {
        throw new Error("DB_URL is not set");
    }

    mongoose.set('strictQuery', false)
    await mongoose.connect(dbUrl);
    logger.info("Database successfully connected");
    await ensureCategoryCollectionIndexes();
};
