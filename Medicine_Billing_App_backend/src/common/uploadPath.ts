import path from "path";

const isVercelRuntime = Boolean(process.env.VERCEL);

export const UPLOAD_DIR = isVercelRuntime
  ? path.join("/tmp", "uploads")
  : path.join(process.cwd(), "uploads");
