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
    const {
      role,
      category,
      priority,
      search,
      limit = 50,
      page = 1,
      includeExpired = false
    } = req.query;

    const query = { isActive: true };

    // Filter by target audience
    if (role) {
      query.$or = [
        { targetAudience: "all" },
        { targetAudience: role },
      ];
    }

    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }

    // Filter by priority
    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    // Search in title and description
    if (search) {
      query.$or = query.$or || [];
      query.$or.push(
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      );
    }

    // Filter expired notices unless explicitly requested
    if (!includeExpired) {
      query.$or = query.$or || [];
      query.$or.push(
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      );
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notices = await Notice.find(query)
      .populate("createdBy", "username firstName lastName")
      .sort({ isPinned: -1, priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notice.countDocuments(query);

    res.json({
      notices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
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
    const {
      title,
      description,
      category,
      tags,
      priority,
      targetAudience,
      expiresAt,
      isPinned,
      imageBase64
    } = req.body;

    // Handle image: either from multer file upload or base64
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/notices/${req.file.filename}`;
    } else if (imageBase64) {
      // Store base64 image directly (for simplicity, or save to file)
      imageUrl = imageBase64; // Can be data URL or saved file path
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    // Validate expiration date
    let parsedExpiresAt = null;
    if (expiresAt) {
      parsedExpiresAt = new Date(expiresAt);
      if (isNaN(parsedExpiresAt.getTime())) {
        return res.status(400).json({ message: "Invalid expiration date" });
      }
      if (parsedExpiresAt <= new Date()) {
        return res.status(400).json({ message: "Expiration date must be in the future" });
      }
    }

    const notice = await Notice.create({
      title: title.trim(),
      description: description ? description.trim() : "",
      imageUrl,
      category: category || "general",
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
      createdBy: req.user.id,
      priority: priority || "medium",
      targetAudience: targetAudience
        ? Array.isArray(targetAudience)
          ? targetAudience
          : [targetAudience]
        : ["all"],
      expiresAt: parsedExpiresAt,
      isPinned: isPinned || false,
    });

    const populatedNotice = await Notice.findById(notice._id)
      .populate("createdBy", "username firstName lastName");

    res.status(201).json({
      success: true,
      notice: populatedNotice,
      message: "Notice created successfully"
    });
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
    const {
      title,
      description,
      category,
      tags,
      priority,
      targetAudience,
      isActive,
      expiresAt,
      isPinned,
      imageBase64
    } = req.body;

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

    // Validate expiration date
    let parsedExpiresAt = undefined;
    if (expiresAt !== undefined) {
      if (expiresAt === null) {
        parsedExpiresAt = null;
      } else {
        parsedExpiresAt = new Date(expiresAt);
        if (isNaN(parsedExpiresAt.getTime())) {
          return res.status(400).json({ message: "Invalid expiration date" });
        }
        if (parsedExpiresAt <= new Date()) {
          return res.status(400).json({ message: "Expiration date must be in the future" });
        }
      }
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (category) updateData.category = category;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
    if (priority) updateData.priority = priority;
    if (targetAudience) {
      updateData.targetAudience = Array.isArray(targetAudience)
        ? targetAudience
        : [targetAudience];
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    if (parsedExpiresAt !== undefined) updateData.expiresAt = parsedExpiresAt;
    if (isPinned !== undefined) updateData.isPinned = isPinned;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    const notice = await Notice.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("createdBy", "username firstName lastName");

    if (!notice) {
      return res.status(404).json({ message: "Notice not found" });
    }

    res.json({
      success: true,
      notice,
      message: "Notice updated successfully"
    });
  } catch (error) {
    console.error("❌ Error updating notice:", error.message);
    res.status(400).json({ message: error.message });
  }
};

/**
 * Mark notice as read by user
 */
export const markNoticeAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({ message: "Notice not found" });
    }

    await notice.markAsRead(userId);

    res.json({
      success: true,
      message: "Notice marked as read"
    });
  } catch (error) {
    console.error("❌ Error marking notice as read:", error.message);
    res.status(500).json({ message: "Failed to mark notice as read" });
  }
};

/**
 * Get notice statistics
 */
export const getNoticeStats = async (req, res) => {
  try {
    const totalNotices = await Notice.countDocuments();
    const activeNotices = await Notice.countDocuments({ isActive: true });
    const pinnedNotices = await Notice.countDocuments({ isPinned: true, isActive: true });
    const expiredNotices = await Notice.countDocuments({
      expiresAt: { $lt: new Date() },
      isActive: true
    });

    const categoryStats = await Notice.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    const priorityStats = await Notice.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$priority", count: { $sum: 1 } } }
    ]);

    res.json({
      total: totalNotices,
      active: activeNotices,
      pinned: pinnedNotices,
      expired: expiredNotices,
      categories: categoryStats,
      priorities: priorityStats
    });
  } catch (error) {
    console.error("❌ Error fetching notice stats:", error.message);
    res.status(500).json({ message: "Failed to fetch notice statistics" });
  }
};

export const deleteNotice = async (req, res) => {
  try {
    const noticeId = req.params.id;
    const userId = req.user.id;

    // Find the notice
    const notice = await Notice.findById(noticeId).populate('createdBy', 'role');
    
    if (!notice) {
      return res.status(404).json({ message: "Notice not found" });
    }

    // Authorization: creator or admin
    if (notice.createdBy._id.toString() !== userId && notice.createdBy.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized to delete this notice" });
    }

    // Delete associated image file if exists (file-based, not base64)
    if (notice.imageUrl && !notice.imageUrl.startsWith('data:') && notice.imageUrl.startsWith('/uploads/')) {
      const imagePath = path.join(process.cwd(), notice.imageUrl.replace('/uploads/', 'backend/uploads/'));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete the notice
    await Notice.findByIdAndDelete(noticeId);

    res.json({
      success: true,
      message: "Notice deleted successfully"
    });
  } catch (error) {
    console.error("❌ Error deleting notice:", error.message);
    res.status(500).json({ message: "Failed to delete notice" });
  }
};

/**
 * Bulk update notices
 */
export const bulkUpdateNotices = async (req, res) => {
  try {
    const { noticeIds, updates } = req.body;

    if (!noticeIds || !Array.isArray(noticeIds) || noticeIds.length === 0) {
      return res.status(400).json({ message: "Notice IDs are required" });
    }

    const result = await Notice.updateMany(
      { _id: { $in: noticeIds } },
      updates,
      { runValidators: true }
    );

    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} notices`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("❌ Error bulk updating notices:", error.message);
    res.status(400).json({ message: error.message });
  }
};

