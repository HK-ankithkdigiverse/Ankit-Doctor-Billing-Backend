import app from "../src";
import { connectDatabase } from "../src/database";
import mongoose from "mongoose";

export default async function handler(req: any, res: any) {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
  } catch (error: any) {
    return res.status(503).json({
      success: false,
      message: "Database connection failed",
      error: error?.message || "Unknown error",
    });
  }

  return app(req, res);
}
