import multer from "multer";
import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";
import { uploadDir } from "../common/uploadPath";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
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
    cb(new Error("Invalid file type. Allowed: jpeg, jpg, png, webp, pdf"));
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const handleUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      status: 400,
      message: err.message,
      data: null,
    });
  }

  if (err) {
    return res.status(400).json({
      status: 400,
      message: err.message || "Upload failed",
      data: null,
    });
  }

  next();
};
