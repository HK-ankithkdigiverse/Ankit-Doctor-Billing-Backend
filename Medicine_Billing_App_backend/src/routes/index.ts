import { Router } from "express";
import {authRouter} from "./auth";
import {uploadRouter} from "./upload";
import {companyRouter} from "./company";
import {productRouter} from "./product";
import {billRouter} from "./bill";
import {userRouter} from "./user";
import {categoryRouter} from "./category";
import { medicalStoreRouter } from "./medicalStore";
import { dashboardRouter } from "./dashboard";

const router = Router();

router.use("/auth", authRouter);
router.use("/upload", uploadRouter);
router.use("/companies", companyRouter);
router.use("/products", productRouter);
router.use("/bills", billRouter);
router.use("/users", userRouter);
router.use("/categories", categoryRouter);
router.use("/medical-stores", medicalStoreRouter);
router.use("/dashboard", dashboardRouter);

export default router;
