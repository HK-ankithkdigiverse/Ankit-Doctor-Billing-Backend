
import express from 'express';
import cors from 'cors'
import { connectToDatabase } from './database'
import dotenv from "dotenv"
import apiRoutes from "./routes";
import cookieParser from "cookie-parser"
import { UPLOAD_DIR } from "./common/uploadPath";


dotenv.config({ path: ".env" })

 
const app = express();


app.use(cors())

app.use(cookieParser())
app.use(express.json()) 
app.use(express.urlencoded({ extended: true })) 

app.use("/api", async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error: any) {
    res.status(500).json({
      status: 500,
      message: error?.message || "Database connection failed",
      data: null,
      error: {
        name: error?.name,
        message: error?.message,
      },
    });
  }
}, apiRoutes);
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/",(req, res) => {
  res.status(200).send("Welcome to the Medicine Billing App Backend");
});

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});



app.get('/isServerUp', (req, res) => {
    res.send('Server is running ');
});
export default app;
