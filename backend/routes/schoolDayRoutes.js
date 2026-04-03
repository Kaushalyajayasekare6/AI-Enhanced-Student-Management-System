import express from "express";
import {
  getSchoolDays,
  getSchoolDayByDate,
  upsertSchoolDay,
  bulkUpdateSchoolDays,
  autoGenerateSchoolCalendar,
  deleteSchoolDay,
} from "../controllers/schoolDayController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.get("/", protect, getSchoolDays);
router.get("/:date", protect, getSchoolDayByDate);
router.post("/", protect, upsertSchoolDay);
router.post("/bulk", protect, bulkUpdateSchoolDays);
router.post("/auto-generate", protect, autoGenerateSchoolCalendar);
router.delete("/:date", protect, deleteSchoolDay);

export default router;













