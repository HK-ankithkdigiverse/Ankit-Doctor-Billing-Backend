import { Router } from "express";
import {
  uploadImages,
  getImages,
  deleteImage,
} from "../controllers/upload/index";
import { upload } from "../middleware/upload";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware)


router.post("/upload", upload.array("files", 10), uploadImages);


router.get("/", getImages);


router.delete("/", deleteImage);

export default router;
