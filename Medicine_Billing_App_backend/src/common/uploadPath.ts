import path from "path";

export const sharedUploadDir =
  process.env.UPLOAD_DIR ||
  (process.env.VERCEL ? path.join("/tmp", "uploads") : path.join(process.cwd(), "uploads"));
