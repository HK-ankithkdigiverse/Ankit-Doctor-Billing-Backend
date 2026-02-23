import multer from "multer";
import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";

// Upload directory
const uploadDir = path.join(process.cwd(), "uploads");

// Create uploads folder if it doesn't exist
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed MIME types
const allowedTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",       // ✅ add this (important)
  "application/pdf",
];

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, false); // ✅ reject file, no crash
  }
};


// Multer storage config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
});

// File filter


// Export multer instance
export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Middleware to handle multer errors
export const handleUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            status: 400,
            message: err.message,
            data: null,
        });
    } else if (err) {
        return res.status(400).json({
            status: 400,
            message: err.message,
            data: null,
        });
    }
    next();
};
