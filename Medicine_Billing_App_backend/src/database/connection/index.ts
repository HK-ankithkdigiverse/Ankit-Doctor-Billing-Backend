import mongoose from 'mongoose';
import { ensureCategoryCollectionIndexes } from '../models/category';
const dbUrl = process.env.DB_URL as string;

mongoose.set('strictQuery', false)

const mongooseConnection = mongoose
    .connect(dbUrl)
    .then(async () => {
        console.log('Database successfully connected');
        await ensureCategoryCollectionIndexes();
    })
    .catch((err) => console.log(err));

export { mongooseConnection }
