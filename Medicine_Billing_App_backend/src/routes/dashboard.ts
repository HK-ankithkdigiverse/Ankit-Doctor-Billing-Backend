import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboard";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/", authMiddleware, getDashboardStats);

export const dashboardRouter = router;
