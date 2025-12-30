import Notice from "../models/Notice.js";
import path from "path";
import fs from "fs";

// Configure multer for file uploads (optional - will use base64 if multer not available)
export let upload = null;
let multer = null;

(async () => {
  try {
    multer = (await import("multer")).default;
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = "uploads/notices";
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, "notice-" + uniqueSuffix + path.extname(file.originalname));
    },
  });

  upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(
        path.extname(file.originalname).toLowerCase()
      );
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error("Only image files are allowed!"));
      }
    },
  });
  } catch (error) {
    console.log("⚠️ Multer not available, using base64 image support");
    upload = null;
  }
})();

/**
 * Get all active notices
 */
export const getNotices = async (req, res) => {
  try {
    const { role } = req.query; // Optional: filter by role

    const query = { isActive: true };

    // Filter by target audience
    if (role) {
      query.$or = [
        { targetAudience: "all" },
        { targetAudience: role },
      ];
    }

    const notices = await Notice.find(query)
      .populate("createdBy", "username")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notices);
  } catch (error) {
    console.error("❌ Error fetching notices:", error.message);
    res.status(500).json({ message: "Failed to fetch notices" });
  }
};

/**
 * Get a single notice by ID
 */
export const getNoticeById = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id).populate(
      "createdBy",
      "username"
    );

    if (!notice) {
      return res.status(404).json({ message: "Notice not found" });
    }

    res.json(notice);
  } catch (error) {
    console.error("❌ Error fetching notice:", error.message);
    res.status(500).json({ message: "Failed to fetch notice" });
  }
};

/**
 * Create a new notice
 */
export const createNotice = async (req, res) => {
  try {
    const { title, description, priority, targetAudience, imageBase64 } = req.body;
    
    // Handle image: either from multer file upload or base64
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/notices/${req.file.filename}`;
    } else if (imageBase64) {
      // Store base64 image directly (for simplicity, or save to file)
      imageUrl = imageBase64; // Can be data URL or saved file path
    }

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const notice = await Notice.create({
      title,
      description: description || "",
      imageUrl,
      createdBy: req.user.id,
      priority: priority || "medium",
      targetAudience: targetAudience
        ? Array.isArray(targetAudience)
          ? targetAudience
          : [targetAudience]
        : ["all"],
    });

    const populatedNotice = await Notice.findById(notice._id).populate(
      "createdBy",
      "username"
    );

    res.status(201).json(populatedNotice);
  } catch (error) {
    console.error("❌ Error creating notice:", error.message);
    res.status(400).json({ message: error.message });
  }
};

/**
 * Update a notice
 */
export const updateNotice = async (req, res) => {
  try {
    const { title, description, priority, targetAudience, isActive, imageBase64 } = req.body;
    let imageUrl = undefined;

    // If new image is uploaded, update imageUrl
    if (req.file) {
      imageUrl = `/uploads/notices/${req.file.filename}`;
      
      // Delete old image if exists
      const oldNotice = await Notice.findById(req.params.id);
      if (oldNotice?.imageUrl && !oldNotice.imageUrl.startsWith("data:")) {
        const oldImagePath = oldNotice.imageUrl.replace("/uploads/", "uploads/");
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    } else if (imageBase64) {
      imageUrl = imageBase64;
      
      // Delete old image if it was a file
      const oldNotice = await Notice.findById(req.params.id);
      if (oldNotice?.imageUrl && !oldNotice.imageUrl.startsWith("data:")) {
        const oldImagePath = oldNotice.imageUrl.replace("/uploads/", "uploads/");
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority) updateData.priority = priority;
    if (targetAudience) {
      updateData.targetAudience = Array.isArray(targetAudience)
        ? targetAudience
        : [targetAudience];
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    const notice = await Notice.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate("createdBy", "username");

    if (!notice) {
      return res.status(404).json({ message: "Notice not found" });
    }

    res.json(notice);
  } catch (error) {
    console.error("❌ Error updating notice:", error.message);
    res.status(400).json({ message: error.message });
  }
};

/**
 * Delete a notice
 */
export const deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({ message: "Notice not found" });
    }

    // Delete associated image if exists
    if (notice.imageUrl) {
      const imagePath = notice.imageUrl.replace("/uploads/", "uploads/");
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Notice.findByIdAndDelete(req.params.id);

    res.json({ message: "Notice deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting notice:", error.message);
    res.status(500).json({ message: "Failed to delete notice" });
  }
};

