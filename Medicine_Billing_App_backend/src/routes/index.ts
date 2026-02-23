import { Router } from "express";
import authRoutes from "./auth";
import uploadRoute from "./upload";
import companyRoutes from "./company";
import productRoutes from "./products";
import billRoutes from "./bill";
import userRoutes from "./user";
import categoryRoutes from "./category";

const router = Router();

router.use("/auth", authRoutes);
router.use("/upload", uploadRoute);
router.use("/companies", companyRoutes);
router.use("/products", productRoutes);
router.use("/bills", billRoutes);
router.use("/users", userRoutes);
router.use("/categories", categoryRoutes);

export default router;
