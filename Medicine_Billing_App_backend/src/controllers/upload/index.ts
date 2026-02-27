import { StatusCode } from "../../common";
import path from "path";
import fs from "fs/promises";
import { getFilesValidator } from "../../validation";
import { sharedUploadDir } from "../../common/uploadPath";
import { Request, Response } from "express";
import { sendError, sendSuccess } from "../../helper";
import { DeleteImageRequestBody, UploadedFilesRequest } from "../../types/upload";

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

    const fileUrls = files.map((file: Express.Multer.File) => `uploads/${file.filename}`);

    return sendSuccess(res, "Files uploaded successfully.", { files: fileUrls });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return sendError(res, message, error, StatusCode.INTERNAL_ERROR);
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
    const skip = (page - 1) * limit;
    let files: string[] = [];
    try {
      const dirEntries = await fs.readdir(sharedUploadDir, { withFileTypes: true });
      files = dirEntries.filter((entry) => entry.isFile()).map((entry) => entry.name);
    } catch {
      files = [];
    }

    if (type === "image") {
      files = files.filter(
        (file) =>
          file.endsWith(".jpg") ||
          file.endsWith(".jpeg") ||
          file.endsWith(".png")
      );
    } else if (type === "pdf") {
      files = files.filter((file) => file.endsWith(".pdf"));
    }

    const totalData = files.length;
    const totalPages = Math.ceil(totalData / limit);
    const paginatedFiles = limit ? files.slice(skip, skip + limit) : files;

    return sendSuccess(res, "Files fetched successfully.", {
      files: paginatedFiles.map((file) => `uploads/${file}`),
      state: {
        page,
        limit,
        totalPages,
      },
      totalData,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch files";
    return sendError(res, message, error, StatusCode.INTERNAL_ERROR);
  }
};

// ================= DELETE IMAGE =================
export const deleteImage = async (req: Request<unknown, unknown, DeleteImageRequestBody>, res: Response) => {
  try {
    const { url, filename } = req.body;

    if (!url && !filename) {
      return res.status(StatusCode.BAD_REQUEST).json({
        success: false,
        message: "Please provide 'url' or 'filename' to delete.",
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
    const filePath = path.join(sharedUploadDir, safeFilename);

    try {
      await fs.access(filePath);
    } catch {
      return res.status(StatusCode.NOT_FOUND).json({
        success: false,
        message: "File not found",
      });
    }

    await fs.unlink(filePath);

    return sendSuccess(res, "File deleted successfully.");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete file";
    return sendError(res, message, error, StatusCode.INTERNAL_ERROR);
  }
};
