import app from "../src";
import { connectDatabase } from "../src/database";
import mongoose from "mongoose";

const ensureDatabaseConnection = async () => {
  if (mongoose.connection.readyState !== 1) {
    await connectDatabase();
    return;
  }

  try {
    await mongoose.connection.db?.admin().ping();
  } catch {
    await connectDatabase();
  }
};

export default async function handler(req: any, res: any) {
  try {
    await ensureDatabaseConnection();
  } catch (error: any) {
    return res.status(503).json({
      success: false,
      message: "Database connection failed",
      error: error?.message || "Unknown error",
    });
  }

  return app(req, res);
}
