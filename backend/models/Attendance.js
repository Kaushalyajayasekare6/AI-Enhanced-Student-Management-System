import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    status: {
      type: String,
      enum: ["P", "A", "L"], // Present, Absent, Late
      required: true,
    },
  },
  { timestamps: true }
);

// prevent duplicate entries (same student + date)
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance ||
  mongoose.model("Attendance", attendanceSchema);
