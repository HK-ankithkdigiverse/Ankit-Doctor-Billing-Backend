import { StatusCode } from "../../common";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { getFilesValidator } from "../../validation";

// ================= UPLOAD IMAGES =================
export const uploadImages = async (req, res) => {
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
  } catch (error: any) {
    return res.status(StatusCode.INTERNAL_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= GET IMAGES =================
export const getImages = async (req, res) => {
  try {
    const { error, value } = getFilesValidator.validate(req.query);
    if (error) {
      return res.status(StatusCode.BAD_REQUEST).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { page = 1, limit = 10, type } = value;
    const directoryPath = path.join(process.cwd(), "uploads");

    let files = await fs.readdir(directoryPath);

    // Filter by file type
    if (type === "image") {
      files = files.filter(
        (file) =>
          file.endsWith(".jpg") ||
          file.endsWith(".jpeg") ||
          file.endsWith(".png")
      );
    }

    if (type === "pdf") {
      files = files.filter((file) => file.endsWith(".pdf"));
    }

    // Keep only actual files
    const fileNames = files.filter((file) =>
      existsSync(path.join(directoryPath, file))
    );

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
  } catch (error: any) {
    return res.status(StatusCode.INTERNAL_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= DELETE IMAGE =================
export const deleteImage = async (req, res) => {
  try {
    const { url, filename } = req.body;

    if (!url && !filename) {
      return res.status(StatusCode.BAD_REQUEST).json({
        success: false,
        message: "Provide 'url' or 'filename' to delete",
      });
    }

    const fileToDelete = filename
      ? filename
      : url.split("/").pop();

    const safeFilename = path.basename(fileToDelete);
    const filePath = path.join(process.cwd(), "uploads", safeFilename);

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
  } catch (error: any) {
    return res.status(StatusCode.INTERNAL_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
