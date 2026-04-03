import express from "express";
import {
  getNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice,
  markNoticeAsRead,
  getNoticeStats,
  bulkUpdateNotices,
  upload,
} from "../controllers/noticeController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Add body parser for notice routes
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Middleware to dynamically handle upload or fallback
const uploadMiddleware = (req, res, next) => {
  if (upload) {
    upload.single("image")(req, res, next);
  } else {
    next();
  }
};

// Public routes (for viewing notices)
router.get("/", getNotices);
router.get("/stats", protect, getNoticeStats);
router.get("/:id", getNoticeById);

// Protected routes (admin only for create/update/delete)
router.post("/", protect, uploadMiddleware, createNotice);
router.put("/bulk", protect, bulkUpdateNotices);
router.put("/:id", protect, uploadMiddleware, updateNotice);
router.put("/:id/read", protect, markNoticeAsRead);
router.delete("/:id", protect, deleteNotice);

export default router;

