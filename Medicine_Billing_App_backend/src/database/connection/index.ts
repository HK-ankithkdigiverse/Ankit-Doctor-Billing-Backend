import mongoose from 'mongoose';
import express from 'express'
import { ensureCategoryCollectionIndexes } from '../models/category';
const dbUrl: any = process.env.DB_URL;
const mongooseConnection = express()
mongoose.set('strictQuery', false)
mongoose.connect(
    dbUrl
).then(async () => {
    console.log('Database successfully connected');
    await ensureCategoryCollectionIndexes();
}).catch(err => console.log(err));

export { mongooseConnection }
