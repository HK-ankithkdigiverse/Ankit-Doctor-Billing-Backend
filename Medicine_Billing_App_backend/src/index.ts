import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import dotenv from "dotenv";
import apiRoutes from "./routes";
import cookieParser from "cookie-parser";
import { uploadDir } from "./common/uploadPath";
import { handleUploadError } from "./middleware/upload";

dotenv.config({ path: ".env" });

const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use("/api", apiRoutes);
app.use("/uploads", express.static(uploadDir));

app.get('/isServerUp', (req, res) => {
  res.send('Server is running ');
});

app.get('/', (req, res, next) => {
  res.status(200).send("Welcome to the Medicine Billing App Backend");
});

app.use((req: Request, res: Response) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(handleUploadError);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err?.status || 500;
  return res.status(status).json({
    success: false,
    message: err?.message || "Internal server error",
  });
});

export default app;
