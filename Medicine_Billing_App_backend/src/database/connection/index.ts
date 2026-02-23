import mongoose from "mongoose";
import { ensureCategoryCollectionIndexes } from "../models/category";

mongoose.set("strictQuery", false);

let connectionPromise: Promise<typeof mongoose> | null = null;

export const connectDatabase = async (): Promise<typeof mongoose> => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const dbUrl = process.env.DB_URL;
  if (!dbUrl) {
    throw new Error("DB_URL is not set");
  }

  connectionPromise = mongoose
    .connect(dbUrl, {
      serverSelectionTimeoutMS: 10000,
    })
    .then(async (conn) => {
      console.log("Database successfully connected");
      await ensureCategoryCollectionIndexes();
      return conn;
    })
    .catch((error) => {
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
};
