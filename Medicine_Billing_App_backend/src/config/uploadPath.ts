import path from "path";

const isVercel = Boolean(process.env.VERCEL);

// Vercel serverless filesystem is writable only under /tmp.
export const uploadDir = process.env.UPLOAD_DIR || (isVercel ? "/tmp/uploads" : path.join(process.cwd(), "uploads"));

