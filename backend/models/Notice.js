import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    imageUrl: {
      type: String,
      default: null, // URL to uploaded image
    },
    category: {
      type: String,
      enum: ["academic", "administrative", "events", "holidays", "examinations", "sports", "general"],
      default: "general",
    },
    tags: [{
      type: String,
      trim: true,
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    targetAudience: {
      type: [String],
      enum: ["all", "students", "teachers", "parents"],
      default: ["all"],
    },
    expiresAt: {
      type: Date,
      default: null, // Optional expiration date
    },
    readBy: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    }],
    viewCount: {
      type: Number,
      default: 0,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for faster queries
noticeSchema.index({ isActive: 1, createdAt: -1 });
noticeSchema.index({ isActive: 1, isPinned: -1, createdAt: -1 });
noticeSchema.index({ expiresAt: 1 });
noticeSchema.index({ category: 1 });
noticeSchema.index({ "readBy.userId": 1 });

// Virtual for checking if notice is expired
noticeSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

// Method to mark as read by a user
noticeSchema.methods.markAsRead = function(userId) {
  const existingRead = this.readBy.find(read => read.userId.toString() === userId.toString());
  if (!existingRead) {
    this.readBy.push({ userId, readAt: new Date() });
    this.viewCount += 1;
  }
  return this.save();
};

export default mongoose.models.Notice ||
  mongoose.model("Notice", noticeSchema);













