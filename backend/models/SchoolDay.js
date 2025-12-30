import mongoose from "mongoose";

const schoolDaySchema = new mongoose.Schema(
  {
    date: {
      type: String, // YYYY-MM-DD format
      required: true,
      unique: true,
    },
    isSchoolDay: {
      type: Boolean,
      required: true,
      default: true,
    },
    description: {
      type: String,
      default: "", // Optional: e.g., "Holiday", "Exam Day", etc.
    },
  },
  { timestamps: true }
);

// Index for faster queries
schoolDaySchema.index({ date: 1 });

export default mongoose.models.SchoolDay ||
  mongoose.model("SchoolDay", schoolDaySchema);













