import { Request } from "express";

export type UploadedFilesRequest = Request & {
  files?: Express.Multer.File[];
};

export type DeleteImageRequestBody = {
  url?: string;
  filename?: string;
};
