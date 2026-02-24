import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";
import apiRoutes from "./routes";
import cookieParser from "cookie-parser";
import { uploadDir } from "./common/uploadPath";

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

app.use('/', (req, res, next) => {
  res.status(200).send("Welcome to the Medicine Billing App Backend");
});

export default app;
