import mongoose from 'mongoose';
import { ensureCategoryCollectionIndexes } from '../models/category';
import { ensureCompanyCollectionIndexes } from '../models/company';
import { ensureMedicalStoreCollectionIndexes } from '../models/medicalStore';
import { ensureBillCollectionIndexes } from '../models/bill';

const dbUrl = process.env.DB_URL;

export const connectDatabase = async (): Promise<void> => {
    if (!dbUrl) {
        throw new Error("DB_URL is not set");
    }

    mongoose.set('strictQuery', false)
    await mongoose.connect(dbUrl);
    console.log("Database successfully connected");
    await ensureCategoryCollectionIndexes();
    await ensureCompanyCollectionIndexes();
    await ensureMedicalStoreCollectionIndexes();
    await ensureBillCollectionIndexes();
};
