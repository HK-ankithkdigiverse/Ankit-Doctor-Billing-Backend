import mongoose from 'mongoose';
import { ensureCategoryCollectionIndexes } from '../models/category';
const dbUrl = process.env.DB_URL as string;

mongoose.set('strictQuery', false)

if (!dbUrl) {
    throw new Error("DB_URL is missing. Set it in environment variables.");
}

const mongooseConnection = mongoose
    .connect(dbUrl)
    .then(async () => {
        console.log('Database successfully connected');
        await ensureCategoryCollectionIndexes();
    })
    .catch((err) => {
        console.error('Database connection failed:', err);
        throw err;
    });

export { mongooseConnection }
