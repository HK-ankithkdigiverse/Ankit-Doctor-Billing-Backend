
import express from 'express';  
import http from 'http';
import cors from 'cors'
import { connectDatabase } from './database'
import dotenv from "dotenv"
import apiRoutes from "./routes";
import cookieParser from "cookie-parser"
import { uploadDir } from "./config/uploadPath";


dotenv.config({ path: ".env" })

 
const app = express();


app.use(cors())

app.use(cookieParser())
app.use(express.json()) 
app.use(express.urlencoded({ extended: true })) 

app.use("/api", async (_req, res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    console.error("DB CONNECTION ERROR:", error);
    return res.status(500).json({
      status: 500,
      message: "Database connection failed",
      data: null,
    });
  }
});
app.use("/api", apiRoutes);
app.use("/uploads", express.static(uploadDir));

app.use("/",(req, res, next) => {
  res.status(200).send("Welcome to the Medicine Billing App Backend");
});

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});



app.get('/isServerUp', (req, res) => {
    res.send('Server is running ');
});




let server = new http.Server(app);
export default server;
