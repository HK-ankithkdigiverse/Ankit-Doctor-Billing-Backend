import { Router } from "express";
import {
  uploadImages,
  getImages,
  deleteImage,
} from "../controllers/upload/index";
import { handleUploadError, upload } from "../middleware/upload";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.post("/", authMiddleware, upload.array("files"), handleUploadError, uploadImages);


router.get("/", authMiddleware, getImages);


router.delete("/", authMiddleware, deleteImage);

export const uploadRouter = router;
