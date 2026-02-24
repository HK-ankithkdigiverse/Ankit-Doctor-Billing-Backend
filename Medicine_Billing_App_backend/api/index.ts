import app from "../src";
import { connectDatabase } from "../src/database";

let isDatabaseConnected = false;

export default async function handler(req: any, res: any) {
  try {
    if (!isDatabaseConnected) {
      await connectDatabase();
      isDatabaseConnected = true;
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
