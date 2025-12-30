import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    imageUrl: {
      type: String,
      default: null, // URL to uploaded image
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    targetAudience: {
      type: [String],
      enum: ["all", "students", "teachers"],
      default: ["all"],
    },
  },
  { timestamps: true }
);

// Index for faster queries
noticeSchema.index({ isActive: 1, createdAt: -1 });

export default mongoose.models.Notice ||
  mongoose.model("Notice", noticeSchema);













