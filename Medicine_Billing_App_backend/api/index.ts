import app from "../src";
import { connectDatabase } from "../src/database";

let isDatabaseConnected = false;

export default async function handler(req: any, res: any) {
  if (!isDatabaseConnected) {
    await connectDatabase();
    isDatabaseConnected = true;
  }

  return app(req, res);
}
