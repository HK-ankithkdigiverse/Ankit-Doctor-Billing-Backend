import mongoose from 'mongoose';
import { ensureCategoryCollectionIndexes } from '../models/category';
const dbUrl = process.env.DB_URL as string;

mongoose.set('strictQuery', false)

if (!dbUrl) {
    throw new Error("DB_URL is missing. Set it in environment variables.");
}

let mongooseConnection: Promise<typeof mongoose> | null = null;

const connectToDatabase = async () => {
    if (mongoose.connection.readyState === 1) {
        return mongoose;
    }

    if (!mongooseConnection) {
        mongooseConnection = mongoose
            .connect(dbUrl)
            .then(async (connection) => {
                console.log('Database successfully connected');
                await ensureCategoryCollectionIndexes();
                return connection;
            })
            .catch((err) => {
                mongooseConnection = null;
                console.error('Database connection failed:', err);
                throw err;
            });
    }

    return mongooseConnection;
};

export { mongooseConnection, connectToDatabase }
