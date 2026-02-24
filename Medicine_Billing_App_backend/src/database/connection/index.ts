import mongoose from 'mongoose';
import { ensureCategoryCollectionIndexes } from '../models/category';
const dbUrl: any = process.env.DB_URL;

export const connectDatabase = async (): Promise<void> => {
    if (!dbUrl) {
        throw new Error("DB_URL is not set");
    }

    mongoose.set('strictQuery', false)
    await mongoose.connect(dbUrl);
    console.log('Database successfully connected');
    await ensureCategoryCollectionIndexes();
};
