import { StatusCode } from "../../common";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { getFilesValidator } from "../../validation";
import { uploadDir } from "../../common/uploadPath";
import { Request, Response } from "express";

type UploadedFilesRequest = Request & {
  files?: Express.Multer.File[];
};

type DeleteImageRequestBody = {
  url?: string;
  filename?: string;
};

// ================= UPLOAD IMAGES =================
export const uploadImages = async (req: UploadedFilesRequest, res: Response) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(StatusCode.BAD_REQUEST).json({
        success: false,
        message: "No files uploaded",
      });
    }

    const files = req.files;

    const fileUrls = files.map((file) => ({
      filename: file.filename,
      url: `/uploads/${file.filename}`,
    }));

    return res.status(StatusCode.OK).json({
      success: true,
      message: "Files uploaded successfully",
      data: fileUrls,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return res.status(StatusCode.INTERNAL_ERROR).json({
      success: false,
      message,
    });
  }
};

// ================= GET IMAGES =================
export const getImages = async (req: Request, res: Response) => {
  try {
    const { error, value } = getFilesValidator.validate(req.query);
    if (error) {
      return res.status(StatusCode.BAD_REQUEST).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { page = 1, limit = 10, type } = value;
    const directoryPath = uploadDir;

    let files: string[] = [];
    try {
      files = await fs.readdir(directoryPath);
    } catch {
      files = [];
    }

    // Filter by file type
    if (type === "image") {
      files = files.filter(
        (file) =>
          file.endsWith(".jpg") ||
          file.endsWith(".jpeg") ||
          file.endsWith(".png") ||
          file.endsWith(".webp")
      );
    }

    if (type === "pdf") {
      files = files.filter((file) => file.endsWith(".pdf"));
    }

    // Keep only actual files
    const fileNames = files.filter((file) => {
      const fullPath = path.join(directoryPath, file);
      return existsSync(fullPath);
    });

    const totalData = fileNames.length;
    const totalPages = Math.ceil(totalData / limit);
    const skip = (page - 1) * limit;

    const paginatedFiles = fileNames.slice(skip, skip + limit);

    return res.status(StatusCode.OK).json({
      success: true,
      message: "Files fetched successfully",
      data: paginatedFiles.map((file) => ({
        filename: file,
        url: `/uploads/${file}`,
      })),
      pagination: {
        page,
        limit,
        totalPages,
        totalData,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch files";
    return res.status(StatusCode.INTERNAL_ERROR).json({
      success: false,
      message,
    });
  }
};

// ================= DELETE IMAGE =================
export const deleteImage = async (req: Request<unknown, unknown, DeleteImageRequestBody>, res: Response) => {
  try {
    const { url, filename } = req.body;

    if (!url && !filename) {
      return res.status(StatusCode.BAD_REQUEST).json({
        success: false,
        message: "Provide 'url' or 'filename' to delete",
      });
    }

    const fileToDelete =
      typeof filename === "string" && filename.trim()
        ? filename
        : typeof url === "string"
        ? url.split("/").pop()
        : "";

    if (!fileToDelete) {
      return res.status(StatusCode.BAD_REQUEST).json({
        success: false,
        message: "Invalid filename/url",
      });
    }

    const safeFilename = path.basename(fileToDelete);
    const filePath = path.join(uploadDir, safeFilename);

    if (!existsSync(filePath)) {
      return res.status(StatusCode.NOT_FOUND).json({
        success: false,
        message: "File not found",
      });
    }

    await fs.unlink(filePath);

    return res.status(StatusCode.OK).json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete file";
    return res.status(StatusCode.INTERNAL_ERROR).json({
      success: false,
      message,
    });
  }
};
